const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getDatabase } = require('../database/init');
const { enrichChannel } = require('../utils/channelEnrichment');
const { urlHash } = require('../services/channelDiagnosis');
const {
  createDirectChannel,
  updateDirectChannel,
  deleteDirectChannel,
  listDirectChannels,
  getDirectChannelByApiId,
  directChannelApiId,
  parseDirectChannelId,
  toChannelObject,
  findDuplicates,
  parseBulkText,
  ensureDirectStreamsPlaylist,
  normalizeStreamUrl,
  detectStreamType,
} = require('../services/directChannelService');
const { probeDirectStream } = require('../services/directStreamProbe');
const { diagnoseAndPersist } = require('../services/channelDiagnosis');

const router = express.Router();

router.use(requireAdmin);

async function enrichDirectRow(row, req) {
  const db = getDatabase();
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [row.playlist_id]);
  if (!playlists.length) return toChannelObject(row);
  const ch = toChannelObject(row);
  const [health] = await db.query(
    'SELECT * FROM channel_health WHERE url_hash = ? AND playlist_id = ?',
    [urlHash(row.stream_url), row.playlist_id]
  );
  return enrichChannel(ch, health[0] || null, null, playlists[0], req);
}

/**
 * POST /api/channels/direct/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  const { stream_url, http_user_agent, http_referer } = req.body;
  if (!stream_url) {
    return res.status(400).json({ success: false, error: 'stream_url is required' });
  }
  const probe = await probeDirectStream({
    url: stream_url,
    httpUserAgent: http_user_agent,
    httpReferer: http_referer,
  });
  res.json({ success: true, probe });
}));

/**
 * GET /api/channels/direct/default-playlist
 */
router.get('/default-playlist', asyncHandler(async (req, res) => {
  const playlist = await ensureDirectStreamsPlaylist();
  res.json({ success: true, playlist });
}));

/**
 * POST /api/channels/direct/bulk/preview
 */
router.post('/bulk/preview', asyncHandler(async (req, res) => {
  const { text, playlist_id: playlistId } = req.body;
  const rows = parseBulkText(text);
  const preview = [];

  for (const row of rows) {
    if (row.invalid) {
      preview.push({ ...row, status: 'invalid', message: 'Unrecognized line format' });
      continue;
    }
    if (!/^https?:\/\//i.test(row.stream_url || '')) {
      preview.push({ ...row, status: 'invalid', message: 'URL must be http or https' });
      continue;
    }
    const normalized = normalizeStreamUrl(row.stream_url);
    const dup = playlistId ? await findDuplicates(playlistId, normalized) : { samePlaylist: [], otherPlaylists: [] };
    preview.push({
      ...row,
      stream_url: normalized,
      status: dup.samePlaylist.length ? 'duplicate' : 'ok',
      duplicate: dup.samePlaylist[0] || null,
      cross_playlist_duplicates: dup.otherPlaylists,
    });
  }

  res.json({ success: true, preview });
}));

/**
 * POST /api/channels/direct/bulk
 */
router.post('/bulk', asyncHandler(async (req, res) => {
  const {
    rows,
    playlist_id: playlistIdBody,
    use_default_playlist: useDefault,
    allow_duplicate: allowDuplicate,
    skip_unreachable: skipUnreachable,
  } = req.body;

  let playlistId = playlistIdBody;
  if (useDefault || !playlistId) {
    const p = await ensureDirectStreamsPlaylist();
    playlistId = p.id;
  }

  const results = { added: [], skipped_duplicate: [], invalid: [], failed: [], added_unreachable: [] };

  for (const row of rows || []) {
    if (!row?.stream_url || !row?.name) {
      results.invalid.push({ row, reason: 'missing_name_or_url' });
      continue;
    }

    try {
      let probe = null;
      if (!skipUnreachable) {
        probe = await probeDirectStream({
          url: row.stream_url,
          httpUserAgent: row.http_user_agent,
          httpReferer: row.http_referer,
        });
      }

      const created = await createDirectChannel({
        playlist_id: playlistId,
        name: row.name,
        stream_url: row.stream_url,
        group_name: row.group_name,
        logo_url: row.logo_url,
        playback_mode: row.playback_mode || 'auto',
        http_user_agent: row.http_user_agent,
        http_referer: row.http_referer,
        is_active: row.is_active !== false,
        allow_duplicate: allowDuplicate,
        stream_type: probe?.detected_type,
        probe_body: null,
      }, req.user.id);

      const enriched = await enrichDirectRow(created, req);
      if (probe && probe.safe_error_code && !probe.manifest_valid) {
        results.added_unreachable.push(enriched);
      } else {
        results.added.push(enriched);
      }
    } catch (err) {
      if (err.code === 'DUPLICATE_URL') {
        results.skipped_duplicate.push({ row, existing: err.existing });
      } else {
        results.failed.push({ row, error: err.message });
      }
    }
  }

  res.json({ success: true, playlist_id: playlistId, results });
}));

/**
 * GET /api/channels/direct
 */
router.get('/', asyncHandler(async (req, res) => {
  const { playlistId, includeInactive } = req.query;
  const rows = await listDirectChannels({
    playlistId: playlistId ? parseInt(playlistId, 10) : null,
    includeInactive: includeInactive === '1',
  });
  const channels = await Promise.all(rows.map((r) => enrichDirectRow(r, req)));
  res.json({ success: true, channels });
}));

/**
 * POST /api/channels/direct
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    stream_url,
    stream_type,
    group_name,
    logo_url,
    playback_mode,
    http_user_agent,
    http_referer,
    is_active,
    sort_order,
    playlist_id: playlistIdBody,
    use_default_playlist: useDefault,
    allow_duplicate: allowDuplicate,
  } = req.body;

  if (!name || !stream_url) {
    return res.status(400).json({ success: false, error: 'name and stream_url are required' });
  }

  let playlistId = playlistIdBody;
  if (useDefault || !playlistId) {
    const p = await ensureDirectStreamsPlaylist();
    playlistId = p.id;
  }

  const created = await createDirectChannel({
    playlist_id: playlistId,
    name,
    stream_url,
    stream_type,
    group_name,
    logo_url,
    playback_mode,
    http_user_agent,
    http_referer,
    is_active,
    sort_order,
    allow_duplicate: allowDuplicate,
  }, req.user.id);

  const channel = await enrichDirectRow(created, req);
  res.status(201).json({ success: true, channel });
}));

/**
 * GET /api/channels/direct/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const dbId = parseDirectChannelId(req.params.id);
  if (!dbId) return res.status(400).json({ success: false, error: 'Invalid direct channel id' });
  const row = await getDirectChannelByApiId(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Direct channel not found' });
  const channel = await enrichDirectRow(row, req);
  res.json({ success: true, channel });
}));

/**
 * PUT /api/channels/direct/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const dbId = parseDirectChannelId(req.params.id);
  if (!dbId) return res.status(400).json({ success: false, error: 'Invalid direct channel id' });
  const updated = await updateDirectChannel(dbId, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Direct channel not found' });
  const channel = await enrichDirectRow(updated, req);
  res.json({ success: true, channel });
}));

/**
 * DELETE /api/channels/direct/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const dbId = parseDirectChannelId(req.params.id);
  if (!dbId) return res.status(400).json({ success: false, error: 'Invalid direct channel id' });
  const result = await deleteDirectChannel(dbId, { force: req.query.force === '1' });
  if (!result.deleted) {
    return res.status(result.reason === 'referenced' ? 409 : 404).json({
      success: false,
      error: result.reason === 'referenced' ? 'Channel is referenced elsewhere' : 'Not found',
      refs: result.refs,
    });
  }
  res.json({ success: true, deleted: directChannelApiId(dbId) });
}));

/**
 * POST /api/channels/direct/:id/retest
 */
router.post('/:id/retest', asyncHandler(async (req, res) => {
  const dbId = parseDirectChannelId(req.params.id);
  if (!dbId) return res.status(400).json({ success: false, error: 'Invalid direct channel id' });
  const row = await getDirectChannelByApiId(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Direct channel not found' });

  const probe = await probeDirectStream({
    url: row.stream_url,
    httpUserAgent: row.http_user_agent,
    httpReferer: row.http_referer,
  });

  const ch = toChannelObject(row);
  await diagnoseAndPersist(ch, row.playlist_id).catch(() => {});

  res.json({ success: true, probe, channel_id: directChannelApiId(dbId) });
}));

module.exports = router;
