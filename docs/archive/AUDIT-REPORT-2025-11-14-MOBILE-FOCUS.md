# 📱 Mobile Playback & UX Audit – November 14, 2025

## 1. Executive Summary
- **Primary issue:** iOS/mobile playback stalled indefinitely and the channel list was unusable on touch devices.
- **Root causes:** autoplay attempts were triggered before the `<video>` element received its source, and the mobile UI forced the channel list into a non-scrollable column layout.
- **Status:** ✅ Fixed & verified on desktop + mobile simulators. Hls.js is now blocked on iOS, native playback receives the source before any play attempt, and the mobile UI uses a bottom-sheet drawer with proper touch scrolling.

## 2. Root Causes Identified
| Area | Finding | Impact |
| --- | --- | --- |
| `PlayerPage.jsx` | `tryPlayWithFallback()` ran **before** `video.src` was assigned (due to a delayed `setTimeout`). iOS rejected the `play()` promise because the element had no source, leaving the UI stuck. | Infinite “Loading…” overlay on iPhone/iPad. |
| `PlayerPage.jsx` | Layout relied on `h-screen` + two-column flex; on small screens the sidebar occupied the top of the viewport and `overflow-y` was blocked by nested containers. | Mobile users could not scroll or switch channels. |
| Server | API lacked hardened CORS/security middleware. No helmet/compression/rate-limiting even though existing docs recommended them. | Increased attack surface (brute force and header injection risk). |

## 3. Fixes Implemented
| File | Change |
| --- | --- |
| `client/src/pages/PlayerPage.jsx` | • Added responsive state + channel drawer for mobile.<br>• Extracted `renderSidebarContent()` so desktop + drawer share identical logic.<br>• Removed delayed `setTimeout`, assign HLS source immediately, and only run autoplay once the source exists.<br>• Added modern mobile header, channel-count footer, tap-to-dismiss drawer, and safe-area padding.<br>• Set `<video>` `src` only for native paths (HLS.js keeps control). |
| `client/src/index.css` | `.custom-scrollbar` now enables `-webkit-overflow-scrolling`, `touch-action: pan-y`, and `overscroll-behavior: contain` globally for smooth touch scrolling. |
| `server/server.js` | Added `helmet`, `compression`, `morgan`, and dual rate limiters (global + auth). CORS now honors an env-driven whitelist with logging for blocked origins. Increased body-parser safety limits and enabled `trust proxy`. |
| `server/package.json` + lock | Added new dependencies (`helmet`, `compression`, `express-rate-limit`, `morgan`) and installed them. |

## 4. Verification Matrix
| Scenario | Steps | Expected Result |
| --- | --- | --- |
| Desktop Chrome | Select multiple HLS channels, toggle list/grid, resize window. | Video starts within ~2s (Hls.js path). Drawer hidden; desktop sidebar always visible. No console errors. |
| Android Chrome | Load `/client` via LAN IP, tap “Channels” button, scroll drawer, pick channel. | Drawer scrolls with momentum, closes after selection, video auto-plays (muted fallback) or shows “Tap to Play”. |
| iPhone Safari | Add to homescreen or open in Safari. Pick channel, wait ≤12s or tap to play. | Native HLS path (no Hls.js). If autoplay blocked, “Tap to Play” overlay appears; if stream is audio-only, the new dimension checks show a descriptive error. |
| API hardening | Hit `/api/auth/login` repeatedly >100 times in 15 min. | 429 response once limit exceeded. Response headers include rate-limit info; helmet headers visible. |

## 5. Alignment With Existing Docs
- Reviewed `AUDIT-REPORT.md`, `MOBILE-ENHANCEMENTS.md`, `MOBILE-TESTING-CHECKLIST.md`, and `ACTION-PLAN.md`.
- Recommendations about “avoid Hls.js on iOS”, “improve mobile scrolling”, and “add rate limiting” were listed but not implemented—addressed in this pass.
- `MYSQL-SETUP.md` / `MYSQL-CONVERSION-STATUS.md` remain accurate; no schema drift detected.

## 6. Remaining Recommendations
1. **Live device regression pass:** Validate on physical iPhone/iPad/Android hardware to confirm autoplay + drawer gestures under real network conditions.
2. **Service Worker review:** ensure HLS segment caching is still disabled if PWA features are re-enabled (per `MOBILE-ENHANCEMENTS.md` guidance).
3. **Telemetry:** log playback state to `/history` when video actually starts on mobile (post `playing` event) to monitor failure rates.
4. **Channel metadata:** upstream playlist contains audio-only entries; surface an icon or filter to differentiate them pre-play.

## 7. Quick Reference
- **Primary files touched:** `client/src/pages/PlayerPage.jsx`, `client/src/index.css`, `server/server.js`, `server/package.json`, `server/package-lock.json`.
- **Testing commands:** `cd client && npm run dev` for UI, `cd server && npm run dev` for API. Rate limiters may require env overrides (`API_RATE_LIMIT`, `AUTH_RATE_LIMIT`) in local dev if you script load tests.
- **Env additions:** `ALLOWED_ORIGINS`, `API_RATE_LIMIT`, `AUTH_RATE_LIMIT` supported (optional). Document in deployment notes if used.

**Conclusion:** The player now respects native playback rules on iOS, the mobile UI is usable, and the API gains the security posture promised in prior documentation.

