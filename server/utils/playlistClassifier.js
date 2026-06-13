const { isHlsManifestBody } = require('./hlsManifest');

const HLS_TAGS = [
  '#EXT-X-TARGETDURATION',
  '#EXT-X-MEDIA-SEQUENCE',
  '#EXT-X-STREAM-INF',
  '#EXT-X-I-FRAME-STREAM-INF',
  '#EXT-X-MEDIA:',
  '#EXT-X-VERSION',
  '#EXT-X-ENDLIST',
  '#EXT-X-KEY:',
  '#EXT-X-MAP:',
  '#EXT-X-SESSION-KEY:',
];

const IPTV_ATTRS = ['tvg-id=', 'tvg-name=', 'group-title=', 'tvg-logo='];

function hasIptvChannelMetadata(text) {
  if (IPTV_ATTRS.some((a) => text.includes(a))) return true;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('#EXTINF:')) continue;
    const content = line.substring(8);
    const commaIdx = content.lastIndexOf(',');
    if (commaIdx === -1) continue;
    const title = content.substring(commaIdx + 1).trim();
    if (title && !title.includes('="') && !/^[\d.]+$/.test(title)) {
      return true;
    }
  }
  return false;
}

function countHlsTags(text) {
  let count = 0;
  for (const tag of HLS_TAGS) {
    if (text.includes(tag)) count += 1;
  }
  return count;
}

function hasSegmentOnlyExtinf(text) {
  const lines = text.split(/\r?\n/);
  let extinfCount = 0;
  let titledExtinf = 0;
  for (const line of lines) {
    if (!line.startsWith('#EXTINF:')) continue;
    extinfCount += 1;
    const content = line.substring(8);
    const commaIdx = content.lastIndexOf(',');
    const title = commaIdx >= 0 ? content.substring(commaIdx + 1).trim() : '';
    if (title && !/^[\d.]+$/.test(title) && !title.includes('="')) {
      titledExtinf += 1;
    }
  }
  return extinfCount > 0 && titledExtinf === 0;
}

/**
 * Classify fetched playlist body as IPTV channel list vs HLS manifest.
 * @returns {{ type: 'iptv_m3u'|'hls_master'|'hls_media'|'invalid', confidence: string, hints: string[] }}
 */
function classifyPlaylistContent(body, url = '') {
  const hints = [];
  const text = typeof body === 'string' ? body : String(body || '');
  const trimmed = text.trim();

  if (!trimmed || !trimmed.startsWith('#EXTM3U')) {
    if (trimmed.toLowerCase().includes('<html')) hints.push('html_response');
    return { type: 'invalid', confidence: 'high', hints };
  }

  if (!isHlsManifestBody(trimmed) && !trimmed.includes('#EXTINF')) {
    return { type: 'invalid', confidence: 'medium', hints: ['not_extm3u_body'] };
  }

  const hlsTagCount = countHlsTags(trimmed);
  const iptvMeta = hasIptvChannelMetadata(trimmed);
  const segmentOnlyExtinf = hasSegmentOnlyExtinf(trimmed);

  if (trimmed.includes('#EXT-X-STREAM-INF') || trimmed.includes('#EXT-X-I-FRAME-STREAM-INF')) {
    hints.push('hls_master_tags');
    return { type: 'hls_master', confidence: 'high', hints };
  }

  if (segmentOnlyExtinf && hlsTagCount >= 1) {
    hints.push('segment_duration_extinf');
    return { type: 'hls_media', confidence: 'high', hints };
  }

  if (hlsTagCount >= 2 && !iptvMeta) {
    hints.push('hls_tags_without_iptv_metadata');
    return { type: 'hls_media', confidence: 'medium', hints };
  }

  if (iptvMeta) {
    hints.push('iptv_metadata_present');
    return { type: 'iptv_m3u', confidence: 'high', hints };
  }

  const lowerUrl = String(url || '').toLowerCase();
  if (lowerUrl.includes('.m3u8') && hlsTagCount >= 1) {
    hints.push('m3u8_url_with_hls_tags');
    return { type: 'hls_media', confidence: 'low', hints };
  }

  if (trimmed.includes('#EXTINF')) {
    return { type: 'iptv_m3u', confidence: 'low', hints: ['extinf_present'] };
  }

  return { type: 'invalid', confidence: 'low', hints };
}

function isHlsPlaylistType(type) {
  return type === 'hls_master' || type === 'hls_media';
}

function isIptvPlaylistType(type) {
  return type === 'iptv_m3u';
}

module.exports = {
  classifyPlaylistContent,
  isHlsPlaylistType,
  isIptvPlaylistType,
  hasIptvChannelMetadata,
};
