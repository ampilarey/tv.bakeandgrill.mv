const crypto = require('crypto');

const TTL_SEC = parseInt(process.env.STREAM_TOKEN_TTL_SEC || '600', 10);

function getSecret() {
  return process.env.STREAM_TOKEN_SECRET || process.env.JWT_SECRET;
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signPayload(payload) {
  const secret = getSecret();
  if (!secret) throw new Error('STREAM_TOKEN_SECRET or JWT_SECRET required');
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const secret = getSecret();
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
  if (parts[1].length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]))) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Issue a short-lived stream access token.
 */
function issueStreamToken({ channelId, playlistId, urlHash, scope = 'master', subPath = '' }) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  return signPayload({ channelId, playlistId, urlHash, scope, subPath, exp });
}

function buildPlaybackProxyUrl(channelId, playlistId, urlHash, req) {
  const token = issueStreamToken({ channelId, playlistId, urlHash, scope: 'master' });
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/stream/${channelId}/master.m3u8?token=${encodeURIComponent(token)}&playlistId=${playlistId}`;
}

module.exports = {
  issueStreamToken,
  verifyToken,
  buildPlaybackProxyUrl,
  TTL_SEC,
};
