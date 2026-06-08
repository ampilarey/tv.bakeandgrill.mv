# Bake & Grill TV — Café Digital Signage System

Full-stack digital signage platform for café/restaurant displays.  
Built with **React + Vite** (client) and **Express + MySQL** (server).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Creating the First Admin](#creating-the-first-admin)
5. [How to Use](#how-to-use)
6. [Kiosk Mode](#kiosk-mode)
7. [Outdoor Display Setup](#outdoor-display-setup)
8. [Zones & Schedules](#zones--schedules)
9. [Emergency Override](#emergency-override)
10. [Production Checklist](#production-checklist)
11. [API Reference](#api-reference)
12. [New Tables & Migrations](#new-tables--migrations)

---

## Quick Start

```bash
# 1. Clone
git clone git@github.com:ampilarey/tv.bakeandgrill.mv.git
cd tv.bakeandgrill.mv

# 2. Server deps
cd server && npm install

# 3. Copy and fill env
cp .env.example .env
# Edit server/.env with your values

# 4. Run DB migrations (auto on server start)
node server.js

# 5. Create first admin
node scripts/create-admin.js --email=admin@bakegrill.mv

# 6. Client (development)
cd ../client && npm install && npm run dev

# 7. Production build
cd client && npm run build
# dist/ is served as static files by Express
```

---

## Environment Variables

Copy `server/.env.example` → `server/.env` and set:

| Variable              | Required | Description                              |
|-----------------------|----------|------------------------------------------|
| `JWT_SECRET`          | ✅        | ≥ 32 random chars (use `openssl rand -hex 32`) |
| `DB_HOST`             | ✅        | MySQL host                               |
| `DB_PORT`             | ✅        | MySQL port (default 3306)                |
| `DB_USER`             | ✅        | MySQL user                               |
| `DB_PASS`             | ✅        | MySQL password                           |
| `DB_NAME`             | ✅        | Database name                            |
| `PORT`                |           | Server port (default 4000)               |
| `NODE_ENV`            |           | `production` on server                   |
| `CORS_ORIGINS`        | ✅ prod   | Comma-separated allowed origins          |
| `MAX_UPLOAD_MB`       |           | Max image upload in MB (default 20)      |
| `MAX_VIDEO_MB`        |           | Max video upload in MB (default 200)     |
| `SESSION_TIMEOUT_DAYS`|           | JWT expiry in days (default 7)           |

**Never commit `.env`** — only `.env.example` is in the repo.

---

## Database Setup

Migrations run **automatically** on server start via `server/database/init.js`.  
They are idempotent — safe to re-run.

### Manual migration (if needed)

```bash
# In MySQL:
mysql -u root -p bakegrill_tv < server/database/schema.sql
# Then apply migration files in order:
mysql -u root -p bakegrill_tv < server/database/migrations/2026-02-28-add-channel-health.sql
mysql -u root -p bakegrill_tv < server/database/migrations/2026-02-28-b-add-pairing-sessions.sql
mysql -u root -p bakegrill_tv < server/database/migrations/2026-02-28-c-add-zones-overrides.sql
mysql -u root -p bakegrill_tv < server/database/migrations/2026-02-28-d-media-library-schedules.sql
```

---

## Creating the First Admin

```bash
node server/scripts/create-admin.js --email=admin@bakegrill.mv --phone=1234567
# You will be prompted for a password (not echoed)
```

Never set `DEFAULT_ADMIN_PASSWORD` in production — the server will crash if it detects this.

---

## How to Use

### 1. Upload Media
- Admin → **Media Library** → Upload images (JPG/PNG/WebP) and videos (MP4)
- Thumbnails are auto-generated for images

### 2. Create a Media Playlist
- Admin → **Media Playlists** → New Playlist
- Add images/videos, set display duration for images
- Reorder with ↑↓ arrows
- Enable shuffle if desired

### 3. Create a Display
- Admin → **Displays** → Add Display
- Set **Display Type**:
  - `stream` — plays IPTV/HLS channels from an M3U playlist
  - `media` — loops your media playlist as a slideshow
- Assign the media playlist
- Copy the display token (used to pair the TV)

### 4. Pair the TV
- Open `https://your-domain.com/display?token=YOUR_TOKEN` on the TV browser
- Or use QR code / PIN pairing from the admin panel

### 5. Schedules
- Admin → **Zones & Overrides** → Schedules
- Set a media playlist, target (display or zone), days of week, time range, and priority
- The display automatically picks the highest-priority active schedule

---

## Kiosk Mode

The `/display?token=...` route runs in full kiosk mode:

- **Fullscreen**: prompts on first tap/click
- **Cursor hidden** after 2 seconds of inactivity
- **Right-click disabled**, common keyboard shortcuts blocked (F5, F11, F12, Ctrl+R)
- **Heartbeat** every 25 seconds to monitor online/offline
- **Fail-safe**: if network/content fails → branded "Bake & Grill TV — Back soon" screen, auto-retry every 10 s
- **Local cache**: last-known playlist stored in `localStorage` for 24 h

### Android TV Box (ATV/Box running Android)

1. Install **Fully Kiosk Browser** (best option) or **Chromium**
2. Set start URL: `https://tv.bakeandgrill.mv/display?token=YOUR_TOKEN`
3. In Fully Kiosk: enable "Start on Boot", "Keep Screen On", disable address bar

### Windows Chrome Kiosk

```batch
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk ^
  --no-first-run ^
  --disable-translate ^
  --disable-infobars ^
  --noerrdialogs ^
  "https://tv.bakeandgrill.mv/display?token=YOUR_TOKEN"
```

Add to Windows startup for auto-launch.

### Raspberry Pi (Chromium)

```bash
# In ~/.config/lxsession/LXDE-pi/autostart:
@chromium-browser --kiosk --noerrdialogs --disable-infobars \
  https://tv.bakeandgrill.mv/display?token=YOUR_TOKEN
```

---

## Outdoor Display Setup

Outdoor displays show content to customers outside the café.

1. Create display → enable **Outdoor** toggle
2. Set **Day playlist** (shown from e.g. 07:00–18:00) and **Night playlist**
3. Enable **Mute audio** (customers can't hear it anyway)
4. Enable **Brand watermark** so your logo is always visible
5. **Pairing is disabled by default** for outdoor — admin must click "Enable Pairing" from the display management panel (opens a 10-minute window)

---

## Zones & Schedules

### Zones
Group displays together (e.g., "Dining Room", "Outdoor", "Bar").

- Admin → **Zones & Overrides** → Create Zone
- Assign displays to zones in Display settings (`zone_id`)

### Content Schedules
Automatically switch playlists based on time of day.

```
Example:
- Breakfast (06:00-11:00) Mon-Sun → "Breakfast Menu" playlist
- Lunch (11:00-15:00) Mon-Fri → "Lunch Specials" playlist  
- Evening (18:00-22:00) Daily → "Dinner Ambience" playlist
```

Display-level schedules have priority over zone-level schedules.

---

## Emergency Override

Override all TVs in a zone (or a single display) instantly.

1. Admin → **Zones & Overrides** → Emergency Override
2. Select target: Zone / Display / All TVs
3. Select playlist and duration (e.g., 30 minutes)
4. Click "Activate Override"
5. TVs switch immediately; revert automatically after duration

Use case: "Happy Hour starting now — show promo for 1 hour"

---

## Channel Diagnosis & Playback

### How diagnosis works

The server probes each channel on a schedule (every 30 minutes) and on demand:

1. Fetches the stream URL (with M3U `User-Agent` / `Referer` if set)
2. For HLS: validates manifest, follows master → media playlist, fetches first segment
3. Detects DRM (`#EXT-X-KEY`), codec issues (e.g. HEVC), HTTP/mixed-content risks
4. Stores results in `channel_health` with reason codes (`OFFLINE`, `MANIFEST_OK_SEGMENT_FAIL`, `MIXED_CONTENT_HTTP`, etc.)
5. Exposes `play_status` and device flags (`playable_ios`, `playable_android_chrome`, …) to the client

**Admin:** `/admin/channel-health` — test all channels, per-channel recheck, hide/untrust bad streams.

**API:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/channels/diagnose` | Body: `{ playlistId, channelId }` or `{ playlistId, url }` |
| `POST` | `/api/channels/:id/diagnose?playlistId=N` | Diagnose single channel |
| `POST` | `/api/channels/:id/recheck?playlistId=N` | Admin background recheck |
| `POST` | `/api/channels/report-failure` | Client playback failure report |
| `PUT`  | `/api/channels/:id/override` | Hide/trust channel (admin) |

### Playback proxy

When a stream needs proxying (HTTP on HTTPS site, custom headers, referrer), the API returns:

```
playback_url: /api/stream/:channelId/master.m3u8?token=…&playlistId=N
```

- Tokens are **HMAC-signed**, **10-minute TTL** (`STREAM_TOKEN_TTL_SEC`)
- Proxy rewrites manifest segment URLs to same-origin HTTPS paths
- SSRF protection blocks private IPs; DRM streams are **not** proxied
- Tokens and origin credentials are **never logged**

Direct HTTPS streams without special requirements use the original URL as `playback_url`.

### Watch page behaviour

- Default channel list shows **playable only**; toggle **Show all** / **Failed**
- Player timeout: **13 seconds** without advancing `timeupdate` → clear error (not infinite loading)
- Errors: Retry + **Next Channel** buttons; failures reported to backend

### Environment variables (channel/stream)

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_REMOTE_BYTES` | 5242880 | Max M3U/manifest download size |
| `MANIFEST_MAX_BYTES` | 2097152 | Max manifest size for probes |
| `SEGMENT_MAX_BYTES` | 52428800 | Max proxied segment size (50 MB) |
| `STREAM_TOKEN_TTL_SEC` | 600 | Signed stream token lifetime |
| `STREAM_PROXY_TIMEOUT_MS` | 15000 | Proxy fetch timeout |
| `CHANNEL_PROBE_TIMEOUT_MS` | 12000 | Health probe timeout |
| `MAX_STORAGE_MB` | 2048 | Total media library disk quota |

Manual test checklist: [`docs/CHANNEL_PLAYBACK_TEST_CHECKLIST.md`](docs/CHANNEL_PLAYBACK_TEST_CHECKLIST.md)

---

## Production Checklist

- [ ] `JWT_SECRET` rotated and is ≥ 32 chars
- [ ] `CORS_ORIGINS` set to exact frontend domain (no wildcard)
- [ ] `NODE_ENV=production` in env
- [ ] `DEFAULT_ADMIN_PASSWORD` NOT in env
- [ ] Admin created via `node scripts/create-admin.js`
- [ ] DB backed up (set up cron for `mysqldump`)
- [ ] HTTPS enabled (required for Fullscreen API and service worker)
- [ ] `uploads/` directory writable by Node.js process
- [ ] cPanel: Node.js app set to start with `server.js`, restart after pull

### cPanel terminal — pull & deploy

**Project path on server:** `~/tv.bakeandgrill.mv`  
(`/home/bakeandgrill/tv.bakeandgrill.mv`)

**Standard deploy** (frontend `client/dist` is built locally and committed to git — no `npm run build` on server):

```bash
cd ~/tv.bakeandgrill.mv
git pull origin main
cd server
mkdir -p tmp
touch tmp/restart.txt
```

**If git asks for SSH key** (some servers need this):

```bash
cd ~/tv.bakeandgrill.mv
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes" git pull origin main
cd server && mkdir -p tmp && touch tmp/restart.txt
```

**Verify after deploy:**

```bash
cd ~/tv.bakeandgrill.mv && git log -1 --oneline
curl -s https://tv.bakeandgrill.mv/api/health
```

Then hard-refresh the site in your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`).

**If `touch tmp/restart.txt` does not restart the app:** cPanel → **Setup Node.js App** → `tv.bakeandgrill.mv` → **Restart**, or run `~/restart-tv-server.sh`.

**Only if `client/dist` was not pushed** (fallback — needs Node on server):

```bash
cd ~/tv.bakeandgrill.mv/client
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install && npm run build
deactivate
cd ~/tv.bakeandgrill.mv/server && touch tmp/restart.txt
```

---

## API Reference

### New Endpoints (Phase 3–9)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/uploads` | Upload image or video (field: `file`) |
| `GET`  | `/api/uploads?type=image&page=1` | List media assets |
| `DELETE` | `/api/uploads/:id` | Delete asset by ID |
| `GET`  | `/api/media-playlists` | List media playlists |
| `POST` | `/api/media-playlists` | Create playlist |
| `GET`  | `/api/media-playlists/:id` | Get playlist + items |
| `PUT`  | `/api/media-playlists/:id` | Update playlist |
| `DELETE` | `/api/media-playlists/:id` | Delete playlist |
| `GET`  | `/api/media-playlists/:id/items` | Get items |
| `POST` | `/api/media-playlists/:id/items` | Add item |
| `PUT`  | `/api/media-playlists/:id/items/:itemId` | Update item settings |
| `DELETE` | `/api/media-playlists/:id/items/:itemId` | Remove item |
| `POST` | `/api/media-playlists/:id/items/reorder` | Reorder items |
| `GET`  | `/api/content-schedules` | List schedules |
| `POST` | `/api/content-schedules` | Create schedule |
| `PUT`  | `/api/content-schedules/:id` | Update schedule |
| `DELETE` | `/api/content-schedules/:id` | Delete schedule |
| `GET`  | `/api/content-schedules/resolve?display_id=N` | Resolve active playlist for display now |
| `GET`  | `/api/zones` | List zones with display counts |
| `POST` | `/api/zones` | Create zone |
| `PUT`  | `/api/zones/:id` | Update zone |
| `DELETE` | `/api/zones/:id` | Delete zone |
| `GET`  | `/api/zones/:id/displays` | List displays in zone |
| `POST` | `/api/zones/:id/command` | Push command to all displays in zone |
| `GET`  | `/api/zones/overrides/active` | Active emergency overrides |
| `POST` | `/api/zones/override` | Create emergency override |
| `DELETE` | `/api/zones/override/:id` | Cancel override |
| `POST` | `/api/displays/:id/enable-pairing` | Enable 10-min pairing window |
| `GET`  | `/api/health` | `{ status, version, database }` |

---

## New Tables & Migrations

| Table | Migration File | Purpose |
|-------|---------------|---------|
| `media_assets` | `2026-02-28-d-…` | Uploaded images and videos |
| `media_playlists` | `2026-02-28-d-…` | Named photo/video playlists |
| `media_playlist_items` | `2026-02-28-d-…` | Items in each playlist, with ordering |
| `content_schedules` | `2026-02-28-d-…` | Time-based playlist rules (display/zone) |
| `pairing_sessions` | `2026-02-28-b-…` | DB-backed pairing (no in-memory maps) |
| `zones` | `2026-02-28-c-…` | Display groupings |
| `emergency_overrides` | `2026-02-28-c-…` | Zone/display content overrides |
| `channel_health` | `2026-02-28-a-…` | Deep channel diagnosis + playability |
| `channel_overrides` | `2026-06-07-…` | Admin hide/trust per channel |

### New columns added to existing tables

**`displays`**: `zone_id`, `pairing_enabled_until`, `last_status`, `now_playing`, `app_version`, `uptime_seconds`, `media_playlist_id`, `is_outdoor`, `mute_audio`, `day_playlist_id`, `night_playlist_id`, `day_start_time`, `night_start_time`, `show_clock_overlay`, `show_brand_overlay`, `display_type`

**`users`**: `token_version`, `last_password_change_at`

**`emergency_overrides`**: `media_playlist_id`, `target_type`
