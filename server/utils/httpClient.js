const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

// Private/reserved IP ranges that must not be fetched (SSRF prevention)
const BLOCKED_CIDRS = [
  { start: ipToLong('127.0.0.0'),   end: ipToLong('127.255.255.255') }, // loopback
  { start: ipToLong('10.0.0.0'),    end: ipToLong('10.255.255.255')  }, // RFC1918
  { start: ipToLong('172.16.0.0'),  end: ipToLong('172.31.255.255')  }, // RFC1918
  { start: ipToLong('192.168.0.0'), end: ipToLong('192.168.255.255') }, // RFC1918
  { start: ipToLong('169.254.0.0'), end: ipToLong('169.254.255.255') }, // link-local / cloud metadata
  { start: ipToLong('0.0.0.0'),     end: ipToLong('0.255.255.255')   }, // "this" network
  { start: ipToLong('100.64.0.0'),  end: ipToLong('100.127.255.255') }, // carrier-grade NAT
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    // Block all IPv6 loopback, link-local, and ULA
    if (ip === '::1') return true;
    if (/^fe80:/i.test(ip)) return true;
    if (/^fd/i.test(ip)) return true;
    if (/^fc/i.test(ip)) return true;
    return false;
  }
  if (!net.isIPv4(ip)) return true; // unknown format — block by default
  const long = ipToLong(ip);
  return BLOCKED_CIDRS.some(({ start, end }) => long >= start && long <= end);
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

  // Resolve hostname to IP(s) and reject private ranges
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

  return urlObj;
}

/**
 * Lightweight HTTP client using Node's native modules (no WebAssembly)
 * Replaces axios to avoid memory issues on low-memory servers
 */
async function fetch(url, options = {}) {
  const urlObj = await validateUrl(url);

  return new Promise((resolve, reject) => {
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'BakeGrillTV/1.0',
        ...options.headers
      },
      timeout: options.timeout || 10000
    };
    
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const response = {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data,
          // Axios-compatible interface
          config: {
            url: url,
            method: options.method || 'GET'
          }
        };
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(response);
        } else {
          const error = new Error(`Request failed with status code ${res.statusCode}`);
          error.response = response;
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      reject(error);
    });
    
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

module.exports = { fetch, validateUrl, isPrivateIp };

