# Bake & Grill TV - Full Bug Fix & Modernization Prompt

> Use this prompt in Cursor to fix all identified bugs, crash causes, and modernize the codebase.

---

## Context

You are working on **Bake & Grill TV** — a full-stack React + Express IPTV streaming & digital signage platform for cafes/restaurants. The stack is:

- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3.4 + HLS.js 1.4
- **Backend:** Express 4.18 + MySQL 8 (mysql2) + JWT auth
- **Features:** Live TV (HLS), kiosk mode, media playlists, overlays, PWA

The main player page (`client/src/pages/PlayerPage.jsx`) is **2,710 lines** and is the #1 source of crashes. The kiosk display page (`client/src/pages/KioskModePage.jsx`) is the second critical player.

---

## PART 1: CRITICAL BUGS (Player Crashes)

### Bug 1: PlayerPage.jsx is a 2,710-line monolith — memory leaks and crash-prone

**Files:** `client/src/pages/PlayerPage.jsx`

**Problem:** PlayerPage.jsx is a single 2,710-line component with 20+ `useState` hooks, 10+ `useRef` hooks, dozens of `useEffect` hooks, and deeply nested inline event handlers. This causes:
- Memory leaks from closures capturing stale state (e.g., `retryCount` used inside HLS error handler captures the initial value, not the current one)
- Duplicate `tryPlayWithFallback` function defined separately in both the iOS and HLS.js code paths (lines ~513 and ~979), violating DRY
- The `storedHandlers` pattern (line 401-408) is a code smell — manually tracking event listeners via a mutable object instead of proper cleanup
- Massive re-renders when any of the 20+ state variables change

**Fix:**
1. Extract the HLS player logic into a custom hook: `useHlsPlayer({ videoRef, channel, isIOS, onError, onPlaying })`
2. Extract the iOS native player logic into: `useNativePlayer({ videoRef, channel, onError, onPlaying })`
3. Extract channel list/filtering into: `useChannelList({ playlistId })`
4. Extract favorites logic into: `useFavorites({ playlistId })`
5. Extract watch history logic into: `useWatchHistory({ playlistId, channels })`
6. Extract keyboard shortcuts into: `usePlayerKeyboardShortcuts({ ... })`
7. Move the channel sidebar into its own component: `ChannelSidebar.jsx`
8. Move the video container + controls into: `PlayerVideoArea.jsx`
9. The single `tryPlayWithFallback` function should be extracted to a shared utility: `client/src/utils/playbackHelpers.js`

### Bug 2: HLS.js error handler uses stale `retryCount` from closure

**Files:** `client/src/pages/PlayerPage.jsx` (lines ~1194-1235)

**Problem:** The HLS error handler references `retryCount` from React state, but it captures the value at the time the effect runs. When HLS errors fire rapidly, the retry logic uses stale values, potentially retrying forever or not retrying at all:
```js
if (retryCount < 3) {
  setRetryCount(prev => prev + 1); // This updates state...
  // ...but retryCount in this closure is still the old value
}
```

**Fix:** Use a `useRef` for retry tracking inside the effect, not `useState`. The ref value is always current:
```js
const retryCountRef = useRef(0);
// Inside effect:
if (retryCountRef.current < 3) {
  retryCountRef.current += 1;
  // retry logic...
}
```

### Bug 3: Multiple event listeners registered on same video element without cleanup guard

**Files:** `client/src/pages/PlayerPage.jsx` (lines ~724-944)

**Problem:** In the iOS path, both iOS-specific handlers AND general handlers (`handleLoadStart`, `handleError`, `handleCanPlay`, etc.) are added to the same video element. Some events like `canplay`, `loadedmetadata`, and `playing` get TWO listeners — the iOS handler and the general handler. This can cause:
- Double state updates (e.g., `setVideoLoading(false)` called twice)
- Race conditions between the two handlers
- The iOS `canplay` handler tries to play while the general `handleCanPlay` also tries to play — double `video.play()` calls

**Fix:** Use a single unified set of event handlers. Branch the behavior inside the handler based on `isIOS`, not by registering separate handler sets.

### Bug 4: KioskModePage never cleans up reboot interval timer

**Files:** `client/src/pages/KioskModePage.jsx` (lines ~224-234)

**Problem:** The `rebootTimerRef` interval is created inside `verifyDisplay()` but only cleared when `verifyDisplay()` is called again. If the component unmounts without re-verifying, the interval leaks:
```js
rebootTimerRef.current = setInterval(() => {
  // checks time and reloads
}, 60_000);
```
There is no cleanup in the component's unmount effect.

**Fix:** Add cleanup for `rebootTimerRef` in a dedicated `useEffect`:
```js
useEffect(() => {
  return () => {
    clearInterval(rebootTimerRef.current);
    clearTimeout(failoverTimerRef.current);
  };
}, []);
```

### Bug 5: KioskModePage command polling can fire `verifyDisplay()` in a loop

**Files:** `client/src/pages/KioskModePage.jsx` (lines ~282-388)

**Problem:** When an override with `m3u_url` is detected (line 298-299), the polling handler calls `verifyDisplay()`. But `verifyDisplay` is in the dependency array of the polling effect (line 388). This creates a potential loop:
1. Poll detects override → calls `verifyDisplay()`
2. `verifyDisplay` updates state → re-creates `verifyDisplay` callback
3. Polling effect re-runs due to dependency change → new poll immediately fires
4. If override still active → goes back to step 1

**Fix:** Use a ref to track whether an override refresh is already in progress, and debounce the `verifyDisplay` call. Or better: fetch override channels separately without going through `verifyDisplay`.

### Bug 6: SlideshowPlayer `next()` callback has stale `items.length` in closure

**Files:** `client/src/components/SlideshowPlayer.jsx` (lines ~84-93)

**Problem:** The `next` callback depends on `items.length`, but when used inside `setTimeout` (line 88-92), the closure may capture a stale value if items are reloaded:
```js
const next = useCallback(() => {
  setIdx(i => (i + 1) % Math.max(items.length, 1)); // items.length could be stale
}, [items.length]);
```

**Fix:** Use a ref for items length or access items via a ref:
```js
const itemsRef = useRef(items);
useEffect(() => { itemsRef.current = items; }, [items]);
const next = useCallback(() => {
  setIdx(i => (i + 1) % Math.max(itemsRef.current.length, 1));
}, []);
```

### Bug 7: YouTube IFrame API `onYouTubeIframeAPIReady` global collision

**Files:** `client/src/components/YouTubeEmbed.jsx` (lines ~71-82)

**Problem:** The component sets `window.onYouTubeIframeAPIReady` directly (line 77). If multiple YouTubeEmbed components mount, only the last one's callback fires. Previous components never get `isReady = true` and remain stuck on the loading spinner forever.

**Fix:** Use an event-based approach or a shared singleton:
```js
// Shared promise pattern
let ytReadyPromise = null;
function loadYouTubeAPI() {
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise(resolve => {
    if (window.YT?.Player) return resolve();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = resolve;
  });
  return ytReadyPromise;
}
```

### Bug 8: VideoPlayer `onEnd` in useEffect dependency causes infinite re-render risk

**Files:** `client/src/components/VideoPlayer.jsx` (lines ~24-72)

**Problem:** `onEnd` is in the useEffect dependency array (line 72). If the parent re-renders and passes a new function reference for `onEnd` (which happens unless the parent memoizes it), the effect re-runs, removing and re-adding all event listeners, potentially interrupting playback.

**Fix:** Use a ref pattern for the callback:
```js
const onEndRef = useRef(onEnd);
useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
// In the effect, use onEndRef.current instead of onEnd
// Remove onEnd from the dependency array
```

### Bug 9: `PermissionRoute` uses `fetch()` instead of the `api` axios instance

**Files:** `client/src/App.jsx` (lines ~107-112)

**Problem:** `PermissionRoute` uses raw `fetch('/api/permissions/me')` instead of the configured `api` axios instance. This means:
- It bypasses the base URL logic (breaks on mobile dev where hostname isn't localhost)
- It bypasses the response interceptor (won't redirect on 401)
- It manually constructs headers instead of using the interceptor

**Fix:** Import and use the `api` instance:
```js
import api from '../services/api';
// ...
const response = await api.get('/permissions/me');
const perms = response.data.permissions;
```

### Bug 10: Race condition in service worker update + version management

**Files:** `client/src/main.jsx` (lines ~18-139)

**Problem:** The version check and service worker registration run as an async IIFE that executes AFTER `ReactDOM.createRoot().render()` (line 142). This means:
1. React app renders immediately
2. Service worker version check runs in background
3. If version changed, caches are cleared BUT the app is already running with potentially stale cached data
4. The `controllerchange` event clears the update interval but doesn't force-refresh

**Fix:** Either:
- Make version check synchronous and block render until complete (for critical updates)
- Or add a visible "Update available" banner that prompts refresh instead of silent activation

---

## PART 2: MODERATE BUGS

### Bug 11: No code-splitting / lazy loading for routes

**Files:** `client/src/App.jsx`

**Problem:** All 24+ page components are eagerly imported at the top of App.jsx (lines 7-38). This means the entire admin dashboard, media library, analytics, etc. are bundled into the initial load even for regular users who only use the player.

**Fix:** Use React.lazy + Suspense for route-based code splitting:
```js
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const MediaLibrary = React.lazy(() => import('./pages/admin/MediaLibrary'));
// etc.
```

### Bug 12: `getBase()` / `getApiBaseURL()` duplicated in 3 files

**Files:**
- `client/src/services/api.js` (lines 4-19)
- `client/src/pages/KioskModePage.jsx` (lines 19-25)
- `client/src/components/SlideshowPlayer.jsx` (lines 12-18)

**Problem:** The API base URL detection logic is copy-pasted in 3 places. KioskModePage and SlideshowPlayer create their own axios instances instead of using the shared `api` service. This means:
- Auth interceptors don't apply to kiosk/slideshow API calls
- Any fix to the base URL logic needs to be applied in 3 places
- The kiosk page uses a separate axios instance without response error handling

**Fix:** Use the shared `api` instance from `services/api.js` everywhere. For the display/kiosk endpoints that use token-based auth (not JWT), create a second shared instance:
```js
// services/displayApi.js
export const displayApi = axios.create({ baseURL: getApiBaseURL() });
```

### Bug 13: `event.preventDefault()` on `unhandledrejection` swallows errors silently

**Files:** `client/src/utils/errorTracking.js` (line 87)

**Problem:** `event.preventDefault()` in the unhandled rejection handler suppresses the console error. During development, this makes it impossible to see promise rejections in the console — they just silently disappear into localStorage.

**Fix:** Remove `event.preventDefault()` or only prevent in production:
```js
if (import.meta.env.PROD) event.preventDefault();
```

### Bug 14: Console.log statements everywhere in production

**Files:** Throughout `client/src/pages/PlayerPage.jsx`, `KioskModePage.jsx`, `main.jsx`

**Problem:** Hundreds of `console.log`, `console.warn`, `console.error` statements with emoji prefixes are left in production code. These:
- Leak internal state to anyone who opens DevTools
- Slightly degrade performance on low-end devices (kiosk TVs)
- Expose implementation details (URLs, error states, device detection logic)

**Fix:**
1. Use the existing `debugLog` pattern (line 28-30 of PlayerPage) consistently across ALL files
2. Add Vite config to strip console.logs in production:
```js
// vite.config.js
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

### Bug 15: WiFi QR code in KioskModePage uses external API service

**Files:** `client/src/pages/KioskModePage.jsx` (lines ~684-703)

**Problem:** The WiFi QR code is generated by fetching from `https://api.qrserver.com/v1/create-qr-code/...` — an external third-party service. This:
- Fails when the cafe has no internet (common in kiosk scenarios with local-only networks)
- Exposes WiFi SSID/password to a third-party server in the URL
- Adds an external dependency for a simple feature

**Fix:** Use the already-installed `qrcode.react` library (it's in package.json) to generate QR codes client-side:
```jsx
import { QRCodeSVG } from 'qrcode.react';
// ...
<QRCodeSVG value={wifiString} size={80} bgColor="#000000" fgColor="#ffffff" />
```

### Bug 16: `requiredPermissions` array in PermissionRoute dependency causes infinite re-check

**Files:** `client/src/App.jsx` (lines ~92-137)

**Problem:** The `useEffect` in `PermissionRoute` depends on `requiredPermissions` (line 137). Since this is an array literal passed from JSX (`requiredPermissions={['can_manage_displays', 'can_control_displays']}`), a new array reference is created every render, causing the permission check API call to fire on every render cycle.

**Fix:** Memoize the permissions array or use `JSON.stringify` for comparison:
```js
const permsKey = JSON.stringify(requiredPermissions);
useEffect(() => {
  // check permissions...
}, [user, isAuthenticated, permsKey]);
```

---

## PART 3: MODERNIZATION IMPROVEMENTS

### Improvement 1: Upgrade to React 19 + use() hook for data fetching

**Current:** React 18.2.0 with manual `useEffect` + `useState` for all API calls.

**Upgrade to:** React 19 with the `use()` hook and Suspense for data fetching. This eliminates the loading state boilerplate across all pages.

**Priority:** Medium (do after bug fixes)

### Improvement 2: Replace prop-types with TypeScript

**Current:** Runtime `prop-types` validation (every component imports PropTypes).

**Migrate to:** TypeScript (`.tsx` files) for compile-time type safety. This:
- Catches bugs before runtime
- Provides IDE autocomplete
- Eliminates the prop-types dependency entirely
- Is the modern React standard

**Migration path:**
1. Rename `.jsx` → `.tsx` one file at a time
2. Add `tsconfig.json` with strict mode
3. Start with leaf components (Button, Input, Badge) and work up
4. Remove `prop-types` from package.json when done

### Improvement 3: Add React Query (TanStack Query) for server state

**Current:** Manual `useEffect` + `useState` + `try/catch` for every API call (repeated 50+ times across the codebase).

**Migrate to:** TanStack Query v5 for:
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Loading/error states handled automatically
- DevTools for debugging

Example transformation:
```js
// Before (current pattern, repeated everywhere):
const [channels, setChannels] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  api.get(`/channels?playlistId=${id}`)
    .then(r => setChannels(r.data.channels))
    .catch(console.error)
    .finally(() => setLoading(false));
}, [id]);

// After (TanStack Query):
const { data: channels, isLoading } = useQuery({
  queryKey: ['channels', id],
  queryFn: () => api.get(`/channels?playlistId=${id}`).then(r => r.data.channels)
});
```

### Improvement 4: Replace raw CSS class strings with CVA (class-variance-authority)

**Current:** Long Tailwind class strings duplicated across components, e.g.:
```jsx
className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
```

**Migrate to:** CVA for consistent variant-based styling:
```js
const buttonVariants = cva("rounded-full transition-colors", {
  variants: {
    variant: {
      overlay: "bg-black/70 hover:bg-black/90 text-white",
      primary: "bg-[#B03A48] hover:bg-[#8f2d3a] text-white",
    },
    size: { sm: "p-2", md: "p-3", lg: "p-4" }
  }
});
```

### Improvement 5: Add Zustand for global state management

**Current:** React Context API for auth and theme. No global state for player, channels, or display state — everything is prop-drilled or duplicated.

**Add:** Zustand for lightweight global state:
```js
// stores/playerStore.js
export const usePlayerStore = create((set) => ({
  currentChannel: null,
  isPlaying: false,
  volume: 1,
  setChannel: (ch) => set({ currentChannel: ch }),
  // ...
}));
```

### Improvement 6: Add Vitest + React Testing Library

**Current:** Zero test files. No testing infrastructure.

**Add:**
1. `vitest` + `@testing-library/react` + `@testing-library/jest-dom`
2. Critical tests for:
   - HLS player initialization and error recovery
   - Channel filtering and search
   - Auth flow (login, token expiry, redirect)
   - Kiosk command handling
   - API interceptors

### Improvement 7: Add proper error monitoring (Sentry or similar)

**Current:** Errors stored in localStorage (max 50). No alerting, no production visibility.

**Add:** Sentry or a lightweight alternative for:
- Real-time crash reporting
- Session replay for player crashes
- Performance monitoring
- Source map uploads for readable stack traces

### Improvement 8: Modernize the HLS.js integration

**Current:** HLS.js 1.4.14 with manual event handling.

**Upgrade to:** HLS.js 1.5+ and use the modern API:
- Replace manual quality switching with ABR controller config
- Use `hls.on(Events.BUFFER_APPENDED)` for more reliable buffering detection
- Enable low-latency mode properly with `liveSyncDuration` config
- Consider using `hls-video-element` web component for a cleaner integration

### Improvement 9: Add animations with Framer Motion

**Current:** Basic CSS transitions (`transition-opacity duration-400`). No page transitions, no micro-interactions.

**Add:** Framer Motion for:
- Page transitions (fade between routes)
- Channel list animations (stagger, layout)
- Player control animations (slide up/down)
- Slideshow transitions (crossfade, slide, zoom)
- Toast/notification animations

### Improvement 10: Improve PWA with Workbox strategies

**Current:** Basic service worker with manually configured caching rules in vite.config.js.

**Improve:**
- Use Workbox `StaleWhileRevalidate` for API responses
- Add offline page fallback
- Implement background sync for watch history (log when offline, sync when back online)
- Add periodic background sync for channel list updates
- Properly handle PWA install prompt with a custom banner

### Improvement 11: Add dark mode support for the admin dashboard

**Current:** Light theme only (cream/maroon). A `ThemeContext` exists but dark mode CSS is incomplete.

**Add:** Full dark mode with Tailwind's `dark:` prefix:
- System preference detection
- Toggle in settings
- Persist preference
- All admin pages styled for both modes

### Improvement 12: Server-Sent Events or WebSocket for real-time commands

**Current:** Kiosk mode polls for commands every 2 seconds (`COMMAND_POLL_INTERVAL_MS = 2_000`). This creates unnecessary HTTP overhead and 2-second latency for commands.

**Replace with:** Server-Sent Events (SSE) for push-based command delivery:
- Zero latency for commands
- Single persistent connection instead of 30 requests/minute
- Automatic reconnection built into the EventSource API
- Falls back to polling if SSE connection fails

### Improvement 13: Image optimization pipeline

**Current:** `sharp` is used server-side but images are served as-is from `/uploads/`.

**Add:**
- Automatic WebP/AVIF conversion on upload
- Responsive image sizes (thumbnail, medium, full)
- Lazy loading with blur placeholder
- CDN-ready URL structure (`/uploads/optimized/{size}/{filename}.webp`)

---

## PART 4: IMPLEMENTATION ORDER

Execute fixes in this order to minimize risk:

### Phase 1: Critical Crash Fixes (Do First)
1. Fix Bug 2 (stale retryCount in HLS error handler)
2. Fix Bug 3 (duplicate event listeners on video element)
3. Fix Bug 4 (reboot timer leak in KioskModePage)
4. Fix Bug 5 (verifyDisplay loop in command polling)
5. Fix Bug 7 (YouTube API global collision)
6. Fix Bug 8 (VideoPlayer onEnd re-render)
7. Fix Bug 6 (SlideshowPlayer stale items.length)

### Phase 2: Code Quality (Prevents Future Crashes)
8. Fix Bug 1 (refactor PlayerPage.jsx into hooks + components)
9. Fix Bug 12 (deduplicate getBase/getApiBaseURL)
10. Fix Bug 9 (PermissionRoute fetch → api)
11. Fix Bug 14 (strip console.logs in production)
12. Fix Bug 11 (add lazy loading for routes)

### Phase 3: Security & Reliability
13. Fix Bug 15 (WiFi QR external API → client-side)
14. Fix Bug 13 (unhandledrejection swallowing)
15. Fix Bug 16 (PermissionRoute infinite re-check)
16. Fix Bug 10 (service worker race condition)

### Phase 4: Modernization (Iterative)
17. Add TanStack Query (Improvement 3)
18. Add Vitest (Improvement 6)
19. Replace SSE for kiosk commands (Improvement 12)
20. TypeScript migration (Improvement 2)
21. Everything else from Improvements list

---

## PART 5: QUICK WINS (< 30 min each)

These can be done immediately with minimal risk:

1. **Add `drop_console` to Vite terser config** — 2 lines in `vite.config.js`
2. **Fix PermissionRoute to use `api` instance** — 3-line change in `App.jsx`
3. **Fix WiFi QR to use `qrcode.react`** — 10-line change in `KioskModePage.jsx`
4. **Add cleanup effect for reboot timer** — 5 lines in `KioskModePage.jsx`
5. **Fix `onEnd` ref pattern in VideoPlayer** — 8 lines in `VideoPlayer.jsx`
6. **Remove `event.preventDefault()` in dev** — 1 line in `errorTracking.js`
7. **Memoize PermissionRoute permissions array** — 3 lines in `App.jsx`
8. **Add lazy loading for admin routes** — ~20 lines in `App.jsx`

---

## Notes for the Developer

- The #1 crash source is **PlayerPage.jsx** at 2,710 lines. Refactoring it into hooks is the single highest-impact improvement.
- The kiosk mode has a **2-second polling interval** for commands which generates ~1,800 HTTP requests/hour per display. With 10 displays, that's 18,000 requests/hour. SSE would reduce this to 10 persistent connections.
- The codebase has **zero tests**. Any refactoring without tests is risky. Adding Vitest early in the process is recommended.
- HLS.js version 1.4.14 is slightly outdated. Version 1.5+ has better error recovery and lower memory usage — relevant for the crash issues.
- The `hls.js` worker (`enableWorker: true` on desktop) can crash on some browsers when the tab is backgrounded for long periods. This may be a source of the reported intermittent crashes.
