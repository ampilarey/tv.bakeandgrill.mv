const crypto = require('crypto');
const { URL } = require('url');
const { fetch, fetchRange, redactUrl } = require('../utils/httpClient');
const {
  parseManifest, pickVariant, isHevcCodec, isUnsupportedAudio, isDrmKeyMethod, isHlsManifestContent,
} = require('../utils/hlsManifest');
const { getDatabase } = require('../database/init');

const DIAGNOSIS_VERSION = 1;
const PROBE_TIMEOUT_MS = parseInt(process.env.CHANNEL_PROBE_TIMEOUT_MS || '12000', 10);
const MANIFEST_MAX_BYTES = parseInt(process.env.MANIFEST_MAX_BYTES || '2097152', 10);

const REASON_CODES = new Set([
  'OFFLINE', 'TIMEOUT', 'HTTP_ERROR', 'REDIRECT_ERROR', 'MIXED_CONTENT_HTTP',
  'CORS_RISK', 'MANIFEST_INVALID', 'MANIFEST_OK_SEGMENT_FAIL', 'MEDIA_PLAYLIST_FAILED',
  'INIT_MAP_FAILED', 'ENCRYPTED_KEY_FETCH_FAILED', 'UNSUPPORTED_CODEC',
  'UNSUPPORTED_AUDIO', 'GEO_BLOCKED_OR_FORBIDDEN', 'EXPIRED_URL', 'REQUIRES_REFERRER',
  'REQUIRES_USER_AGENT', 'DRM_OR_PROTECTED_STREAM', 'PROXY_REQUIRED', 'RATE_LIMITED',
  'PLAYBACK_STALLED', 'SEGMENT_FETCH_FAILED', 'PROXY_RUNTIME_ERROR', 'PLAYBACK_START_TIMEOUT',
  'DIRECT_CORS_OR_NETWORK_FAILURE', 'PROXY_ORIGIN_FAILURE', 'MEDIA_CODEC_FAILURE',
  'ORIGIN_PROBE_FAILURE', 'UNKNOWN_ERROR',
]);

const REASON_MESSAGES = {
  OFFLINE: 'Stream offline',
  TIMEOUT: 'Stream offline',
  HTTP_ERROR: 'Stream offline',
  REDIRECT_ERROR: 'Stream offline',
  MIXED_CONTENT_HTTP: 'HTTP stream blocked',
  CORS_RISK: 'Stream blocked',
  MANIFEST_INVALID: 'Stream offline',
  MANIFEST_OK_SEGMENT_FAIL: 'Manifest loaded but video segments failed',
  MEDIA_PLAYLIST_FAILED: 'Stream offline',
  INIT_MAP_FAILED: 'Stream incompatible with this device',
  ENCRYPTED_KEY_FETCH_FAILED: 'Encrypted stream not supported',
  UNSUPPORTED_CODEC: 'Unsupported codec',
  UNSUPPORTED_AUDIO: 'Unsupported codec',
  GEO_BLOCKED_OR_FORBIDDEN: 'Stream blocked',
  EXPIRED_URL: 'Stream offline',
  REQUIRES_REFERRER: 'Stream blocked',
  REQUIRES_USER_AGENT: 'Stream blocked',
  DRM_OR_PROTECTED_STREAM: 'Stream blocked',
  PROXY_REQUIRED: 'HTTP stream blocked',
  RATE_LIMITED: 'Stream offline',
  PLAYBACK_STALLED: 'Playback stalled while loading video segments',
  SEGMENT_FETCH_FAILED: 'Stream started but next video segment failed',
  PROXY_RUNTIME_ERROR: 'Stream proxy failed',
  PLAYBACK_START_TIMEOUT: 'Playback did not start in time — tap play to retry',
  UNKNOWN_ERROR: 'Stream offline',
};

function isProbeSuccessStatus(status) {
  return status === 206 || (status >= 200 && status < 300);
}

function setFailure(d, stage, code, message) {
  d.failure_stage = stage;
  d.failure_reason_code = code;
  d.failure_message = message;
}

function urlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function isHlsUrl(url) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return String(url).toLowerCase().includes('.m3u8');
  }
}

const { buildOriginFetchHeaders } = require('../utils/streamProxyHeaders');

function buildFetchHeaders(channel) {
  return buildOriginFetchHeaders(channel, { resourceType: 'manifest' });
}

function emptyDiagnosis(channel, playlistId) {
  return {
    url_hash: urlHash(channel.url),
    playlist_id: playlistId,
    url: channel.url,
    channel_name: channel.name || null,
    original_url: channel.originalUrl || channel.url,
    final_url: null,
    status_code: null,
    content_type: null,
    is_hls: isHlsUrl(channel.url) ? 1 : 0,
    is_http: null,
    is_https: null,
    manifest_reachable: null,
    first_segment_reachable: null,
    segment_content_type: null,
    codec_video: null,
    codec_audio: null,
    requires_referrer: channel.requires_referrer || channel.httpReferrer ? 1 : 0,
    requires_user_agent: channel.requires_user_agent || channel.httpUserAgent ? 1 : 0,
    playable_ios: null,
    playable_android_chrome: null,
    playable_desktop_chrome: null,
    playable_tv_browser: null,
    failure_reason_code: null,
    failure_message: null,
    failure_stage: null,
    needs_proxy: 0,
    is_drm: 0,
    is_live: null,
    diagnosis_version: DIAGNOSIS_VERSION,
  };
}

function computePlayability(d) {
  const blocked =
    d.is_drm ||
    d.failure_reason_code === 'DRM_OR_PROTECTED_STREAM' ||
    d.failure_reason_code === 'ENCRYPTED_KEY_FETCH_FAILED' ||
    d.failure_reason_code === 'MANIFEST_INVALID' ||
    d.failure_reason_code === 'OFFLINE' ||
    d.failure_reason_code === 'TIMEOUT';

  const segmentOk = d.is_hls ? d.first_segment_reachable : d.manifest_reachable;
  const manifestOk = d.manifest_reachable;

  const hevc = isHevcCodec(d.codec_video);
  const badAudio = isUnsupportedAudio(d.codec_audio);

  const proxied = d.needs_proxy;
  const httpBlocked = d.is_http && !proxied;

  d.playable_ios = !blocked && manifestOk && segmentOk && !httpBlocked && !badAudio ? 1 : 0;
  d.playable_android_chrome = !blocked && manifestOk && segmentOk && !httpBlocked && !hevc && !badAudio ? 1 : 0;
  d.playable_desktop_chrome = !blocked && manifestOk && segmentOk && !httpBlocked && !badAudio ? 1 : 0;
  d.playable_tv_browser = d.playable_desktop_chrome;

  const anyPlayable =
    d.playable_ios || d.playable_android_chrome || d.playable_desktop_chrome;

  d.is_live = anyPlayable ? 1 : manifestOk === 0 || segmentOk === 0 ? 0 : null;

  if (!d.failure_reason_code && !anyPlayable) {
    if (hevc) {
      d.failure_reason_code = 'UNSUPPORTED_CODEC';
      d.failure_message = 'HEVC/H.265 codec may not play on all devices';
    } else if (badAudio) {
      d.failure_reason_code = 'UNSUPPORTED_AUDIO';
      d.failure_message = 'Audio codec not supported in browsers';
    } else if (httpBlocked) {
      d.failure_stage = d.failure_stage || 'proxy_required';
      d.failure_reason_code = 'PROXY_REQUIRED';
      d.failure_message = 'HTTP stream requires HTTPS proxy on this site';
    } else if (manifestOk && !segmentOk) {
      d.failure_reason_code = 'MANIFEST_OK_SEGMENT_FAIL';
      d.failure_message = 'Manifest loaded but first segment failed';
    }
  }

  return d;
}

function computeNeedsProxy(d, channel) {
  if (d.is_http) d.needs_proxy = 1;
  if (channel.httpReferrer || channel.requires_referrer) d.needs_proxy = 1;
  if (channel.httpUserAgent || channel.requires_user_agent) d.needs_proxy = 1;
  if (d.is_http && d.is_https === 0) d.needs_proxy = 1;
  return d;
}

function detectHlsFromProbe(d, url, body) {
  if (d.is_hls) return;
  if (isHlsManifestContent(d.content_type, url)) {
    d.is_hls = 1;
    return;
  }
  if (typeof body === 'string' && body.trim().startsWith('#EXTM3U')) {
    d.is_hls = 1;
  }
}

function computePlayStatus(d, override = {}) {
  if (override.is_hidden) return 'blocked';
  if (d.is_drm) return 'blocked';
  if (!d.last_checked && d.is_live === null) return 'needs_recheck';
  if (d.is_live === 1 && (d.playable_ios || d.playable_android_chrome || d.playable_desktop_chrome)) {
    return 'playable';
  }
  if (d.is_live === 0) return 'offline';
  if (d.failure_reason_code === 'UNSUPPORTED_CODEC' || d.failure_reason_code === 'UNSUPPORTED_AUDIO') {
    return 'unsupported';
  }
  if (d.failure_reason_code) return 'offline';
  return 'unknown';
}

/**
 * Deep probe a single channel.
 */
async function diagnoseChannel(channel, playlistId) {
  const d = emptyDiagnosis(channel, playlistId);

  if (channel.unsupported_protocol) {
    d.failure_reason_code = 'UNKNOWN_ERROR';
    d.failure_message = 'Unsupported stream protocol (only HTTP/HTTPS supported)';
    d.is_live = 0;
    return computePlayability(d);
  }

  let urlObj;
  try {
    urlObj = new URL(channel.url);
  } catch {
    d.failure_reason_code = 'UNKNOWN_ERROR';
    d.failure_message = 'Invalid stream URL';
    d.is_live = 0;
    return computePlayability(d);
  }

  d.is_http = urlObj.protocol === 'http:' ? 1 : 0;
  d.is_https = urlObj.protocol === 'https:' ? 1 : 0;
  computeNeedsProxy(d, channel);

  const headers = buildFetchHeaders(channel);

  try {
    const res = await fetch(channel.url, {
      timeout: PROBE_TIMEOUT_MS,
      headers,
      maxBytes: MANIFEST_MAX_BYTES,
      followRedirects: true,
    });

    d.final_url = res.finalUrl || channel.url;
    d.status_code = res.status;
    d.content_type = res.headers['content-type'] || null;

    detectHlsFromProbe(d, channel.url, res.data);
    if (d.is_hls) computeNeedsProxy(d, channel);

    if (d.is_hls) {
      const parsed = parseManifest(res.data, d.final_url);
      if (!parsed.valid) {
        d.manifest_reachable = 0;
        d.failure_reason_code = 'MANIFEST_INVALID';
        d.failure_message = 'Response is not a valid HLS manifest';
        d.is_live = 0;
        return computePlayability(d);
      }

      d.manifest_reachable = 1;

      if (parsed.hasDrm) {
        d.is_drm = 1;
        d.failure_reason_code = 'DRM_OR_PROTECTED_STREAM';
        d.failure_message = 'Protected/DRM stream cannot be proxied';
        d.is_live = 0;
        return computePlayability(d);
      }

      if (parsed.codecs.video) d.codec_video = parsed.codecs.video;
      if (parsed.codecs.audio) d.codec_audio = parsed.codecs.audio;

      let mediaUrl = d.final_url;
      let mediaBody = res.data;

      if (parsed.isMaster && parsed.variants.length > 0) {
        const variant = pickVariant(parsed.variants);
        mediaUrl = variant.uri;
        try {
          const mediaRes = await fetch(mediaUrl, {
            timeout: PROBE_TIMEOUT_MS,
            headers,
            maxBytes: MANIFEST_MAX_BYTES,
            followRedirects: true,
          });
          mediaBody = mediaRes.data;
          mediaUrl = mediaRes.finalUrl || mediaUrl;
        } catch (mediaErr) {
          setFailure(d, 'media_playlist', 'MEDIA_PLAYLIST_FAILED', 'Media playlist fetch failed');
          d.manifest_reachable = 1;
          d.is_live = 0;
          return computePlayability(d);
        }
        const mediaParsed = parseManifest(mediaBody, mediaUrl);
        if (mediaParsed.codecs.video) d.codec_video = mediaParsed.codecs.video;
        if (mediaParsed.codecs.audio) d.codec_audio = mediaParsed.codecs.audio;
        if (mediaParsed.hasDrm) {
          d.is_drm = 1;
          setFailure(d, 'key_fetch', 'DRM_OR_PROTECTED_STREAM', 'Protected/DRM stream cannot be proxied');
          d.is_live = 0;
          return computePlayability(d);
        }
        parsed.segments = mediaParsed.segments;
        parsed.maps = mediaParsed.maps;
        parsed.keys = mediaParsed.keys;

        for (const key of mediaParsed.keys || []) {
          if (isDrmKeyMethod(key.method)) {
            d.is_drm = 1;
            setFailure(d, 'key_fetch', 'DRM_OR_PROTECTED_STREAM', `DRM key method: ${key.method}`);
            d.is_live = 0;
            return computePlayability(d);
          }
          if (key.method === 'AES-128' && key.uri) {
            try {
              const keyRes = await fetchRange(key.uri, {
                timeout: PROBE_TIMEOUT_MS,
                headers,
                start: 0,
                end: 4095,
                maxBytes: 4096,
              });
              if (!isProbeSuccessStatus(keyRes.status)) {
                setFailure(d, 'key_fetch', 'ENCRYPTED_KEY_FETCH_FAILED', `Key URL returned HTTP ${keyRes.status}`);
                d.is_live = 0;
                return computePlayability(d);
              }
            } catch {
              setFailure(d, 'key_fetch', 'ENCRYPTED_KEY_FETCH_FAILED', 'AES-128 key fetch failed');
              d.is_live = 0;
              return computePlayability(d);
            }
          }
        }

        if (mediaParsed.maps?.length) {
          try {
            const mapRes = await fetchRange(mediaParsed.maps[0], {
              timeout: PROBE_TIMEOUT_MS,
              headers,
              start: 0,
              end: 8191,
            });
            if (!isProbeSuccessStatus(mapRes.status)) {
              setFailure(d, 'init_map', 'INIT_MAP_FAILED', `Init map returned HTTP ${mapRes.status}`);
              d.is_live = 0;
              return computePlayability(d);
            }
          } catch {
            setFailure(d, 'init_map', 'INIT_MAP_FAILED', 'Init map segment fetch failed');
            d.is_live = 0;
            return computePlayability(d);
          }
        }
      } else {
        parsed.segments = parsed.segments.length ? parsed.segments : [];
        parsed.maps = parsed.maps || [];
        parsed.keys = parsed.keys || [];
      }

      const segmentUrl = parsed.segments[0];
      if (!segmentUrl) {
        d.first_segment_reachable = 0;
        setFailure(d, 'segment', 'MANIFEST_OK_SEGMENT_FAIL', 'No segments found in media playlist');
        d.is_live = 0;
        return computePlayability(d);
      }

      try {
        const segRes = await fetchRange(segmentUrl, {
          timeout: PROBE_TIMEOUT_MS,
          headers,
          start: 0,
          end: 8191,
        });
        d.first_segment_reachable = isProbeSuccessStatus(segRes.status) ? 1 : 0;
        d.segment_content_type = segRes.headers['content-type'] || null;
        if (!d.first_segment_reachable) {
          setFailure(d, 'segment', 'MANIFEST_OK_SEGMENT_FAIL', `First segment returned HTTP ${segRes.status}`);
          d.is_live = 0;
        }
      } catch (segErr) {
        d.first_segment_reachable = 0;
        setFailure(d, 'segment', 'MANIFEST_OK_SEGMENT_FAIL', 'First segment fetch failed');
        d.is_live = 0;
      }
    } else {
      d.manifest_reachable = 1;
      const ct = (d.content_type || '').toLowerCase();
      const looksLikeVideo = ct.includes('video') || ct.includes('octet-stream') || ct.includes('mp2t');
      d.first_segment_reachable = looksLikeVideo ? 1 : null;
      if (!looksLikeVideo && ct.includes('text/html')) {
        d.failure_reason_code = 'HTTP_ERROR';
        d.failure_message = 'URL returned HTML instead of video';
        d.is_live = 0;
      }
    }
  } catch (err) {
    const code = err.code;
    const status = err.response?.status;

    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      d.failure_reason_code = 'TIMEOUT';
      d.failure_message = 'Stream probe timed out';
    } else if (code === 'REDIRECT_ERROR') {
      d.failure_reason_code = 'REDIRECT_ERROR';
      d.failure_message = 'Too many redirects';
    } else if (code === 'MAX_BYTES_EXCEEDED') {
      d.failure_reason_code = 'MANIFEST_INVALID';
      d.failure_message = 'Response too large';
    } else if (status === 403 || status === 451) {
      d.failure_reason_code = 'GEO_BLOCKED_OR_FORBIDDEN';
      d.failure_message = `Stream forbidden (HTTP ${status})`;
      d.status_code = status;
    } else if (status === 401 || status === 410) {
      d.failure_reason_code = status === 410 ? 'EXPIRED_URL' : 'GEO_BLOCKED_OR_FORBIDDEN';
      d.failure_message = `Stream returned HTTP ${status}`;
      d.status_code = status;
    } else if (status === 429) {
      setFailure(d, 'rate_limited', 'RATE_LIMITED', 'Upstream rate limited (HTTP 429)');
      d.status_code = status;
    } else if (status) {
      setFailure(d, 'manifest', 'HTTP_ERROR', `Stream returned HTTP ${status}`);
      d.status_code = status;
    } else {
      setFailure(d, 'manifest', 'OFFLINE', 'Stream unreachable');
    }

    d.manifest_reachable = 0;
    d.is_live = 0;
    console.warn(`[Diagnosis] Probe failed for ${redactUrl(channel.url)}: ${d.failure_message}`);
  }

  if (channel.httpReferrer && !d.failure_reason_code) {
    d.requires_referrer = 1;
  }
  if (channel.httpUserAgent && !d.failure_reason_code) {
    d.requires_user_agent = 1;
  }

  computeNeedsProxy(d, channel);
  return computePlayability(d);
}

async function persistDiagnosis(d) {
  const db = getDatabase();
  const live = d.is_live;
  const failInc = live === 1 ? 0 : 1;

  await db.query(
    `INSERT INTO channel_health (
      url_hash, playlist_id, url, channel_name, is_live, last_checked,
      consecutive_failures, last_seen_live,
      original_url, final_url, status_code, content_type,
      is_hls, is_http, is_https, manifest_reachable, first_segment_reachable,
      segment_content_type, codec_video, codec_audio,
      requires_referrer, requires_user_agent,
      playable_ios, playable_android_chrome, playable_desktop_chrome, playable_tv_browser,
      failure_reason_code, failure_message, failure_stage, needs_proxy, is_drm, diagnosis_version
    ) VALUES (
      ?, ?, ?, ?, ?, NOW(),
      ?, IF(? = 1, NOW(), NULL),
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
    ON DUPLICATE KEY UPDATE
      channel_name = VALUES(channel_name),
      is_live = VALUES(is_live),
      last_checked = NOW(),
      consecutive_failures = IF(VALUES(is_live) = 1, 0, consecutive_failures + 1),
      last_seen_live = IF(VALUES(is_live) = 1, NOW(), last_seen_live),
      original_url = VALUES(original_url),
      final_url = VALUES(final_url),
      status_code = VALUES(status_code),
      content_type = VALUES(content_type),
      is_hls = VALUES(is_hls),
      is_http = VALUES(is_http),
      is_https = VALUES(is_https),
      manifest_reachable = VALUES(manifest_reachable),
      first_segment_reachable = VALUES(first_segment_reachable),
      segment_content_type = VALUES(segment_content_type),
      codec_video = VALUES(codec_video),
      codec_audio = VALUES(codec_audio),
      requires_referrer = VALUES(requires_referrer),
      requires_user_agent = VALUES(requires_user_agent),
      playable_ios = VALUES(playable_ios),
      playable_android_chrome = VALUES(playable_android_chrome),
      playable_desktop_chrome = VALUES(playable_desktop_chrome),
      playable_tv_browser = VALUES(playable_tv_browser),
      failure_reason_code = VALUES(failure_reason_code),
      failure_message = VALUES(failure_message),
      failure_stage = VALUES(failure_stage),
      needs_proxy = VALUES(needs_proxy),
      is_drm = VALUES(is_drm),
      diagnosis_version = VALUES(diagnosis_version)`,
    [
      d.url_hash, d.playlist_id, d.url, d.channel_name, live,
      failInc, live,
      d.original_url, d.final_url, d.status_code, d.content_type,
      d.is_hls, d.is_http, d.is_https, d.manifest_reachable, d.first_segment_reachable,
      d.segment_content_type, d.codec_video, d.codec_audio,
      d.requires_referrer, d.requires_user_agent,
      d.playable_ios, d.playable_android_chrome, d.playable_desktop_chrome, d.playable_tv_browser,
      d.failure_reason_code, d.failure_message, d.failure_stage, d.needs_proxy, d.is_drm, d.diagnosis_version,
    ]
  );

  return d;
}

async function diagnoseAndPersist(channel, playlistId) {
  const result = await diagnoseChannel(channel, playlistId);
  await persistDiagnosis(result);
  return result;
}

module.exports = {
  diagnoseChannel,
  diagnoseAndPersist,
  persistDiagnosis,
  computePlayStatus,
  computeNeedsProxy,
  urlHash,
  REASON_CODES,
  REASON_MESSAGES,
  isHlsUrl,
  isProbeSuccessStatus,
  DIAGNOSIS_VERSION,
};
