const { URL } = require('url');

/**
 * Parse HLS manifest text into structured info.
 */
function parseManifest(body, baseUrl) {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const result = {
    isMaster: false,
    isMedia: false,
    hasDrm: false,
    drmMethods: [],
    variants: [],
    segments: [],
    codecs: { video: null, audio: null },
    version: null,
  };

  if (!body.trim().startsWith('#EXTM3U')) {
    return { ...result, valid: false };
  }

  let currentVariant = null;
  let pendingStreamInf = null;

  for (const line of lines) {
    if (line.startsWith('#EXT-X-VERSION:')) {
      result.version = parseInt(line.split(':')[1], 10);
    }

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      pendingStreamInf = parseAttributes(line.substring('#EXT-X-STREAM-INF:'.length));
      result.isMaster = true;
      currentVariant = { streamInf: pendingStreamInf, uri: null };
      if (pendingStreamInf.CODECS) {
        const codecs = pendingStreamInf.CODECS.split(',').map((c) => c.trim());
        result.codecs.video = codecs.find((c) => /avc|hev|hvc|vp9|av01/i.test(c)) || codecs[0];
        result.codecs.audio = codecs.find((c) => /mp4a|aac|ac-3|ec-3/i.test(c)) || codecs[1];
      }
    } else if (pendingStreamInf && !line.startsWith('#')) {
      currentVariant.uri = resolveUri(line, baseUrl);
      result.variants.push(currentVariant);
      pendingStreamInf = null;
      currentVariant = null;
    }

    if (line.startsWith('#EXT-X-KEY:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-KEY:'.length));
      const method = (attrs.METHOD || 'NONE').toUpperCase();
      if (method !== 'NONE') {
        result.hasDrm = true;
        result.drmMethods.push(method);
      }
    }

    if (line.startsWith('#EXTINF:')) {
      result.isMedia = true;
    } else if (result.isMedia && !line.startsWith('#')) {
      result.segments.push(resolveUri(line, baseUrl));
    }

    if (line.startsWith('#EXT-X-STREAM-INF:') === false && line.startsWith('#EXTINF:')) {
      result.isMedia = true;
    }
  }

  if (result.variants.length === 0 && result.segments.length > 0) {
    result.isMedia = true;
  }

  result.valid = true;
  return result;
}

function parseAttributes(attrStr) {
  const attrs = {};
  const regex = /([A-Z0-9-]+)=("([^"]*)"|([^,]*))/gi;
  let m;
  while ((m = regex.exec(attrStr)) !== null) {
    attrs[m[1]] = m[3] !== undefined ? m[3] : m[4];
  }
  return attrs;
}

function resolveUri(uri, baseUrl) {
  try {
    if (/^https?:\/\//i.test(uri)) return uri;
    if (baseUrl) return new URL(uri, baseUrl).toString();
    return uri;
  } catch {
    return uri;
  }
}

function pickVariant(variants) {
  if (!variants.length) return null;
  return variants.reduce((lowest, v) => {
    const bw = parseInt(v.streamInf?.BANDWIDTH || '999999999', 10);
    const lowBw = parseInt(lowest.streamInf?.BANDWIDTH || '999999999', 10);
    return bw < lowBw ? v : lowest;
  });
}

function isHevcCodec(codec) {
  if (!codec) return false;
  return /hev1|hvc1|hev|hvc/i.test(codec);
}

function isUnsupportedAudio(codec) {
  if (!codec) return false;
  return /ac-3|ec-3|eac3|dts/i.test(codec);
}

/**
 * Rewrite manifest URLs to proxied paths.
 * @param {string} body - Original manifest
 * @param {string} baseUrl - Origin manifest URL
 * @param {function} rewriteFn - (absoluteUrl) => proxied path string
 */
function rewriteManifest(body, baseUrl, rewriteFn) {
  const lines = body.split('\n');
  const out = [];
  let isNextUri = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXT-X-KEY:')) {
      const attrs = parseAttributes(trimmed.substring('#EXT-X-KEY:'.length));
      const method = (attrs.METHOD || 'NONE').toUpperCase();
      if (method !== 'NONE') {
        out.push(line);
        continue;
      }
    }

    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      isNextUri = true;
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#EXTINF:')) {
      isNextUri = true;
      out.push(line);
      continue;
    }

    if (isNextUri && trimmed && !trimmed.startsWith('#')) {
      const absolute = resolveUri(trimmed, baseUrl);
      out.push(rewriteFn(absolute));
      isNextUri = false;
      continue;
    }

    isNextUri = false;
    out.push(line);
  }

  return out.join('\n');
}

module.exports = {
  parseManifest,
  pickVariant,
  isHevcCodec,
  isUnsupportedAudio,
  rewriteManifest,
  resolveUri,
  parseAttributes,
};
