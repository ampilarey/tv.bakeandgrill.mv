const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Lightweight HTTP client using Node's native modules (no WebAssembly)
 * Replaces axios to avoid memory issues on low-memory servers
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
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

module.exports = { fetch };

