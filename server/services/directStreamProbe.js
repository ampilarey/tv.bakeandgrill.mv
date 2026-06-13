const { fetch, fetchRange, redactUrl } = require('../utils/httpClient');
const { buildOriginFetchHeaders } = require('../utils/streamProxyHeaders');
const { parseManifest, isHlsManifestBody } = require('../utils/hlsManifest');
const { classifyPlaylistContent, isHlsPlaylistType } = require('../utils/playlistClassifier');
const { detectStreamType } = require('./directChannelService');

const PROBE_MAX_BYTES = parseInt(process.env.DIRECT_STREAM_PROBE_MAX_BYTES || '2097152', 10);
const PROBE_TIMEOUT_MS = parseInt(process.env.DIRECT_STREAM_PROBE_TIMEOUT_MS || '12000', 10);

function mapProbeError(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return { safe_error_code: 'ORIGIN_TIMEOUT', safe_message: 'The stream server did not respond in time.' };
  }
  if (err.status === 403 || err.status === 401) {
    return { safe_error_code: 'GEO_BLOCKED_OR_FORBIDDEN', safe_message: 'The stream server denied access.' };
  }
  if (/private|reserved|blocked/i.test(err.message || '')) {
    return { safe_error_code: 'PRIVATE_ADDRESS_BLOCKED', safe_message: 'This URL points to a blocked network address.' };
  }
  if (err.status >= 400) {
    return { safe_error_code: 'HTTP_ERROR', safe_message: `The stream server returned HTTP ${err.status}.` };
  }
  return { safe_error_code: 'UNKNOWN_ERROR', safe_message: 'Could not reach the stream URL.' };
}

/**
 * Probe a direct stream URL without saving.
 */
async function probeDirectStream({ url, httpUserAgent = null, httpReferer = null }) {
  const started = Date.now();
  const channel = { httpUserAgent, httpReferrer: httpReferer };
  const headers = buildOriginFetchHeaders(channel, { resourceType: 'manifest' });

  const result = {
    detected_type: detectStreamType(url),
    origin_status: null,
    manifest_valid: false,
    master_or_media: null,
    variant_count: 0,
    encrypted: false,
    drm_detected: false,
    first_segment_reachable: null,
    detected_codecs: null,
    browser_compatibility_risk: false,
    direct_playback_risk: false,
    proxy_recommended: false,
    response_time_ms: null,
    safe_error_code: null,
    safe_message: null,
    classification: null,
  };

  try {
    const res = await fetch(url, {
      headers,
      timeout: PROBE_TIMEOUT_MS,
      maxBytes: PROBE_MAX_BYTES,
      followRedirects: true,
    });

    result.origin_status = res.status;
    result.response_time_ms = Date.now() - started;
    const body = typeof res.data === 'string' ? res.data : String(res.data || '');

    if (res.status < 200 || res.status >= 400) {
      result.safe_error_code = 'HTTP_ERROR';
      result.safe_message = `The stream server returned HTTP ${res.status}.`;
      return result;
    }

    result.classification = classifyPlaylistContent(body, res.finalUrl || url);
    result.manifest_valid = isHlsManifestBody(body);

    if (isHlsPlaylistType(result.classification.type)) {
      result.detected_type = 'hls';
      result.master_or_media = result.classification.type === 'hls_master' ? 'master' : 'media';
      result.direct_playback_risk = true;
      result.browser_compatibility_risk = true;
      result.proxy_recommended = true;

      const parsed = parseManifest(body, res.finalUrl || url);
      result.variant_count = parsed.variants?.length || 0;
      result.encrypted = !!(parsed.keys?.length);
      result.drm_detected = parsed.keys?.some((k) => k.method && k.method !== 'NONE' && k.method !== 'AES-128') || false;

      if (parsed.variants?.length) {
        const codecs = parsed.variants
          .map((v) => v.streamInf?.CODECS)
          .filter(Boolean);
        result.detected_codecs = codecs.length ? codecs.join('; ') : null;
      }

      const segUrl = parsed.segments?.[0] || parsed.variants?.[0]?.uri;
      if (segUrl) {
        try {
          const segRes = await fetchRange(segUrl, {
            headers: buildOriginFetchHeaders(channel, { resourceType: 'segment' }),
            start: 0,
            end: 1023,
            maxBytes: 1024,
            timeout: PROBE_TIMEOUT_MS,
          });
          result.first_segment_reachable = segRes.status === 200 || segRes.status === 206;
        } catch {
          result.first_segment_reachable = false;
        }
      }

      result.safe_message = result.master_or_media === 'master'
        ? 'Detected one HLS master playlist (single stream).'
        : 'Detected one HLS media playlist (single stream).';
      return result;
    }

    if (result.classification.type === 'iptv_m3u') {
      result.safe_error_code = 'MANIFEST_INVALID';
      result.safe_message = 'This URL is a multi-channel IPTV playlist, not a single direct stream.';
      return result;
    }

    const lower = url.toLowerCase();
    if (/\.(mp4|webm|mov)(\?|#|$)/i.test(lower)) {
      result.detected_type = 'mp4';
      result.manifest_valid = true;
      result.safe_message = 'Detected progressive video stream.';
      return result;
    }

    result.safe_error_code = 'MANIFEST_INVALID';
    result.safe_message = 'Could not recognize a valid HLS or video stream at this URL.';
    return result;
  } catch (err) {
    result.response_time_ms = Date.now() - started;
    const mapped = mapProbeError(err);
    result.safe_error_code = mapped.safe_error_code;
    result.safe_message = mapped.safe_message;
    console.warn('[directStreamProbe] Probe failed', { url: redactUrl(url), code: err.code });
    return result;
  }
}

module.exports = { probeDirectStream, PROBE_MAX_BYTES, PROBE_TIMEOUT_MS };
