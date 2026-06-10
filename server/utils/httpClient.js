const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

const DEFAULT_MAX_BYTES = parseInt(process.env.MAX_REMOTE_BYTES || '5242880', 10); // 5MB
const MAX_REDIRECTS = 5;

// Private/reserved IP ranges that must not be fetched (SSRF prevention)
const BLOCKED_CIDRS = [
  { start: ipToLong('127.0.0.0'),   end: ipToLong('127.255.255.255') },
  { start: ipToLong('10.0.0.0'),    end: ipToLong('10.255.255.255')  },
  { start: ipToLong('172.16.0.0'),  end: ipToLong('172.31.255.255')  },
  { start: ipToLong('192.168.0.0'), end: ipToLong('192.168.255.255') },
  { start: ipToLong('169.254.0.0'), end: ipToLong('169.254.255.255') },
  { start: ipToLong('0.0.0.0'),     end: ipToLong('0.255.255.255')   },
  { start: ipToLong('100.64.0.0'),  end: ipToLong('100.127.255.255') },
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    if (ip === '::1') return true;
    if (/^fe80:/i.test(ip)) return true;
    if (/^fd/i.test(ip)) return true;
    if (/^fc/i.test(ip)) return true;
    return false;
  }
  if (!net.isIPv4(ip)) return true;
  const long = ipToLong(ip);
  return BLOCKED_CIDRS.some(({ start, end }) => long >= start && long <= end);
}

/** Redact sensitive query params for logging */
function redactUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    for (const key of u.searchParams.keys()) {
      if (/token|password|key|auth|secret/i.test(key)) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    return u.toString();
  } catch {
    return '[invalid-url]';
  }
}

async function validateUrl(urlStr) {
  let urlObj;
  try {
    urlObj = new URL(urlStr);
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 });
  }

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw Object.assign(new Error('Only http and https URLs are allowed'), { status: 400 });
  }

  let addresses;
  try {
    addresses = await dns.lookup(urlObj.hostname, { all: true });
  } catch {
    throw Object.assign(new Error('Unable to resolve hostname'), { status: 400 });
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw Object.assign(new Error('URL resolves to a private/reserved IP address'), { status: 400 });
    }
  }

  return { urlObj, addresses };
}

function pinnedLookup(addresses) {
  const primary = addresses[0];
  const address = primary.address;
  const family = primary.family ?? (net.isIPv6(address) ? 6 : 4);
  return (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    callback(null, address, family);
  };
}

function buildPinnedRequestOptions(urlObj, addresses, baseOptions = {}) {
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    lookup: pinnedLookup(addresses),
    ...baseOptions,
  };
  if (urlObj.protocol === 'https:') {
    options.servername = urlObj.hostname;
  }
  if (!options.headers) {
    options.headers = {};
  }
  if (!options.headers.Host) {
    options.headers.Host = urlObj.host;
  }
  return options;
}

function isRedirectStatus(code) {
  return code >= 300 && code < 400;
}

/**
 * Core HTTP request with SSRF validation, size limits, optional redirects.
 */
async function fetchOnce(url, options = {}) {
  const { urlObj, addresses } = await validateUrl(url);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const method = options.method || 'GET';

  return new Promise((resolve, reject) => {
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = buildPinnedRequestOptions(urlObj, addresses, {
      method,
      headers: {
        'User-Agent': 'BakeGrillTV/1.0',
        ...options.headers,
      },
      timeout: options.timeout || 10000,
    });

    const req = protocol.request(requestOptions, (res) => {
      const chunks = [];
      let totalBytes = 0;
      let aborted = false;

      const fail = (err) => {
        if (!aborted) {
          aborted = true;
          req.destroy();
          reject(err);
        }
      };

      res.on('data', (chunk) => {
        if (aborted) return;
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          fail(Object.assign(new Error(`Response exceeds max size (${maxBytes} bytes)`), {
            code: 'MAX_BYTES_EXCEEDED',
          }));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (aborted) return;
        const data = Buffer.concat(chunks).toString('utf8');
        const response = {
          status: res.statusCode,
          statusCode: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data,
          finalUrl: url,
          config: { url, method },
        };

        if (options.acceptRedirect && isRedirectStatus(res.statusCode)) {
          const location = res.headers.location;
          if (!location) {
            reject(Object.assign(new Error('Redirect without Location header'), { response }));
            return;
          }
          const nextUrl = new URL(location, url).toString();
          resolve({ ...response, redirectUrl: nextUrl, isRedirect: true });
          return;
        }

        if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 206) {
          resolve(response);
        } else {
          const error = new Error(`Request failed with status code ${res.statusCode}`);
          error.response = response;
          reject(error);
        }
      });
    });

    req.on('error', (error) => reject(error));

    req.on('timeout', () => {
      req.destroy();
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      reject(error);
    });

    if (options.data) req.write(options.data);
    req.end();
  });
}

/**
 * Fetch with redirect following (max 5 hops).
 */
async function fetch(url, options = {}) {
  const followRedirects = options.followRedirects !== false;
  let currentUrl = url;
  let redirectCount = 0;
  let lastResponse = null;

  while (true) {
    try {
      const res = await fetchOnce(currentUrl, {
        ...options,
        acceptRedirect: followRedirects,
      });

      if (res.isRedirect && res.redirectUrl) {
        redirectCount += 1;
        if (redirectCount > MAX_REDIRECTS) {
          throw Object.assign(new Error('Too many redirects'), { code: 'REDIRECT_ERROR' });
        }
        currentUrl = res.redirectUrl;
        lastResponse = res;
        continue;
      }

      return { ...res, finalUrl: currentUrl, redirectCount };
    } catch (err) {
      if (err.response && followRedirects && isRedirectStatus(err.response.status)) {
        const location = err.response.headers?.location;
        if (location) {
          redirectCount += 1;
          if (redirectCount > MAX_REDIRECTS) {
            throw Object.assign(new Error('Too many redirects'), { code: 'REDIRECT_ERROR' });
          }
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      err.redactedUrl = redactUrl(currentUrl);
      throw err;
    }
  }
}

/**
 * HEAD request for reachability without body download.
 */
async function head(url, options = {}) {
  return fetchOnce(url, { ...options, method: 'HEAD', maxBytes: 0 });
}

/**
 * Stream upstream response to an Express res with SSRF checks, redirect following, and optional byte cap.
 * Does not buffer the full body — pipes directly to res.
 */
function streamRange(originUrl, options = {}) {
  const {
    headers = {},
    rangeHeader = null,
    maxBytes = 0,
    timeout = 10000,
    res,
  } = options;

  let redirectCount = 0;
  let currentUrl = originUrl;

  const attempt = async () => {
    const { urlObj, addresses } = await validateUrl(currentUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqHeaders = {
      'User-Agent': 'BakeGrillTV/1.0',
      ...headers,
    };
    if (rangeHeader) reqHeaders.Range = rangeHeader;

    return new Promise((resolve, reject) => {
      const requestOptions = buildPinnedRequestOptions(urlObj, addresses, {
        method: 'GET',
        headers: reqHeaders,
        timeout,
      });

      const req = protocol.request(requestOptions, (upstream) => {
        if (isRedirectStatus(upstream.statusCode) && upstream.headers.location) {
          redirectCount += 1;
          if (redirectCount > MAX_REDIRECTS) {
            reject(Object.assign(new Error('Too many redirects'), { code: 'REDIRECT_ERROR' }));
            return;
          }
          currentUrl = new URL(upstream.headers.location, currentUrl).toString();
          upstream.resume();
          attempt().then(resolve).catch(reject);
          return;
        }

        const status = upstream.statusCode;
        const okStatus = status === 206 || (status >= 200 && status < 300);
        if (!okStatus) {
          upstream.resume();
          reject(Object.assign(new Error(`Upstream status ${status}`), {
            status,
            code: 'HTTP_ERROR',
          }));
          return;
        }

        const contentLength = parseInt(upstream.headers['content-length'] || '0', 10);
        if (maxBytes > 0 && contentLength > maxBytes) {
          upstream.resume();
          reject(Object.assign(new Error('Response exceeds max size'), { code: 'MAX_BYTES_EXCEEDED' }));
          return;
        }

        res.status(status);
        if (upstream.headers['content-type']) res.set('Content-Type', upstream.headers['content-type']);
        if (upstream.headers['content-length']) res.set('Content-Length', upstream.headers['content-length']);
        if (upstream.headers['content-range']) res.set('Content-Range', upstream.headers['content-range']);
        if (upstream.headers['accept-ranges']) res.set('Accept-Ranges', upstream.headers['accept-ranges']);
        else res.set('Accept-Ranges', 'bytes');
        if (upstream.headers['cache-control']) res.set('Cache-Control', upstream.headers['cache-control']);
        else res.set('Cache-Control', 'no-store');

        let totalBytes = 0;
        let aborted = false;

        upstream.on('data', (chunk) => {
          if (aborted || maxBytes <= 0) return;
          totalBytes += chunk.length;
          if (totalBytes > maxBytes) {
            aborted = true;
            upstream.destroy();
            req.destroy();
            if (!res.headersSent) {
              reject(Object.assign(new Error('Stream exceeds max size'), { code: 'MAX_BYTES_EXCEEDED' }));
            } else {
              res.destroy();
            }
          }
        });

        upstream.pipe(res);

        res.on('finish', () => {
          if (!aborted) resolve({ status, finalUrl: currentUrl });
        });

        upstream.on('error', (err) => {
          if (!aborted) reject(err);
        });

        res.on('error', (err) => {
          if (!aborted) reject(err);
        });
      });

      req.on('error', (err) => {
        reject(Object.assign(err, { code: err.code || 'PROXY_RUNTIME_ERROR' }));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('Request timeout'), { code: 'ECONNABORTED' }));
      });
      req.end();
    });
  };

  return attempt();
}

/**
 * Fetch byte range with redirect following (for probes).
 */
async function fetchRange(url, options = {}) {
  const start = options.start ?? 0;
  const end = options.end ?? 8191;
  const maxBytes = options.maxBytes ?? (end - start + 1);
  let currentUrl = url;
  let redirectCount = 0;

  while (true) {
    const { urlObj, addresses } = await validateUrl(currentUrl);
    const headers = {
      ...options.headers,
      Range: `bytes=${start}-${end}`,
    };

    const res = await new Promise((resolve, reject) => {
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const requestOptions = buildPinnedRequestOptions(urlObj, addresses, {
        method: 'GET',
        headers: { 'User-Agent': 'BakeGrillTV/1.0', ...headers },
        timeout: options.timeout || 10000,
      });

      const req = protocol.request(requestOptions, (upstream) => {
        if (isRedirectStatus(upstream.statusCode) && upstream.headers.location) {
          upstream.resume();
          resolve({ isRedirect: true, location: upstream.headers.location });
          return;
        }

        const chunks = [];
        let totalBytes = 0;
        upstream.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > maxBytes) {
            req.destroy();
            reject(Object.assign(new Error('Range response exceeds max size'), { code: 'MAX_BYTES_EXCEEDED' }));
          }
          chunks.push(chunk);
        });
        upstream.on('end', () => {
          resolve({
            status: upstream.statusCode,
            statusCode: upstream.statusCode,
            headers: upstream.headers,
            data: Buffer.concat(chunks),
            finalUrl: currentUrl,
          });
        });
        upstream.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('Request timeout'), { code: 'ECONNABORTED' }));
      });
      req.end();
    });

    if (res.isRedirect) {
      redirectCount += 1;
      if (redirectCount > MAX_REDIRECTS) {
        throw Object.assign(new Error('Too many redirects'), { code: 'REDIRECT_ERROR' });
      }
      currentUrl = new URL(res.location, currentUrl).toString();
      continue;
    }
    return res;
  }
}

module.exports = {
  fetch,
  fetchOnce,
  fetchRange,
  streamRange,
  head,
  validateUrl,
  isPrivateIp,
  redactUrl,
  DEFAULT_MAX_BYTES,
};
