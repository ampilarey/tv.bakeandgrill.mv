const crypto = require('crypto');
const express = require('express');
const { fetch, fetchRange, streamRange, redactUrl } = require('../utils/httpClient');
const { verifyToken: verifyStreamToken, issueStreamToken } = require('../utils/streamToken');
const { rewriteManifest, isHlsManifestContent, isHlsManifestBody } = require('../utils/hlsManifest');
const { buildOriginFetchHeaders, redactHostname } = require('../utils/streamProxyHeaders');
const { resolveChannel } = require('../utils/channelResolver');
const { getDatabase } = require('../database/init');
const { urlHash } = require('../services/channelDiagnosis');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const PROXY_TIMEOUT_MS = parseInt(process.env.STREAM_PROXY_TIMEOUT_MS || '15000', 10);
const SEGMENT_MAX_BYTES = parseInt(process.env.SEGMENT_MAX_BYTES || '52428800', 10);
const KEY_MAX_BYTES = parseInt(process.env.KEY_MAX_BYTES || '65536', 10);

function segmentUrlHash(absoluteUrl) {
  return crypto.createHash('sha256').update(absoluteUrl).digest('hex').slice(0, 32);
}

function newRequestId() {
  return crypto.randomUUID();
}

function buildProxySegUrl(req, channelId, playlistId, urlHashVal, absoluteUrl) {
  const host = `${req.protocol}://${req.get('host')}`;
  const segToken = issueStreamToken({
    channelId,
    playlistId: parseInt(playlistId, 10),
    urlHash: urlHashVal,
    scope: 'segment',
    segUrlHash: segmentUrlHash(absoluteUrl),
  });
  const u = encodeURIComponent(absoluteUrl);
  return `${host}/api/stream/${channelId}/seg?token=${encodeURIComponent(segToken)}&u=${u}`;
}

function logProxyEvent(requestId, fields) {
  console.info('[StreamProxy]', { requestId, ...fields });
}

function mapUpstreamErrorCode(err) {
  if (err.code === 'MAX_BYTES_EXCEEDED') return 'MAX_BYTES_EXCEEDED';
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return 'PROXY_TIMEOUT';
  if (err.code === 'PROXY_RUNTIME_ERROR') return 'PROXY_RUNTIME_ERROR';
  return 'SEGMENT_FETCH_FAILED';
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
  if (payload.scope !== 'segment') return null;

  if (u) {
    let decoded;
    try {
      decoded = decodeURIComponent(u);
    } catch {
      return null;
    }
    if (payload.segUrlHash) {
      return segmentUrlHash(decoded) === payload.segUrlHash ? decoded : null;
    }
    if (payload.subPath) {
      return decoded === payload.subPath ? decoded : null;
    }
    return decoded;
  }

  return payload.subPath || null;
}

function isOkStatus(status) {
  return status === 206 || (status >= 200 && status < 300);
}

async function shouldTreatSegAsManifest(segmentUrl, headers, rangeHeader) {
  if (isHlsManifestContent(null, segmentUrl)) return true;
  if (rangeHeader) return false;
  try {
    const peek = await fetchRange(segmentUrl, {
      headers,
      start: 0,
      end: 511,
      maxBytes: 512,
      timeout: PROXY_TIMEOUT_MS,
    });
    if (!isOkStatus(peek.statusCode ?? peek.status)) return false;
    return isHlsManifestBody(peek.data);
  } catch {
    return false;
  }
}

async function sendProxiedManifest(req, res, {
  requestId,
  channelId,
  playlistId,
  urlHashVal,
  manifestUrl,
  headers,
  stage = 'manifest',
}) {
  const started = Date.now();
  let manifestRes;
  try {
    manifestRes = await fetch(manifestUrl, {
      timeout: PROXY_TIMEOUT_MS,
      headers,
      maxBytes: 2097152,
    });
  } catch (err) {
    logProxyEvent(requestId, {
      stage,
      channelId,
      hostname: redactHostname(manifestUrl),
      statusCode: err.status || null,
      contentType: null,
      elapsedMs: Date.now() - started,
      code: err.code || 'MANIFEST_FETCH_FAILED',
    });
    throw err;
  }

  const statusCode = manifestRes.status;
  const contentType = manifestRes.headers?.['content-type'] || null;
  logProxyEvent(requestId, {
    stage,
    channelId,
    hostname: redactHostname(manifestUrl),
    statusCode,
    contentType,
    elapsedMs: Date.now() - started,
  });

  if (!isOkStatus(statusCode)) {
    const err = new Error(`Origin returned HTTP ${statusCode}`);
    err.status = statusCode;
    err.code = stage === 'nested_manifest' ? 'NESTED_PLAYLIST_FAILED' : 'MANIFEST_FETCH_FAILED';
    throw err;
  }

  if (!isHlsManifestBody(manifestRes.data)) {
    return res.status(502).json({
      success: false,
      error: 'Invalid stream manifest',
      code: 'MANIFEST_INVALID',
      requestId,
    });
  }

  const baseUrl = manifestRes.finalUrl || manifestUrl;
  const rewriteFn = (absoluteUrl) =>
    buildProxySegUrl(req, channelId, playlistId, urlHashVal, absoluteUrl);
  const rewritten = rewriteManifest(manifestRes.data, baseUrl, rewriteFn);

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.set('Cache-Control', 'no-store');
  return res.send(rewritten);
}

/**
 * GET /api/stream/:channelId/master.m3u8?token=...&playlistId=N
 */
router.get('/:channelId/master.m3u8', asyncHandler(async (req, res) => {
  const requestId = newRequestId();
  const { channelId } = req.params;
  const { token, playlistId } = req.query;

  const payload = verifyStreamToken(token);
  if (!payload || payload.channelId !== channelId || String(payload.playlistId) !== String(playlistId)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired stream token',
      code: 'TOKEN_EXPIRED',
      requestId,
    });
  }

  const resolved = await resolveChannel(playlistId, channelId);
  if (!resolved) return res.status(404).json({ success: false, error: 'Channel not found', requestId });

  const { channel } = resolved;
  if (urlHash(channel.url) !== payload.urlHash) {
    return res.status(403).json({ success: false, error: 'Token does not match channel', requestId });
  }

  await assertChannelAccess(playlistId, channel);

  const headers = buildOriginFetchHeaders(channel, { resourceType: 'manifest' });
  try {
    return await sendProxiedManifest(req, res, {
      requestId,
      channelId,
      playlistId,
      urlHashVal: payload.urlHash,
      manifestUrl: channel.url,
      headers,
      stage: 'manifest',
    });
  } catch (err) {
    const code = err.code === 'NESTED_PLAYLIST_FAILED'
      ? 'NESTED_PLAYLIST_FAILED'
      : err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
        ? 'PROXY_TIMEOUT'
        : 'MANIFEST_FETCH_FAILED';
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch stream manifest',
      code,
      requestId,
    });
  }
}));

/**
 * GET /api/stream/:channelId/seg?token=...&u=...
 */
router.get('/:channelId/seg', asyncHandler(async (req, res) => {
  const requestId = newRequestId();
  const { channelId } = req.params;
  const { token, u } = req.query;

  const payload = verifyStreamToken(token);
  if (!payload || payload.channelId !== channelId || payload.scope !== 'segment') {
    return res.status(401).json({
      success: false,
      error: 'Invalid segment token',
      code: 'TOKEN_EXPIRED',
      requestId,
    });
  }

  const segmentUrl = resolveSegmentUrl(payload, u);
  if (!segmentUrl) {
    return res.status(403).json({ success: false, error: 'Segment URL does not match token', requestId });
  }

  const resolved = await resolveChannel(payload.playlistId, channelId);
  if (!resolved) return res.status(404).json({ success: false, error: 'Channel not found', requestId });

  const { channel } = resolved;
  if (urlHash(channel.url) !== payload.urlHash) {
    return res.status(403).json({ success: false, error: 'Token mismatch', requestId });
  }

  await assertChannelAccess(payload.playlistId, channel);

  const rangeHeader = req.headers.range;
  const headers = buildOriginFetchHeaders(channel, {
    resourceType: rangeHeader ? 'range' : 'segment',
  });

  try {
    if (await shouldTreatSegAsManifest(segmentUrl, headers, rangeHeader)) {
      return await sendProxiedManifest(req, res, {
        requestId,
        channelId,
        playlistId: payload.playlistId,
        urlHashVal: payload.urlHash,
        manifestUrl: segmentUrl,
        headers: buildOriginFetchHeaders(channel, { resourceType: 'manifest' }),
        stage: 'nested_manifest',
      });
    }

    const looksLikeKey = /\.key(\?|$)/i.test(segmentUrl);
    const maxBytes = looksLikeKey ? KEY_MAX_BYTES : SEGMENT_MAX_BYTES;
    const started = Date.now();

    const result = await streamRange(segmentUrl, {
      headers,
      rangeHeader: rangeHeader || null,
      maxBytes,
      timeout: PROXY_TIMEOUT_MS,
      res,
    });

    logProxyEvent(requestId, {
      stage: 'segment',
      channelId,
      hostname: redactHostname(segmentUrl),
      statusCode: result?.status || res.statusCode,
      contentType: result?.contentType || null,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    logProxyEvent(requestId, {
      stage: 'segment',
      channelId,
      hostname: redactHostname(segmentUrl),
      statusCode: err.status || null,
      contentType: null,
      elapsedMs: null,
      code: mapUpstreamErrorCode(err),
    });
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: 'Failed to fetch segment',
        code: mapUpstreamErrorCode(err),
        requestId,
      });
    }
  }
}));

module.exports = router;
