# Channel Playback — Manual Test Checklist

Use after deploying channel reliability fixes. Test on **iPhone/Safari**, **Android/Chrome**, and **desktop Chrome** where noted.

## Playback

- [ ] A working HLS HTTPS channel plays within 13 seconds
- [ ] A dead channel does **not** stay on "Loading stream…" — shows "Stream offline" (or specific error)
- [ ] Invalid manifest shows a clear error (not infinite loading)
- [ ] Manifest loads but segment fails → "Manifest loaded but video segments failed"
- [ ] HTTP HLS stream plays via HTTPS proxy **or** shows "HTTP stream blocked"
- [ ] iPhone/Safari: compatible channel plays (native HLS / proxied URL)
- [ ] Chrome/Android: compatible channel plays (HLS.js or native)
- [ ] Unsupported codec shows "Unsupported codec" or "Stream incompatible with this device"
- [ ] Failed playback reports to backend (`channel_health` updates via `report-failure`)
- [ ] Error overlay: **Retry** reloads channel; **Next Channel** advances list
- [ ] Pre-check: opening a known-bad channel shows reason immediately (no spinner)

## Channel health (admin)

- [ ] `/admin/channel-health` → **Test all channels** updates statuses
- [ ] Per-row **Recheck** updates single channel
- [ ] **Playable only** filter on watch page hides failed channels
- [ ] **Show all** / **Failed** filters work in channel sidebar
- [ ] Admin sees failure reason code and device compatibility icons
- [ ] **Hide** / **Untrust** override actions work

## Security

- [ ] Stream proxy rejects private/reserved IPs (SSRF)
- [ ] Proxy requires valid short-lived signed token
- [ ] Server logs do not contain full stream tokens or Wi-Fi passwords
- [ ] Non-assigned user cannot access another playlist's channels
- [ ] Display verify does **not** return Wi-Fi password without matching `location_pin`
- [ ] `POST /api/displays/:id/rotate-token` invalidates old kiosk URL
- [ ] JWT invalidated after password change (`token_version`)
- [ ] Playlist edit/delete blocked without ownership or assignment permission
- [ ] Media upload requires admin; quota enforced when `MAX_STORAGE_MB` exceeded
- [ ] Kiosk command execute sends `{ token: displayToken }`

## Kiosk / signage

- [ ] Kiosk loads `appName` / `brandColor` from verify response (not hardcoded)
- [ ] Display token rotation updates kiosk URL

## Notes

Record playlist ID, channel name, device, and observed error for any failure.
