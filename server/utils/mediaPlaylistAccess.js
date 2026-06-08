/**
 * Resolve which media playlist IDs a display may access (kiosk for-display API).
 */

function addId(set, id) {
  const n = parseInt(id, 10);
  if (n > 0) set.add(n);
}

async function getAllowedMediaPlaylistIds(db, display, now = new Date()) {
  const allowed = new Set();

  addId(allowed, display.media_playlist_id);
  addId(allowed, display.day_playlist_id);
  addId(allowed, display.night_playlist_id);
  addId(allowed, display.failover_playlist_id);

  const dayIdx = now.getDay();
  const nowTime = now.toTimeString().slice(0, 8);
  const zoneId = display.zone_id || -1;

  try {
    const [scheds] = await db.query(
      `SELECT playlist_id FROM content_schedules
       WHERE enabled = 1
         AND (
           (target_type = 'display' AND target_id = ?) OR
           (target_type = 'zone' AND target_id = ?)
         )
         AND FIND_IN_SET(?, REPLACE(days_of_week, ', ', ',')) > 0
         AND start_time <= ? AND end_time >= ?
       ORDER BY CASE target_type WHEN 'display' THEN 1 ELSE 0 END DESC, priority DESC`,
      [display.id, zoneId, dayIdx, nowTime, nowTime]
    );
    scheds.forEach((r) => addId(allowed, r.playlist_id));
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  try {
    const [ovrs] = await db.query(
      `SELECT COALESCE(media_playlist_id, playlist_id) AS pid
       FROM emergency_overrides
       WHERE is_active = 1 AND expires_at > NOW()
         AND (
           display_id = ? OR
           zone_id = ? OR
           (display_id IS NULL AND zone_id IS NULL)
         )
       ORDER BY started_at DESC`,
      [display.id, zoneId]
    );
    ovrs.forEach((r) => addId(allowed, r.pid));
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  return allowed;
}

async function assertDisplayCanAccessPlaylist(db, display, playlistId) {
  const pid = parseInt(playlistId, 10);
  if (!pid) {
    const err = new Error('Invalid playlist_id');
    err.status = 400;
    throw err;
  }

  const allowed = await getAllowedMediaPlaylistIds(db, display);
  if (!allowed.has(pid)) {
    const err = new Error('Display is not assigned to this media playlist');
    err.status = 403;
    err.code = 'PLAYLIST_ACCESS_DENIED';
    throw err;
  }

  return true;
}

module.exports = {
  getAllowedMediaPlaylistIds,
  assertDisplayCanAccessPlaylist,
};
