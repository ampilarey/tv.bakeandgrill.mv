# Mobile Video Loading Bug — Audio Plays But Video Stuck on Loading Spinner

> Cursor Prompt: Fix the bug where on mobile (Android/iOS), some HLS channels play audio fine but video stays on the loading spinner forever. The same channels work perfectly on desktop (Windows/Mac).

---

## The Problem

On mobile devices, certain IPTV channels show:
- Audio plays normally (you can hear the stream)
- Video area shows "Loading stream..." spinner forever
- The `videoLoading` state is never set to `false` even though audio is playing

The same channels work fine (both audio and video) on desktop browsers.

---

## Root Cause Analysis

After a thorough code review of `client/src/pages/PlayerPage.jsx` (2,710 lines), I've identified **7 distinct bugs** that combine to cause this issue:

---

### Root Cause 1: `videoLoading` overlay blocks the video even when the stream IS playing

**File:** `client/src/pages/PlayerPage.jsx` — lines 2117-2124

**Problem:** The loading overlay is rendered as an opaque `bg-black/80 z-10` div on top of the video:

```jsx
{videoLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
    <div className="text-center">
      <Spinner size="xl" />
      <p className="text-tv-text mt-4 text-sm">Loading stream...</p>
    </div>
  </div>
)}
```

The video IS playing underneath (audio works), but the overlay hides it because `videoLoading` was never set to `false`. The problem is that the `playing` event handler that should clear `videoLoading` is one of MULTIPLE competing handlers — and on mobile, the wrong one fires first.

**Fix:** The loading overlay should check BOTH `videoLoading` AND the actual video state. If the video element has `readyState >= 3` (HAVE_FUTURE_DATA) or `!video.paused`, force-hide the spinner regardless of state:

```jsx
{videoLoading && !(videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
    ...
  </div>
)}
```

Or better, add a periodic check that catches this mismatch:

```jsx
// Add this useEffect after the video player setup effect:
useEffect(() => {
  if (!videoLoading || !videoRef.current) return;

  // Safety valve: if video is actually playing but loading state is stuck, clear it
  const checkInterval = setInterval(() => {
    const video = videoRef.current;
    if (video && !video.paused && video.readyState >= 2 && video.currentTime > 0) {
      console.warn('Safety valve: video is playing but videoLoading was stuck - clearing');
      setVideoLoading(false);
    }
  }, 1000);

  return () => clearInterval(checkInterval);
}, [videoLoading]);
```

---

### Root Cause 2: HLS.js `FRAG_LOADED` handler clears loading too early, then `waiting` re-enables it

**File:** `client/src/pages/PlayerPage.jsx` — lines 1171-1174 and 844-854

**Problem:** There's a race condition in the HLS.js path:

1. `FRAG_LOADED` fires → sets `videoLoading = false` (line 1173)
2. Mobile browser starts decoding the fragment
3. Decoding takes longer on mobile → `waiting` event fires (line 844)
4. `waiting` handler starts a 3-second timer → sets `videoLoading = true` (line 851)
5. The `playing` event fires DURING the 3-second debounce window
6. BUT `playing` sets `videoLoading = false` (line 865)
7. THEN the 3-second timer fires → sets `videoLoading = true` AGAIN (line 851)
8. No more events fire → spinner stuck forever

The sequence is: `FRAG_LOADED(false)` → `waiting(timer starts)` → `playing(false)` → **timer fires(true)** → stuck!

**Fix:** The `playing` handler at line 856 does clear the timer:
```js
const handlePlaying = () => {
  hasStartedPlaying = true;
  clearPlaybackTimeout();
  if (bufferingTimerRef.current) {
    clearTimeout(bufferingTimerRef.current);
    bufferingTimerRef.current = null;
  }
  setVideoLoading(false);
};
```

BUT this only prevents the issue IF `playing` fires AFTER `waiting`. On mobile, the sequence can be:
- `waiting` → timer starts (3s)
- Video decodes in background → audio starts flowing
- Browser fires `playing` → clears timer, sets loading false
- Browser needs more data → fires `waiting` AGAIN → new timer starts
- Audio continues playing fine (buffered enough)
- Timer fires → `videoLoading = true`
- No more `playing` event because video never paused

The fix: The `waiting` event should NOT trigger the loading spinner if the video is already playing audio. Check `video.currentTime` is advancing:

```js
const handleWaiting = () => {
  // Don't show spinner if audio/video is actually progressing
  const video = videoRef.current;
  if (video && video.currentTime > 0 && !video.paused) {
    // Stream is progressing — this is just a brief buffer gap
    // Only show spinner if we stay stalled for longer
    if (!bufferingTimerRef.current) {
      const timeAtWait = video.currentTime;
      bufferingTimerRef.current = setTimeout(() => {
        // Only show spinner if currentTime hasn't advanced
        if (video.currentTime === timeAtWait) {
          setVideoLoading(true);
        }
        bufferingTimerRef.current = null;
      }, 5000); // Longer timeout on mobile
    }
    return;
  }

  // Initial load — use shorter timeout
  if (!bufferingTimerRef.current) {
    bufferingTimerRef.current = setTimeout(() => {
      setVideoLoading(true);
    }, 3000);
  }
};
```

---

### Root Cause 3: On Android, HLS.js picks a video level the GPU can't decode in real-time

**File:** `client/src/pages/PlayerPage.jsx` — lines 1020-1049

**Problem:** The HLS.js configuration has `capLevelToPlayerSize: false` (line 1038). This means HLS.js may select a 1080p or 4K level even though the mobile phone's GPU can't decode it fast enough. The result:

- Audio decodes fine (low CPU)
- Video decoder falls behind → frames stall → `waiting` fires
- Audio keeps buffering and playing → you hear sound
- Video decoder never catches up → spinner stays

Desktop GPUs handle the same high bitrate just fine.

Also: `abrEwmaDefaultEstimate: isMobile ? 2000000 : 500000` (line 1040) **counterintuitively gives mobile a HIGHER default bandwidth estimate** (2 Mbps vs 500 Kbps). This makes HLS.js start with a HIGHER quality level on mobile, which is backwards.

**Fix:**

```js
const hls = new Hls({
  enableWorker: !isMobile,
  lowLatencyMode: false,
  maxBufferLength: isMobile ? 15 : 30,
  maxMaxBufferLength: isMobile ? 200 : 600,
  maxBufferSize: isMobile ? 20 * 1000 * 1000 : 60 * 1000 * 1000,
  maxBufferHole: 0.5,
  backBufferLength: isMobile ? 30 : 90,
  forceKeyFrameOnDiscontinuity: true,
  startFragPrefetch: true,
  testBandwidth: true, // ← ENABLE bandwidth testing (was false — disabled ABR)
  autoStartLoad: true,
  startPosition: -1,
  debug: false,

  // FIX 1: Cap to player size — prevents selecting levels the GPU can't handle
  capLevelToPlayerSize: true, // ← WAS false — this is the main culprit

  // FIX 2: Set reasonable starting quality for mobile
  abrEwmaDefaultEstimate: isMobile ? 500000 : 1000000, // ← 500Kbps start on mobile (was 2Mbps!)
  startLevel: isMobile ? 0 : -1, // ← Start at LOWEST level on mobile, auto on desktop

  abrBandWidthFactor: 0.95,
  abrBandWidthUpFactor: 0.7,
  fragLoadingTimeOut: isMobile ? 15000 : 20000,
  manifestLoadingTimeOut: isMobile ? 15000 : 20000,
  maxLoadingDelay: isMobile ? 2 : 4,
  maxStarvationDelay: isMobile ? 4 : 8
});
```

---

### Root Cause 4: H.265/HEVC streams are detected but NOT blocked on mobile

**File:** `client/src/pages/PlayerPage.jsx` — lines 1096-1103

**Problem:** The code detects H.265/HEVC codecs at line 1099 but only logs a warning:

```js
if (level.videoCodec && (level.videoCodec.toLowerCase().includes('hev') ||
    level.videoCodec.toLowerCase().includes('h265'))) {
  console.warn('⚠️ H.265/HEVC codec detected - may not work on all devices');
  // Don't set error immediately - let it try to play first
}
```

Most mobile browsers (especially Android Chrome) **do NOT support H.265 in HLS.js** (MSE doesn't support HEVC on most Android devices). The audio codec (AAC) decodes fine, but the video codec fails silently. HLS.js doesn't emit a fatal error — it just can't render the video frames.

**Fix:** When HEVC is detected on mobile, force HLS.js to use only H.264-compatible levels:

```js
hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
  if (isMobile && data.levels) {
    // Find H.264-only levels
    const h264Levels = data.levels
      .map((level, i) => ({ level, index: i }))
      .filter(({ level }) => {
        const codec = (level.videoCodec || '').toLowerCase();
        // Keep if no codec info (assume H.264) or explicitly H.264/AVC
        return !codec || codec.includes('avc') || codec.includes('h264') ||
               (!codec.includes('hev') && !codec.includes('h265') && !codec.includes('av01'));
      });

    if (h264Levels.length > 0 && h264Levels.length < data.levels.length) {
      console.warn(`📱 Mobile: Restricting to ${h264Levels.length} H.264 levels (filtered out HEVC/AV1)`);
      // Remove HEVC levels so HLS.js never selects them
      hls.removeLevel(
        ...data.levels
          .map((_, i) => i)
          .filter(i => !h264Levels.find(h => h.index === i))
          .reverse() // Remove from end to avoid index shifts
      );
    } else if (h264Levels.length === 0) {
      // ALL levels are HEVC — show clear error instead of black screen with audio
      setVideoError(
        'This channel uses H.265 (HEVC) video which is not supported on your mobile browser. ' +
        'Please watch this channel on a desktop browser or try a different channel.'
      );
      setVideoLoading(false);
      return; // Don't attempt playback
    }
  }

  // ... rest of MANIFEST_PARSED handler
});
```

---

### Root Cause 5: The `video` element has `key={currentChannel?.id}` causing unmount/remount

**File:** `client/src/pages/PlayerPage.jsx` — line 2260

**Problem:**

```jsx
<video
  ref={videoRef}
  key={currentChannel?.id || 'no-channel'}
  ...
/>
```

The `key` prop causes React to **destroy and recreate** the video element every time the channel changes. When the video element is destroyed:
1. The HLS.js instance still holds a reference to the OLD video element
2. `hls.attachMedia(video)` was called with the OLD element
3. The NEW element gets created by React
4. `videoRef` now points to the NEW element
5. But HLS.js is piping data to the OLD (now removed) element
6. Audio may still work through the MSE buffer, but video frames have nowhere to render

On desktop this seems to work by accident because the re-creation is fast enough. On mobile, the timing is different and the race is exposed.

**Fix:** Remove the `key` prop from the video element entirely. Channel switching should be handled by changing the HLS source, not by destroying/recreating the DOM element:

```jsx
<video
  ref={videoRef}
  // REMOVED: key={currentChannel?.id || 'no-channel'}
  className="w-full h-full object-contain bg-black rounded-xl"
  controls={true}
  autoPlay
  playsInline
  webkit-playsinline="true"
  x-webkit-airplay="allow"
  preload="auto"
  muted={false}
  src={videoElementSrc ?? undefined}
  ...
/>
```

The `useEffect` at line 343 already handles channel changes properly by destroying the old HLS instance and creating a new one. The `key` prop is not only unnecessary — it's actively harmful.

---

### Root Cause 6: `videoElementSrc` is set for iOS but HLS.js path ALSO sets `video.src`

**File:** `client/src/pages/PlayerPage.jsx` — lines 117-120 and 2259

**Problem:**

```js
// Line 117-120:
const currentChannelIsHLS = ...;
const videoElementSrc = currentChannel && (!currentChannelIsHLS || isIOS) ? currentChannel.url : undefined;

// Line 2259 (JSX):
src={videoElementSrc ?? undefined}
```

For HLS streams on non-iOS:
- `videoElementSrc` = `undefined` (correct — HLS.js manages the source via MSE)
- `src` attribute on `<video>` = not set

For non-HLS (MP4) or iOS:
- `videoElementSrc` = the URL
- `src` attribute on `<video>` = the URL

BUT when React re-renders (any state change), it re-applies `src={videoElementSrc}` to the video element. If `videoElementSrc` is `undefined`, React removes the `src` attribute. On some mobile browsers, removing the `src` attribute from a video element that HLS.js is managing via MSE causes the video pipeline to reset, while the audio continues from the buffer.

**Fix:** Never set `src` on the video element in the JSX when HLS.js is managing it. Use a ref-based approach instead:

```jsx
<video
  ref={videoRef}
  className="w-full h-full object-contain bg-black rounded-xl"
  controls={true}
  autoPlay
  playsInline
  webkit-playsinline="true"
  x-webkit-airplay="allow"
  preload="auto"
  muted={false}
  // REMOVED: src={videoElementSrc ?? undefined}
  // Source is managed entirely by the useEffect (HLS.js sets it via MSE, iOS/MP4 sets it via video.src)
  ...
/>
```

Then in the iOS/native path of the useEffect, set `video.src = currentChannel.url` imperatively (which it already does). This prevents React from fighting with HLS.js over the `src` attribute on re-renders.

---

### Root Cause 7: iOS triple-`load()` call causes race condition on mobile Safari

**File:** `client/src/pages/PlayerPage.jsx` — lines 477-494

**Problem:**

```js
// Clear previous source first
video.src = '';
video.load();        // ← Load #1

// ... set attributes ...

video.removeAttribute('src');
video.load();        // ← Load #2
video.src = currentChannel.url;
video.load();        // ← Load #3
```

Three `video.load()` calls in rapid succession. Each `load()` aborts the current load and starts fresh. On iOS, this creates a race condition where:
1. Load #1 fires → browser starts resetting
2. Load #2 fires before #1 completes → browser restarts reset
3. `src` is set → Load #3 fires → browser starts loading the actual URL
4. But the internal state machine is confused from the rapid resets
5. Audio pipeline recovers (simpler) → audio plays
6. Video pipeline doesn't recover → stuck on loading

**Fix:** One clean reset, one load:

```js
// Stop any current playback
video.pause();
video.removeAttribute('src');
video.load(); // Single clean reset

// Set attributes
video.controls = true;
video.playsInline = true;
video.setAttribute('playsinline', 'true');
video.setAttribute('webkit-playsinline', 'true');
video.preload = 'auto';

// Set source and let it load naturally
video.src = currentChannel.url;
// Do NOT call video.load() again — setting src triggers load automatically
```

---

## Implementation Order (Priority)

### Phase 1: Immediate Fixes (These alone should fix 90% of cases)

1. **Remove `key` prop from video element** (Root Cause 5)
   - File: `PlayerPage.jsx` line 2260
   - Risk: Low
   - Impact: High — prevents video element destruction on channel change

2. **Enable `capLevelToPlayerSize: true`** (Root Cause 3)
   - File: `PlayerPage.jsx` line 1038
   - Risk: Low
   - Impact: High — prevents mobile selecting undecodable quality levels

3. **Fix `abrEwmaDefaultEstimate` for mobile** (Root Cause 3)
   - File: `PlayerPage.jsx` line 1040
   - Change from `2000000` to `500000` for mobile
   - Risk: Low
   - Impact: Medium — starts mobile at a lower, safer quality

4. **Fix triple `load()` on iOS** (Root Cause 7)
   - File: `PlayerPage.jsx` lines 477-494
   - Risk: Low
   - Impact: Medium — fixes iOS-specific load race condition

### Phase 2: Robust Fixes

5. **Add safety valve for stuck `videoLoading`** (Root Cause 1)
   - Add periodic check that clears loading if video is actually playing
   - Risk: Low
   - Impact: High — catches ALL edge cases where loading gets stuck

6. **Fix `waiting` event handler race condition** (Root Cause 2)
   - Check `video.currentTime` advancing before showing spinner
   - Risk: Medium
   - Impact: High — prevents spinner re-appearing during normal HLS segment loads

7. **Remove `src` from video JSX** (Root Cause 6)
   - Manage video source entirely via imperative code in useEffect
   - Risk: Medium (need to verify all playback paths still set src)
   - Impact: Medium — prevents React re-renders from interfering with MSE

### Phase 3: Codec Handling

8. **Filter out HEVC levels on mobile** (Root Cause 4)
   - Add HEVC detection and level filtering in MANIFEST_PARSED handler
   - Risk: Medium
   - Impact: High for affected channels — gives clear error instead of black screen

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/PlayerPage.jsx` line 1038 | `capLevelToPlayerSize: true` |
| `client/src/pages/PlayerPage.jsx` line 1040 | `abrEwmaDefaultEstimate: isMobile ? 500000 : 1000000` |
| `client/src/pages/PlayerPage.jsx` line 1032 | `testBandwidth: true` |
| `client/src/pages/PlayerPage.jsx` after 1020 | Add `startLevel: isMobile ? 0 : -1` |
| `client/src/pages/PlayerPage.jsx` line 2260 | Remove `key={currentChannel?.id \|\| 'no-channel'}` |
| `client/src/pages/PlayerPage.jsx` line 2259 | Remove `src={videoElementSrc ?? undefined}` |
| `client/src/pages/PlayerPage.jsx` lines 477-494 | Simplify to single load() call |
| `client/src/pages/PlayerPage.jsx` lines 844-854 | Fix waiting handler to check currentTime |
| `client/src/pages/PlayerPage.jsx` after line 1402 | Add safety valve useEffect |
| `client/src/pages/PlayerPage.jsx` lines 1068-1146 | Add HEVC level filtering in MANIFEST_PARSED |

---

## Testing Checklist

After applying fixes, test these scenarios:

- [ ] **Android Chrome** — HLS channel that was previously stuck → should now show video
- [ ] **iOS Safari** — HLS channel → should play natively without spinner
- [ ] **Android Chrome** — Channel switch (rapid clicking) → no orphaned spinners
- [ ] **Desktop Chrome** — Verify no regressions on desktop playback
- [ ] **Desktop Safari** — Verify native HLS still works
- [ ] **HEVC channel on Android** — Should show clear error OR fall back to H.264 level
- [ ] **HEVC channel on Desktop** — Should play normally (if browser supports HEVC)
- [ ] **Slow network on mobile** — Spinner should appear only when truly stalled, not during normal segment loads
- [ ] **Channel with only 1080p levels on low-end phone** — Should cap to player size and play smoothly

---

## Quick Verification

To confirm this is the issue, open DevTools on the mobile browser (or use remote debugging) and run:

```js
// Check if video is actually playing despite spinner showing:
const v = document.querySelector('video');
console.log({
  paused: v.paused,
  currentTime: v.currentTime,
  readyState: v.readyState,
  videoWidth: v.videoWidth,
  videoHeight: v.videoHeight,
  networkState: v.networkState,
  buffered: v.buffered.length > 0 ? v.buffered.end(0) : 0
});
```

If `paused: false` and `currentTime > 0` but `videoWidth: 0` → Root Cause 3/4 (codec/quality issue)
If `paused: false` and `currentTime > 0` and `videoWidth > 0` → Root Cause 1/2 (stuck loading state)
If `paused: true` and `readyState: 0` → Root Cause 5/7 (video element destroyed or load race)
