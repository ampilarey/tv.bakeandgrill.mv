const express = require('express');
const { fetch } = require('../utils/httpClient');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  parseM3U,
  extractGroups,
  searchChannels,
  filterByGroup,
  sortChannels,
  playlistBaseUrl,
} = require('../utils/m3uParser');
const { asyncHandler } = require('../middleware/errorHandler');
const m3uCache = require('../utils/m3uCache');
const {
  urlHash,
  diagnoseAndPersist,
  REASON_CODES,
  REASON_MESSAGES,
} = require('../services/channelDiagnosis');
const { enrichChannel, isVisibleInPlayableFilter } = require('../utils/channelEnrichment');
const channelChecker = require('../services/channelChecker');

const router = express.Router();

router.use(verifyToken);

async function assertPlaylistAccess(req, playlistId) {
  if (req.user.role === 'admin') return true;
  const db = getDatabase();
  const [access] = await db.query(
    'SELECT 1 FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
    [req.user.id, playlistId]
  );
  return access.length > 0;
}

/**
 * GET /api/channels
 */
router.get('/', asyncHandler(async (req, res) => {
  const { playlistId, search, group, sort, playableOnly } = req.query;

  if (!playlistId) {
    return res.status(400).json({ success: false, error: 'Playlist ID is required', code: 'VALIDATION_ERROR' });
  }

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = TRUE', [playlistId]);

  if (playlists.length === 0) {
    return res.status(404).json({ success: false, error: 'Playlist not found', code: 'PLAYLIST_NOT_FOUND' });
  }

  const playlist = playlists[0];

  if (!(await assertPlaylistAccess(req, playlistId))) {
    return res.status(403).json({ success: false, error: 'You do not have access to this playlist', code: 'PLAYLIST_ACCESS_DENIED' });
  }

  try {
    let channels = m3uCache.get(playlistId, playlist.m3u_url);

    if (!channels) {
      const response = await fetch(playlist.m3u_url, {
        timeout: 10000,
        headers: { 'User-Agent': 'BakeGrillTV/1.0' },
      });
      channels = parseM3U(response.data, playlistBaseUrl(playlist.m3u_url));
      if (channels?.length) m3uCache.set(playlistId, playlist.m3u_url, channels);
    }

    if (!channels?.length) {
      return res.status(500).json({ success: false, error: 'Failed to parse M3U file or no channels found', code: 'M3U_PARSE_ERROR' });
    }

    if (search) channels = searchChannels(channels, search);
    if (group) channels = filterByGroup(channels, group);
    channels = sortChannels(channels, sort || 'name');

    let healthMap = new Map();
    let overrideMap = new Map();

    try {
      const [healthRows] = await db.query(
        `SELECT url_hash, is_live, last_checked, failure_reason_code, failure_message, failure_stage,
                last_device_type, playable_ios, playable_android_chrome, playable_desktop_chrome,
                playable_tv_browser, needs_proxy, is_drm, is_hls, manifest_reachable,
                first_segment_reachable, is_http
         FROM channel_health WHERE playlist_id = ?`,
        [playlistId]
      );
      healthMap = new Map(healthRows.map((r) => [r.url_hash, r]));

      const [overrideRows] = await db.query(
        'SELECT url_hash, is_hidden, is_trusted FROM channel_overrides WHERE playlist_id = ?',
        [playlistId]
      );
      overrideMap = new Map(overrideRows.map((r) => [r.url_hash, r]));
    } catch (healthErr) {
      console.warn('[channels] Could not load health/override data:', healthErr.message);
    }

    channels = channels.map((ch) => {
      const hash = ch.url ? urlHash(ch.url) : null;
      return enrichChannel(ch, hash ? healthMap.get(hash) : null, hash ? overrideMap.get(hash) : null, playlist, req);
    });

    if (playlist.trusted_streams_only) {
      channels = channels.filter((c) => c.is_trusted !== 0);
    }

    if (playableOnly === '1') {
      channels = channels.filter(isVisibleInPlayableFilter); // soft playable filter for Watch page
    } else {
      channels = channels.filter((c) => c.is_hidden !== 1);
      channels.sort((a, b) => {
        const order = { playable: 0, unknown: 1, needs_recheck: 2, unsupported: 3, offline: 4, blocked: 5 };
        return (order[a.play_status] ?? 9) - (order[b.play_status] ?? 9) || a.name.localeCompare(b.name);
      });
    }

    const groups = extractGroups(channels);
    await db.query('UPDATE playlists SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);

    res.json({
      success: true,
      channels,
      groups,
      total: channels.length,
      playlistId: parseInt(playlistId, 10),
    });
  } catch (error) {
    console.error('Error fetching M3U:', error.message);
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ success: false, error: 'Request timeout while fetching M3U file', code: 'M3U_FETCH_TIMEOUT' });
    }
    if (error.response?.status >= 400) {
      return res.status(502).json({ success: false, error: `Failed to fetch M3U file (HTTP ${error.response.status})`, code: 'M3U_FETCH_FAILED' });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch or parse M3U file', code: 'M3U_ERROR' });
  }
}));

/**
 * POST /api/channels/report-failure
 */
router.post('/report-failure', asyncHandler(async (req, res) => {
  const { url, playlistId, channelName, reasonCode, deviceType, failureStage } = req.body;

  if (!url || !playlistId) {
    return res.status(400).json({ success: false, error: 'url and playlistId are required' });
  }

  if (!(await assertPlaylistAccess(req, playlistId))) {
    return res.status(403).json({ success: false, error: 'Access denied to this playlist' });
  }

  const hash = urlHash(url);
  const db = getDatabase();
  const safeReason = reasonCode && REASON_CODES.has(reasonCode) ? reasonCode : 'UNKNOWN_ERROR';
  const safeStage = failureStage ? String(failureStage).slice(0, 64) : null;
  const safeDevice = deviceType ? String(deviceType).slice(0, 32) : null;

  try {
    await db.query(
      `INSERT INTO channel_health
         (url_hash, playlist_id, url, channel_name, last_checked,
          last_client_failure_reason, last_client_failure_device, last_client_failure_stage,
          client_failure_count, last_device_type)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         last_checked = NOW(),
         last_client_failure_reason = VALUES(last_client_failure_reason),
         last_client_failure_device = VALUES(last_client_failure_device),
         last_client_failure_stage = VALUES(last_client_failure_stage),
         client_failure_count = client_failure_count + 1,
         last_device_type = COALESCE(VALUES(last_device_type), last_device_type)`,
      [
        hash,
        parseInt(playlistId, 10),
        url,
        channelName || null,
        safeReason,
        safeDevice,
        safeStage,
        safeDevice,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[channels] report-failure DB error:', err.message);
    }
  }

  res.json({ success: true });
}));

/**
 * POST /api/channels/diagnose
 */
router.post('/diagnose', asyncHandler(async (req, res) => {
  const { playlistId, channelId, url } = req.body;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  if (!(await assertPlaylistAccess(req, playlistId))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = 1', [playlistId]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  let channel;
  if (channelId) {
    const channels = await channelChecker.fetchChannelsForPlaylist(playlists[0]);
    channel = channels.find((c) => c.id === channelId);
  } else if (url) {
    channel = { url, name: 'Manual probe', id: urlHash(url) };
  }

  if (!channel) return res.status(404).json({ success: false, error: 'Channel not found' });

  const result = await diagnoseAndPersist(channel, parseInt(playlistId, 10));
  res.json({ success: true, diagnosis: result });
}));

/**
 * GET /api/channels/health-report?playlistId=N
 */
router.get('/health-report', requireAdmin, asyncHandler(async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  const db = getDatabase();
  const [rows] = await db.query(
    `SELECT url_hash, channel_name, url, is_live, last_checked,
            consecutive_failures, last_seen_live,
            failure_reason_code, failure_message, failure_stage,
            last_client_failure_reason, last_client_failure_device, last_client_failure_stage,
            client_failure_count,
            playable_ios, playable_android_chrome, playable_desktop_chrome, playable_tv_browser,
            manifest_reachable, first_segment_reachable, needs_proxy, is_drm,
            status_code, content_type, codec_video, codec_audio
     FROM channel_health
     WHERE playlist_id = ?
     ORDER BY is_live ASC, consecutive_failures DESC, channel_name ASC`,
    [parseInt(playlistId, 10)]
  );

  const live = rows.filter((r) => r.is_live === 1).length;
  const dead = rows.filter((r) => r.is_live === 0).length;
  const unknown = rows.filter((r) => r.is_live === null).length;

  res.json({ success: true, rows, summary: { live, dead, unknown, total: rows.length } });
}));

/**
 * POST /api/channels/recheck?playlistId=N
 */
router.post('/recheck', requireAdmin, asyncHandler(async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = 1', [parseInt(playlistId, 10)]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  channelChecker.recheckPlaylist(playlists[0]).catch((err) => console.error('[recheck]', err.message));
  res.json({ success: true, message: 'Health check started in background' });
}));

/**
 * POST /api/channels/:id/diagnose
 */
router.post('/:id/diagnose', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  if (!(await assertPlaylistAccess(req, playlistId))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = 1', [playlistId]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const result = await channelChecker.recheckSingleChannel(playlists[0], id);
  res.json({ success: true, diagnosis: result });
}));

/**
 * POST /api/channels/:id/recheck?playlistId=N
 */
router.post('/:id/recheck', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = 1', [parseInt(playlistId, 10)]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  channelChecker.recheckSingleChannel(playlists[0], id).catch((err) => console.error('[recheck-channel]', err.message));
  res.json({ success: true, message: 'Channel recheck started' });
}));

/**
 * PUT /api/channels/:id/override
 */
router.put('/:id/override', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { playlistId, url, is_hidden, is_trusted, admin_note } = req.body;
  if (!playlistId || !url) {
    return res.status(400).json({ success: false, error: 'playlistId and url required' });
  }

  const hash = urlHash(url);
  const db = getDatabase();

  await db.query(
    `INSERT INTO channel_overrides (playlist_id, url_hash, is_hidden, is_trusted, admin_note, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       is_hidden = COALESCE(?, is_hidden),
       is_trusted = COALESCE(?, is_trusted),
       admin_note = COALESCE(?, admin_note),
       updated_by = ?`,
    [
      parseInt(playlistId, 10),
      hash,
      is_hidden ? 1 : 0,
      is_trusted !== false ? 1 : 0,
      admin_note || null,
      req.user.id,
      is_hidden !== undefined ? (is_hidden ? 1 : 0) : null,
      is_trusted !== undefined ? (is_trusted ? 1 : 0) : null,
      admin_note !== undefined ? admin_note : null,
      req.user.id,
    ]
  );

  res.json({ success: true, channelId: id, url_hash: hash });
}));

/**
 * GET /api/channels/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  if (!(await assertPlaylistAccess(req, playlistId))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = TRUE', [playlistId]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  let channels = m3uCache.get(playlistId, playlists[0].m3u_url);
  if (!channels) {
    const response = await fetch(playlists[0].m3u_url, { timeout: 10000, headers: { 'User-Agent': 'BakeGrillTV/1.0' } });
    channels = parseM3U(response.data, playlistBaseUrl(playlists[0].m3u_url));
  }

  const ch = channels.find((c) => c.id === id);
  if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });

  const hash = urlHash(ch.url);
  const [healthRows] = await db.query('SELECT * FROM channel_health WHERE url_hash = ? AND playlist_id = ?', [hash, playlistId]);
  const [overrideRows] = await db.query('SELECT * FROM channel_overrides WHERE url_hash = ? AND playlist_id = ?', [hash, playlistId]);

  res.json({
    success: true,
    channel: enrichChannel(ch, healthRows[0], overrideRows[0], playlists[0], req),
  });
}));

module.exports = router;
