const { URL } = require('url');

const URI_ATTR_TAGS = [
  '#EXT-X-KEY:',
  '#EXT-X-SESSION-KEY:',
  '#EXT-X-MAP:',
  '#EXT-X-MEDIA:',
  '#EXT-X-I-FRAME-STREAM-INF:',
  '#EXT-X-PART:',
  '#EXT-X-PRELOAD-HINT:',
];

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
    keys: [],
    maps: [],
    mediaRenditions: [],
    parts: [],
    codecs: { video: null, audio: null },
    version: null,
  };

  if (!body.trim().startsWith('#EXTM3U')) {
    return { ...result, valid: false };
  }

  let pendingStreamInf = null;

  for (const line of lines) {
    if (line.startsWith('#EXT-X-VERSION:')) {
      result.version = parseInt(line.split(':')[1], 10);
    }

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      pendingStreamInf = parseAttributes(line.substring('#EXT-X-STREAM-INF:'.length));
      result.isMaster = true;
      const currentVariant = { streamInf: pendingStreamInf, uri: null };
      if (pendingStreamInf.CODECS) {
        const codecs = pendingStreamInf.CODECS.split(',').map((c) => c.trim());
        result.codecs.video = codecs.find((c) => /avc|hev|hvc|vp9|av01/i.test(c)) || codecs[0];
        result.codecs.audio = codecs.find((c) => /mp4a|aac|ac-3|ec-3/i.test(c)) || codecs[1];
      }
      result.variants.push(currentVariant);
    } else if (pendingStreamInf && !line.startsWith('#')) {
      result.variants[result.variants.length - 1].uri = resolveUri(line, baseUrl);
      pendingStreamInf = null;
    }

    if (line.startsWith('#EXT-X-KEY:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-KEY:'.length));
      const method = (attrs.METHOD || 'NONE').toUpperCase();
      if (method !== 'NONE') {
        if (isDrmKeyMethod(method)) {
          result.hasDrm = true;
          result.drmMethods.push(method);
        }
        if (attrs.URI) {
          result.keys.push({ method, uri: resolveUri(attrs.URI, baseUrl), attrs });
        }
      }
    }

    if (line.startsWith('#EXT-X-MAP:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-MAP:'.length));
      if (attrs.URI) result.maps.push(resolveUri(attrs.URI, baseUrl));
    }

    if (line.startsWith('#EXT-X-MEDIA:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-MEDIA:'.length));
      if (attrs.URI) result.mediaRenditions.push({ type: attrs.TYPE, uri: resolveUri(attrs.URI, baseUrl) });
    }

    if (line.startsWith('#EXT-X-PART:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-PART:'.length));
      if (attrs.URI) result.parts.push(resolveUri(attrs.URI, baseUrl));
    }

    if (line.startsWith('#EXTINF:')) {
      result.isMedia = true;
    } else if (result.isMedia && !line.startsWith('#')) {
      result.segments.push(resolveUri(line, baseUrl));
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

function isDrmKeyMethod(method) {
  const m = (method || '').toUpperCase();
  if (m === 'AES-128') return false;
  if (m === 'NONE') return false;
  return true; // SAMPLE-AES, FairPlay, etc.
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

function rewriteUriInAttributes(attrStr, baseUrl, rewriteFn) {
  const attrs = parseAttributes(attrStr);
  let out = attrStr;
  if (attrs.URI) {
    const absolute = resolveUri(attrs.URI, baseUrl);
    const proxied = rewriteFn(absolute);
    const quoted = `"${proxied.replace(/"/g, '%22')}"`;
    out = out.replace(/URI=("([^"]*)"|([^,]*))/, `URI=${quoted}`);
  }
  return out;
}

function rewriteTagUriAttributes(line, baseUrl, rewriteFn) {
  const trimmed = line.trim();
  for (const prefix of URI_ATTR_TAGS) {
    if (!trimmed.startsWith(prefix)) continue;
    const attrStr = trimmed.substring(prefix.length);

    if (prefix === '#EXT-X-KEY:' || prefix === '#EXT-X-SESSION-KEY:') {
      const attrs = parseAttributes(attrStr);
      const method = (attrs.METHOD || 'NONE').toUpperCase();
      if (method === 'NONE') return line;
      if (isDrmKeyMethod(method)) return line;
      if (method === 'AES-128' && attrs.URI) {
        const rewritten = rewriteUriInAttributes(attrStr, baseUrl, rewriteFn);
        return line.replace(trimmed, `${prefix}${rewritten}`);
      }
      return line;
    }

    if (attrsHaveUri(attrStr)) {
      const rewritten = rewriteUriInAttributes(attrStr, baseUrl, rewriteFn);
      return line.replace(trimmed, `${prefix}${rewritten}`);
    }
  }
  return line;
}

function attrsHaveUri(attrStr) {
  return /URI=/i.test(attrStr);
}

/**
 * Rewrite manifest URLs to proxied paths.
 */
function rewriteManifest(body, baseUrl, rewriteFn) {
  const lines = body.split('\n');
  const out = [];
  let isNextUri = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      const tagRewritten = rewriteTagUriAttributes(line, baseUrl, rewriteFn);
      if (tagRewritten !== line) {
        out.push(tagRewritten);
        isNextUri = false;
        continue;
      }
    }

    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      isNextUri = true;
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#EXT-X-I-FRAME-STREAM-INF:') && !/URI=/i.test(trimmed)) {
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

function isHlsManifestBody(body) {
  if (body == null) return false;
  const text = Buffer.isBuffer(body) ? body.toString('utf8', 0, Math.min(body.length, 512)) : String(body);
  return text.trimStart().startsWith('#EXTM3U');
}

function isHlsManifestContent(contentType, url) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('mpegurl') || ct.includes('m3u8')) return true;
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();
    if (p.endsWith('.m3u8') || p.endsWith('.m3u')) return true;
    const q = u.search.toLowerCase();
    return q.includes('m3u8') || q.includes('.m3u');
  } catch {
    const lower = (url || '').toLowerCase();
    return lower.includes('.m3u8') || lower.includes('.m3u');
  }
}

module.exports = {
  parseManifest,
  pickVariant,
  isHevcCodec,
  isUnsupportedAudio,
  rewriteManifest,
  resolveUri,
  parseAttributes,
  isDrmKeyMethod,
  isHlsManifestContent,
  isHlsManifestBody,
};
