const express = require('express');
const { fetch } = require('../utils/httpClient');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { parseM3U, extractGroups, searchChannels, filterByGroup, sortChannels } = require('../utils/m3uParser');
const { asyncHandler } = require('../middleware/errorHandler');
const m3uCache = require('../utils/m3uCache');
const { urlHash } = require('../services/channelChecker');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/channels
 * Get channels from a playlist with live-status indicators
 */
router.get('/', asyncHandler(async (req, res) => {
  const { playlistId, search, group, sort } = req.query;

  if (!playlistId) {
    return res.status(400).json({
      success: false,
      error: 'Playlist ID is required',
      code: 'VALIDATION_ERROR'
    });
  }

  const db = getDatabase();

  // Get playlist
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = TRUE', [playlistId]);

  if (playlists.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }

  const playlist = playlists[0];

  // Verify user has access to this playlist (admin bypasses)
  if (req.user.role !== 'admin') {
    const [access] = await db.query(
      'SELECT 1 FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
      [req.user.id, playlistId]
    );
    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this playlist',
        code: 'PLAYLIST_ACCESS_DENIED'
      });
    }
  }

  try {
    // Check cache first
    let channels = m3uCache.get(playlistId, playlist.m3u_url);

    if (!channels) {
      const response = await fetch(playlist.m3u_url, {
        timeout: 10000,
        headers: { 'User-Agent': 'BakeGrillTV/1.0' }
      });
      channels = parseM3U(response.data);
      if (channels && channels.length > 0) {
        m3uCache.set(playlistId, playlist.m3u_url, channels);
      }
    }

    if (channels.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse M3U file or no channels found',
        code: 'M3U_PARSE_ERROR'
      });
    }

    // Apply filters
    if (search) channels = searchChannels(channels, search);
    if (group)  channels = filterByGroup(channels, group);
    channels = sortChannels(channels, sort || 'name');

    // ── Merge channel health status ──────────────────────────────────────────
    // Load all health rows for this playlist in one query, then map by hash
    try {
      const [healthRows] = await db.query(
        'SELECT url_hash, is_live, last_checked FROM channel_health WHERE playlist_id = ?',
        [playlistId]
      );
      if (healthRows.length > 0) {
        const healthMap = new Map(healthRows.map((r) => [r.url_hash, r]));
        channels = channels.map((ch) => {
          if (!ch.url) return ch;
          const health = healthMap.get(urlHash(ch.url));
          return {
            ...ch,
            is_live:      health ? health.is_live      : null,
            last_checked: health ? health.last_checked : null,
          };
        });
      }
    } catch (healthErr) {
      // Non-fatal — serve channels without health data if DB fails
      console.warn('[channels] Could not load health data:', healthErr.message);
    }
    // ────────────────────────────────────────────────────────────────────────

    const groups = extractGroups(channels);

    await db.query('UPDATE playlists SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);

    res.json({
      success: true,
      channels,
      groups,
      total: channels.length,
      playlistId: parseInt(playlistId)
    });

  } catch (error) {
    console.error('Error fetching M3U:', error.message);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ success: false, error: 'Request timeout while fetching M3U file', code: 'M3U_FETCH_TIMEOUT' });
    }
    if (error.response && error.response.status >= 400) {
      return res.status(502).json({ success: false, error: `Failed to fetch M3U file (HTTP ${error.response.status})`, code: 'M3U_FETCH_FAILED' });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch or parse M3U file', code: 'M3U_ERROR' });
  }
}));

/**
 * POST /api/channels/report-failure
 * Client reports a playback failure for a channel.
 * Increments consecutive_failures; after 3+ failures marks it as down.
 */
router.post('/report-failure', asyncHandler(async (req, res) => {
  const { url, playlistId, channelName } = req.body;

  if (!url || !playlistId) {
    return res.status(400).json({ success: false, error: 'url and playlistId are required' });
  }

  const db = getDatabase();

  // Verify user has access to this playlist (admin bypasses)
  if (req.user.role !== 'admin') {
    const [access] = await db.query(
      'SELECT 1 FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
      [req.user.id, playlistId]
    );
    if (access.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to this playlist' });
    }
  }

  const hash = urlHash(url);

  try {
    await db.query(
      `INSERT INTO channel_health
         (url_hash, playlist_id, url, channel_name, is_live, last_checked,
          consecutive_failures, last_seen_live)
       VALUES (?, ?, ?, ?, 0, NOW(), 1, NULL)
       ON DUPLICATE KEY UPDATE
         consecutive_failures = consecutive_failures + 1,
         is_live = IF(consecutive_failures + 1 >= 3, 0, is_live),
         last_checked = NOW()`,
      [hash, parseInt(playlistId), url, channelName || null]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[channels] report-failure DB error:', err.message);
    }
  }

  res.json({ success: true });
}));

/**
 * GET /api/channels/health-report?playlistId=N
 * Returns all health rows stored for a playlist (no M3U re-fetch).
 */
router.get('/health-report', asyncHandler(async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  const db = getDatabase();
  const [rows] = await db.query(
    `SELECT url_hash, channel_name, url, is_live, last_checked,
            consecutive_failures, last_seen_live
     FROM channel_health
     WHERE playlist_id = ?
     ORDER BY is_live ASC, consecutive_failures DESC, channel_name ASC`,
    [parseInt(playlistId)]
  );

  const live    = rows.filter(r => r.is_live === 1).length;
  const dead    = rows.filter(r => r.is_live === 0).length;
  const unknown = rows.filter(r => r.is_live === null).length;

  res.json({ success: true, rows, summary: { live, dead, unknown, total: rows.length } });
}));

/**
 * POST /api/channels/recheck?playlistId=N
 * Admin-triggered manual health recheck for a specific playlist.
 */
router.post('/recheck', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ success: false, error: 'playlistId required' });

  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = 1', [parseInt(playlistId)]);
  if (!playlists.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  // Fire-and-forget — respond immediately so the admin doesn't wait
  const channelChecker = require('../services/channelChecker');
  channelChecker.recheckPlaylist(playlists[0]).catch(err => console.error('[recheck]', err.message));

  res.json({ success: true, message: 'Health check started in background' });
}));

/**
 * GET /api/channels/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Single channel lookup not implemented',
    code: 'NOT_IMPLEMENTED'
  });
}));

module.exports = router;
