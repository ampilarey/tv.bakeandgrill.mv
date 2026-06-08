const express = require('express');
const { URL } = require('url');
const { fetch, fetchRange, redactUrl } = require('../utils/httpClient');
const { verifyToken: verifyStreamToken, issueStreamToken } = require('../utils/streamToken');
const { rewriteManifest } = require('../utils/hlsManifest');
const { resolveChannel } = require('../utils/channelResolver');
const { getDatabase } = require('../database/init');
const { urlHash } = require('../services/channelDiagnosis');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const PROXY_TIMEOUT_MS = parseInt(process.env.STREAM_PROXY_TIMEOUT_MS || '15000', 10);
const SEGMENT_MAX_BYTES = parseInt(process.env.SEGMENT_MAX_BYTES || '10485760', 10);

function buildHeaders(channel) {
  const headers = { 'User-Agent': 'BakeGrillTV/1.0' };
  if (channel.httpUserAgent) headers['User-Agent'] = channel.httpUserAgent;
  if (channel.httpReferrer) headers['Referer'] = channel.httpReferrer;
  return headers;
}

async function assertChannelAccess(playlistId, channel) {
  const db = getDatabase();
  const [health] = await db.query(
    'SELECT is_drm FROM channel_health WHERE url_hash = ? AND playlist_id = ?',
    [urlHash(channel.url), playlistId]
  );
  if (health.length && health[0].is_drm) {
    const err = new Error('DRM stream cannot be proxied');
    err.status = 403;
    throw err;
  }
}

/**
 * GET /api/stream/:channelId/master.m3u8?token=...&playlistId=N
 */
router.get('/:channelId/master.m3u8', asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { token, playlistId } = req.query;

  const payload = verifyStreamToken(token);
  if (!payload || payload.channelId !== channelId || String(payload.playlistId) !== String(playlistId)) {
    return res.status(401).json({ success: false, error: 'Invalid or expired stream token' });
  }

  const resolved = await resolveChannel(playlistId, channelId);
  if (!resolved) return res.status(404).json({ success: false, error: 'Channel not found' });

  const { channel } = resolved;
  if (urlHash(channel.url) !== payload.urlHash) {
    return res.status(403).json({ success: false, error: 'Token does not match channel' });
  }

  await assertChannelAccess(playlistId, channel);

  const headers = buildHeaders(channel);
  let manifestRes;
  try {
    manifestRes = await fetch(channel.url, {
      timeout: PROXY_TIMEOUT_MS,
      headers,
      maxBytes: 2097152,
    });
  } catch (err) {
    console.warn(`[StreamProxy] Manifest fetch failed: ${redactUrl(channel.url)}`);
    return res.status(502).json({ success: false, error: 'Failed to fetch stream manifest' });
  }

  const baseUrl = manifestRes.finalUrl || channel.url;
  const host = `${req.protocol}://${req.get('host')}`;

  const rewritten = rewriteManifest(manifestRes.data, baseUrl, (absoluteUrl) => {
    const segToken = issueStreamToken({
      channelId,
      playlistId: parseInt(playlistId, 10),
      urlHash: payload.urlHash,
      scope: 'segment',
      subPath: absoluteUrl,
    });
    const encoded = encodeURIComponent(absoluteUrl);
    return `${host}/api/stream/${channelId}/seg?token=${encodeURIComponent(segToken)}&u=${encoded}`;
  });

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.set('Cache-Control', 'no-cache');
  res.send(rewritten);
}));

/**
 * GET /api/stream/:channelId/seg?token=...&u=<encoded origin url>
 */
router.get('/:channelId/seg', asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { token, u } = req.query;

  const payload = verifyStreamToken(token);
  if (!payload || payload.channelId !== channelId || payload.scope !== 'segment') {
    return res.status(401).json({ success: false, error: 'Invalid segment token' });
  }

  const segmentUrl = payload.subPath || (u ? decodeURIComponent(u) : null);
  if (!segmentUrl) return res.status(400).json({ success: false, error: 'Missing segment URL' });

  const resolved = await resolveChannel(payload.playlistId, channelId);
  if (!resolved) return res.status(404).json({ success: false, error: 'Channel not found' });

  const { channel } = resolved;
  if (urlHash(channel.url) !== payload.urlHash) {
    return res.status(403).json({ success: false, error: 'Token mismatch' });
  }

  await assertChannelAccess(payload.playlistId, channel);

  const headers = buildHeaders(channel);
  const rangeHeader = req.headers.range;

  try {
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      const start = match ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : start + SEGMENT_MAX_BYTES - 1;

      const segRes = await fetchRange(segmentUrl, {
        timeout: PROXY_TIMEOUT_MS,
        headers,
        start,
        end: Math.min(end, start + SEGMENT_MAX_BYTES - 1),
        maxBytes: SEGMENT_MAX_BYTES,
      });

      res.status(segRes.status === 206 ? 206 : 200);
      if (segRes.headers['content-range']) res.set('Content-Range', segRes.headers['content-range']);
      if (segRes.headers['content-type']) res.set('Content-Type', segRes.headers['content-type']);
      else res.set('Content-Type', 'video/mp2t');
      res.set('Accept-Ranges', 'bytes');
      res.send(segRes.data);
    } else {
      const segRes = await fetchRange(segmentUrl, {
        timeout: PROXY_TIMEOUT_MS,
        headers,
        start: 0,
        end: SEGMENT_MAX_BYTES - 1,
        maxBytes: SEGMENT_MAX_BYTES,
      });
      if (segRes.headers['content-type']) res.set('Content-Type', segRes.headers['content-type']);
      else res.set('Content-Type', 'video/mp2t');
      res.set('Accept-Ranges', 'bytes');
      res.send(segRes.data);
    }
  } catch (err) {
    console.warn(`[StreamProxy] Segment fetch failed: ${redactUrl(segmentUrl)}`);
    res.status(502).json({ success: false, error: 'Failed to fetch segment' });
  }
}));

module.exports = router;
