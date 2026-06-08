const crypto = require('crypto');
const { URL } = require('url');

/**
 * Resolve a stream URL against the playlist base URL.
 */
function resolveStreamUrl(streamUrl, baseUrl) {
  if (!streamUrl || !streamUrl.trim()) return streamUrl;
  const trimmed = streamUrl.trim();
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      return trimmed;
    }
    if (baseUrl) {
      return new URL(trimmed, baseUrl).toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

function isSupportedProtocol(urlStr) {
  try {
    const proto = new URL(urlStr).protocol;
    return proto === 'http:' || proto === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parse VLC/Kodi header lines between EXTINF and stream URL.
 */
function parseHeaderLines(lines, startIdx) {
  const meta = {
    httpUserAgent: null,
    httpReferrer: null,
    kodiProps: {},
  };

  let i = startIdx;
  while (i < lines.length && lines[i].startsWith('#')) {
    const line = lines[i];

    const vlcUa = line.match(/^#EXTVLCOPT:http-user-agent=(.+)$/i);
    if (vlcUa) meta.httpUserAgent = vlcUa[1].trim();

    const vlcRef = line.match(/^#EXTVLCOPT:http-referrer=(.+)$/i);
    if (vlcRef) meta.httpReferrer = vlcRef[1].trim();

    const kodiMatch = line.match(/^#KODIPROP:([^=]+)=(.+)$/i);
    if (kodiMatch) {
      const key = kodiMatch[1].trim();
      const val = kodiMatch[2].trim();
      meta.kodiProps[key] = val;

      if (key === 'inputstream.adaptive.stream_headers' || key.includes('stream_headers')) {
        const ua = val.match(/User-Agent=([^&\r\n]+)/i);
        const ref = val.match(/Referer=([^&\r\n]+)/i);
        if (ua) meta.httpUserAgent = decodeURIComponent(ua[1]);
        if (ref) meta.httpReferrer = decodeURIComponent(ref[1]);
      }
    }

    i += 1;
  }

  return { meta, nextIndex: i };
}

/**
 * Parse M3U playlist text into structured channel objects
 * @param {string} m3uText - Raw M3U file content
 * @param {string} [baseUrl] - Playlist URL for resolving relative stream paths
 * @returns {Array} Array of channel objects
 */
function parseM3U(m3uText, baseUrl = null) {
  try {
    let resolvedBase = baseUrl;
    if (baseUrl) {
      try {
        const u = new URL(baseUrl);
        resolvedBase = u.origin + u.pathname.replace(/\/[^/]*$/, '/');
      } catch {
        resolvedBase = baseUrl;
      }
    }

    const lines = m3uText.split('\n').map((line) => line.trim()).filter(Boolean);
    const channels = [];

    let currentChannel = null;
    let channelIndex = 0;
    let pendingMeta = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === '#EXTM3U' || line.startsWith('#EXTM3U:')) {
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        const content = line.substring(8);
        const attributes = {};
        let channelName = 'Unknown Channel';

        const tvgIdMatch = content.match(/tvg-id="([^"]*)"/i);
        if (tvgIdMatch) attributes.tvgId = tvgIdMatch[1];

        const tvgNameMatch = content.match(/tvg-name="([^"]*)"/i);
        if (tvgNameMatch) attributes.tvgName = tvgNameMatch[1];

        const tvgLogoMatch = content.match(/tvg-logo="([^"]*)"/i);
        if (tvgLogoMatch) attributes.tvgLogo = tvgLogoMatch[1];

        const groupTitleMatch = content.match(/group-title="([^"]*)"/i);
        if (groupTitleMatch) attributes.group = groupTitleMatch[1];

        const parts = content.split(',');
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1].trim();
          if (!lastPart.includes('="') && lastPart.length > 0) {
            channelName = lastPart;
          } else if (parts.length > 2) {
            const secondLast = parts[parts.length - 2].trim();
            if (!secondLast.includes('="') && secondLast.length > 0) {
              channelName = secondLast;
            }
          }
        }

        if (channelName === 'Unknown Channel' || channelName.includes('tvg-') || channelName.includes('="')) {
          if (attributes.tvgName?.length > 0) channelName = attributes.tvgName;
          else if (attributes.tvgId?.length > 0) channelName = attributes.tvgId;
        }

        channelName = channelName.replace(/^["']+|["']+$/g, '').trim();
        const groupName = attributes.group ? attributes.group.trim() : 'Uncategorized';

        currentChannel = {
          name: channelName,
          logo: attributes.tvgLogo || null,
          group: groupName,
          tvgId: attributes.tvgId || null,
          httpUserAgent: null,
          httpReferrer: null,
          kodiProps: {},
        };

        const headerParse = parseHeaderLines(lines, i + 1);
        if (headerParse.meta.httpUserAgent) currentChannel.httpUserAgent = headerParse.meta.httpUserAgent;
        if (headerParse.meta.httpReferrer) currentChannel.httpReferrer = headerParse.meta.httpReferrer;
        if (Object.keys(headerParse.meta.kodiProps).length > 0) {
          currentChannel.kodiProps = headerParse.meta.kodiProps;
        }
        pendingMeta = headerParse;
        i = headerParse.nextIndex - 1;
      } else if (currentChannel && !line.startsWith('#')) {
        const originalUrl = line;
        const resolved = resolveStreamUrl(line, resolvedBase);

        currentChannel.originalUrl = originalUrl;
        currentChannel.url = resolved;
        currentChannel.unsupported_protocol = !isSupportedProtocol(resolved);
        currentChannel.requires_user_agent = !!currentChannel.httpUserAgent;
        currentChannel.requires_referrer = !!currentChannel.httpReferrer;

        currentChannel.id = generateChannelId(resolved + channelIndex);
        currentChannel.index = channelIndex;
        channelIndex++;

        channels.push(currentChannel);
        currentChannel = null;
        pendingMeta = null;
      }
    }

    return channels;
  } catch (error) {
    console.error('Error parsing M3U:', error.message);
    return [];
  }
}

function generateChannelId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function extractGroups(channels) {
  const groups = new Set();
  channels.forEach((channel) => {
    if (channel.group?.trim()) groups.add(channel.group.trim());
  });
  return Array.from(groups).filter((g) => g && g.length > 0).sort();
}

function searchChannels(channels, query) {
  if (!query) return channels;
  const lowerQuery = query.toLowerCase();
  return channels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(lowerQuery) ||
      (channel.group && channel.group.toLowerCase().includes(lowerQuery))
  );
}

function filterByGroup(channels, group) {
  if (!group) return channels;
  return channels.filter((channel) => channel.group === group);
}

function sortChannels(channels, sortBy = 'name') {
  return [...channels].sort((a, b) => {
    if (sortBy === 'group') return (a.group || '').localeCompare(b.group || '');
    return a.name.localeCompare(b.name);
  });
}

function playlistBaseUrl(m3uUrl) {
  try {
    const u = new URL(m3uUrl);
    return u.origin + u.pathname.replace(/\/[^/]*$/, '/');
  } catch {
    return m3uUrl;
  }
}

module.exports = {
  parseM3U,
  generateChannelId,
  extractGroups,
  searchChannels,
  filterByGroup,
  sortChannels,
  resolveStreamUrl,
  isSupportedProtocol,
  playlistBaseUrl,
};
