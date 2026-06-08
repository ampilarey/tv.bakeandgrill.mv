# Bake & Grill TV — Full Code Audit (2026-06-08)

End-to-end audit of pairing, kiosk, auth, streaming, and admin flows.  
**Root cause of “Pair Display” 500:** pairing SQL selected non-existent column `last_seen` (schema uses `last_heartbeat`).

---

## P0 — Fixed in this release

| Issue | Location | Fix |
|-------|----------|-----|
| Pairing 500 after admin submits PIN | `server/routes/pairing.js` | `DISPLAY_SAFE_COLUMNS`: `last_seen` → `last_heartbeat` |
| Display user insert missing `phone_number` | `server/utils/displayUser.js` | Synthetic phone + role constraint handling |
| Stream double rate-limited | `server/server.js` | `apiLimiter.skip` matches `/api/stream` |
| Permission admin routes infinite spinner | `client/src/App.jsx` | `PermissionRoute` sets `hasAccess=false` when logged out; redirect to `/login` |
| QR `autoPairPin` lost after login | `LoginPage`, `DisplayManagement`, `PermissionRoute` | `postLoginRedirect` in sessionStorage |
| Kiosk media slideshow 401 | `mediaPlaylists.js`, `SlideshowPlayer.jsx` | `GET /for-display/items?token=&playlist_id=` |
| TV never detects pairing (silent 500) | `DisplayPairingPage.jsx` | Surface server errors on `check-pin` |
| Inactive displays still heartbeating | `server/routes/displays.js` | `findDisplayByToken(..., { activeOnly: true })` on kiosk endpoints |
| Emergency override media playlist ignored | `displays.js` commands poll | `COALESCE(media_playlist_id, playlist_id)` |
| Pairing permission mismatch | `pairing.js` | `checkAnyPermission` for manage **or** control |
| Empty playlist dropdown when pairing | `pairing.js` | `GET /api/pairing/playlists` (all active playlists) |
| Media kiosk heartbeat never starts | `KioskModePage.jsx` | Added `display` to heartbeat effect deps |
| Stale PWA after deploy | `main.jsx` | Reload on service worker `controllerchange` |

---

## P1 — Pairing flow (reference)

```
/login → Pair Display Now → /pair
  → POST /api/pairing/request-pin
  → poll POST /api/pairing/check-pin (every 5s)
Admin → Pair Display modal → POST /api/pairing/admin-pair-pin
  → createDisplaySystemUser → INSERT displays → UPDATE pairing_sessions
TV → check-pin returns { token } → /display?token=…
  → POST /api/displays/verify
```

### Remaining pairing risks

- **DB role constraint:** Run `node database/run-fix-display-role.js` if pairing returns 503 `DISPLAY_ROLE_NOT_ALLOWED`.
- **Migrations:** Run `node database/run-migration.js migrations/2026-06-09-pairing-prerequisites.sql` on older DBs.
- **NAT rate limits:** Raised to 60 check-pin/min; monitor if many TVs share one IP.
- **PIN collision:** `ON DUPLICATE KEY` no longer clears an already-paired session.
- **Channel health:** After pair, run **Channel Health → Test all channels** or kiosk shows “No playable channels”.

---

## P1 — Auth & security (open / monitor)

| Issue | Notes |
|-------|-------|
| JWT valid after user deleted | `auth.js` only checks `token_version` if user row exists |
| `token_version` DB blip → 503 all admin API | Fail-closed; heartbeat/verify unaffected |
| `POST /verify` returns full `playlists` row | Includes `m3u_url`; consider sanitizing |
| WiFi QR password | Verify only returns password with matching `location_pin`; kiosk never sends it |
| Global 600/15min API cap | Multiple kiosks + admin on one IP can still 429; consider raising `API_RATE_LIMIT` |
| Reconnect API unused | No client; approve ignores `expires_at` |

---

## P1 — Kiosk & playback (open / monitor)

| Issue | Notes |
|-------|-------|
| SSE drops after connect | Polling not restarted; reload required |
| `verifyDisplay` concurrent guard | `_inProgress` flag never set |
| Override revert channel | Uses index 0 not first playable |
| Version drift | `KioskModePage` heartbeat sends `1.1.0`; app `1.0.8` |
| SW caches GET `/api/*` 1h | Stale channel lists on flaky networks |
| PlayerPage tap overlay | Uses ref in JSX; may not re-render |

---

## P2 — Admin & ops

| Issue | Notes |
|-------|-------|
| DELETE display / enable-pairing | `requireAdmin` only; not `can_manage_displays` |
| Online threshold mismatch | 65s / 90s / 1.5m across UI and API |
| `generate-qr` pairing | No display system user; no `user_id` |
| `CLIENT_URL` for admin QR | Wrong env breaks admin-generated QR URLs |

---

## Production deploy checklist

```bash
cd ~/tv.bakeandgrill.mv
git pull origin main
cd server
node database/run-migration.js migrations/2026-06-09-pairing-prerequisites.sql
node database/run-fix-display-role.js   # if pairing still 503
touch tmp/restart.txt
```

**Verify pairing:**
1. `/login` → Pair Display → `/pair` shows PIN
2. Admin → Pair Display → submit → success (no 500)
3. TV redirects to `/display?token=…` within ~15s
4. Admin → Channel Health → Test all channels
5. Hard refresh kiosk browser once after deploy

**Verify API:**
```bash
curl -s -X POST https://tv.bakeandgrill.mv/api/pairing/request-pin -H 'Content-Type: application/json'
```

---

## Test checklist

See also:
- `client/src/pages/admin/TestChecklist.jsx` — Display Pairing section
- `docs/CHANNEL_PLAYBACK_TEST_CHECKLIST.md` — playback & security
