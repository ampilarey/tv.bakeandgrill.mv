const DEFAULT_USER_AGENT = 'BakeGrillTV/1.0';

function resolveUserAgent(channel) {
  if (channel?.httpUserAgent) return channel.httpUserAgent;
  if (process.env.STREAM_PROXY_USER_AGENT) return process.env.STREAM_PROXY_USER_AGENT;
  return DEFAULT_USER_AGENT;
}

/**
 * Build outbound headers for origin manifest/segment fetches via the stream proxy.
 * @param {object} channel - M3U channel with optional httpUserAgent / httpReferrer
 * @param {{ resourceType?: 'manifest' | 'segment' | 'range' }} [opts]
 */
function buildOriginFetchHeaders(channel, opts = {}) {
  const resourceType = opts.resourceType || 'segment';
  const headers = {
    'User-Agent': resolveUserAgent(channel),
    'Accept-Encoding': 'identity',
  };

  if (channel?.httpReferrer) {
    headers.Referer = channel.httpReferrer;
  }

  if (resourceType === 'manifest') {
    headers.Accept = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*';
  } else {
    headers.Accept = '*/*';
  }

  return headers;
}

function redactHostname(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return '[invalid-url]';
  }
}

module.exports = {
  buildOriginFetchHeaders,
  resolveUserAgent,
  redactHostname,
  DEFAULT_USER_AGENT,
};
