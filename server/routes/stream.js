const express = require('express');
const { fetch, streamRange } = require('../utils/httpClient');
const { verifyToken: verifyStreamToken, issueStreamToken } = require('../utils/streamToken');
const { rewriteManifest, isHlsManifestContent } = require('../utils/hlsManifest');
const { resolveChannel } = require('../utils/channelResolver');
const { getDatabase } = require('../database/init');
const { urlHash } = require('../services/channelDiagnosis');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const PROXY_TIMEOUT_MS = parseInt(process.env.STREAM_PROXY_TIMEOUT_MS || '15000', 10);
const SEGMENT_MAX_BYTES = parseInt(process.env.SEGMENT_MAX_BYTES || '10485760', 10);
const KEY_MAX_BYTES = parseInt(process.env.KEY_MAX_BYTES || '65536', 10);

function buildHeaders(channel) {
  const headers = { 'User-Agent': 'BakeGrillTV/1.0' };
  if (channel.httpUserAgent) headers['User-Agent'] = channel.httpUserAgent;
  if (channel.httpReferrer) headers['Referer'] = channel.httpReferrer;
  return headers;
}

function buildProxySegUrl(req, channelId, playlistId, urlHashVal, absoluteUrl) {
  const host = `${req.protocol}://${req.get('host')}`;
  const segToken = issueStreamToken({
    channelId,
    playlistId: parseInt(playlistId, 10),
    urlHash: urlHashVal,
    scope: 'segment',
    subPath: absoluteUrl,
  });
  return `${host}/api/stream/${channelId}/seg?token=${encodeURIComponent(segToken)}`;
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

function resolveSegmentUrl(payload, u) {
  if (!payload.subPath) return null;
  if (u) {
    const decoded = decodeURIComponent(u);
    if (decoded !== payload.subPath) return null;
  }
  return payload.subPath;
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
    console.warn('[StreamProxy] Manifest fetch failed');
    return res.status(502).json({ success: false, error: 'Failed to fetch stream manifest' });
  }

  const baseUrl = manifestRes.finalUrl || channel.url;
  const rewriteFn = (absoluteUrl) =>
    buildProxySegUrl(req, channelId, playlistId, payload.urlHash, absoluteUrl);

  const rewritten = rewriteManifest(manifestRes.data, baseUrl, rewriteFn);

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.set('Cache-Control', 'no-store');
  res.send(rewritten);
}));

/**
 * GET /api/stream/:channelId/seg?token=...
 */
router.get('/:channelId/seg', asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { token, u } = req.query;

  const payload = verifyStreamToken(token);
  if (!payload || payload.channelId !== channelId || payload.scope !== 'segment') {
    return res.status(401).json({ success: false, error: 'Invalid segment token' });
  }

  const segmentUrl = resolveSegmentUrl(payload, u);
  if (!segmentUrl) {
    return res.status(403).json({ success: false, error: 'Segment URL does not match token' });
  }

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
    if (isHlsManifestContent(null, segmentUrl)) {
      const manifestRes = await fetch(segmentUrl, {
        timeout: PROXY_TIMEOUT_MS,
        headers,
        maxBytes: 2097152,
      });
      const baseUrl = manifestRes.finalUrl || segmentUrl;
      const rewriteFn = (absoluteUrl) =>
        buildProxySegUrl(req, channelId, payload.playlistId, payload.urlHash, absoluteUrl);
      const rewritten = rewriteManifest(manifestRes.data, baseUrl, rewriteFn);
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.set('Cache-Control', 'no-store');
      return res.send(rewritten);
    }

    const looksLikeKey = /\.key(\?|$)/i.test(segmentUrl) || (segmentUrl.includes('key') && !/\.(ts|m4s|mp4)(\?|$)/i.test(segmentUrl));
    const maxBytes = looksLikeKey ? KEY_MAX_BYTES : SEGMENT_MAX_BYTES;

    let upstreamRange = rangeHeader;
    if (!upstreamRange && !looksLikeKey) {
      upstreamRange = `bytes=0-${SEGMENT_MAX_BYTES - 1}`;
    }

    await streamRange(segmentUrl, {
      headers,
      rangeHeader: upstreamRange,
      maxBytes,
      timeout: PROXY_TIMEOUT_MS,
      res,
    });
  } catch (err) {
    console.warn('[StreamProxy] Segment stream failed');
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: 'Failed to fetch segment' });
    }
  }
}));

module.exports = router;
