#!/usr/bin/env node
/**
 * Stream proxy smoke + unit checks (no test framework required).
 *
 * Usage:
 *   node scripts/test-stream-proxy.js
 *   TEST_STREAM_URL=https://example.com/live.m3u8 node scripts/test-stream-proxy.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { fetchRange, streamRange, redactUrl } = require('../utils/httpClient');
const { rewriteManifest, isHlsManifestContent, isHlsManifestBody } = require('../utils/hlsManifest');
const { shouldUsePlaybackProxy, enrichChannel } = require('../utils/channelEnrichment');
const { buildOriginFetchHeaders, resolveUserAgent } = require('../utils/streamProxyHeaders');
const { issueStreamToken } = require('../utils/streamToken');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed += 1;
  } else {
    console.error(`  ❌  ${label}`);
    failed += 1;
  }
}

function testHttpClientExports() {
  console.log('\nhttpClient exports');
  assert('fetchRange is a function', typeof fetchRange === 'function');
  assert('streamRange is a function', typeof streamRange === 'function');
  assert('redactUrl is a function', typeof redactUrl === 'function');
  assert('redactUrl hides token params', /REDACTED/i.test(redactUrl('https://x.test/v?token=secret')));
}

function testManifestRewrite() {
  console.log('\nmanifest rewrite');
  const master = [
    '#EXTM3U',
    '#EXT-X-STREAM-INF:BANDWIDTH=1280000',
    'variant.m3u8',
    '',
  ].join('\n');

  const media = [
    '#EXTM3U',
    '#EXTINF:6.0,',
    'seg001.ts',
    '',
  ].join('\n');

  const rewriteFn = (absoluteUrl) => `/api/stream/ch1/seg?token=TEST&u=${encodeURIComponent(absoluteUrl)}`;

  const masterOut = rewriteManifest(master, 'https://cdn.example.com/live/master.m3u8', rewriteFn);
  assert('master variant URL rewritten', masterOut.includes('/api/stream/ch1/seg?token=TEST'));
  assert('master variant absolute path resolved', masterOut.includes(encodeURIComponent('https://cdn.example.com/live/variant.m3u8')));

  const mediaOut = rewriteManifest(media, 'https://cdn.example.com/live/variant.m3u8', rewriteFn);
  assert('media segment URL rewritten', mediaOut.includes('/api/stream/ch1/seg?token=TEST'));
  assert('media segment absolute path resolved', mediaOut.includes(encodeURIComponent('https://cdn.example.com/live/seg001.ts')));

  const withMap = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-MAP:URI="init.mp4"',
    '#EXTINF:6.0,',
    'seg001.m4s',
  ].join('\n');
  const mapOut = rewriteManifest(withMap, 'https://cdn.example.com/live/stream.m3u8', rewriteFn);
  assert('EXT-X-MAP URI rewritten', mapOut.includes(encodeURIComponent('https://cdn.example.com/live/init.mp4')));

  const withKey = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
    '#EXTINF:6.0,',
    'seg001.ts',
  ].join('\n');
  const keyOut = rewriteManifest(withKey, 'https://cdn.example.com/live/stream.m3u8', rewriteFn);
  assert('EXT-X-KEY URI rewritten', keyOut.includes(encodeURIComponent('https://cdn.example.com/live/key.bin')));

  const withIframe = [
    '#EXTM3U',
    '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=500000',
    'iframe.m3u8',
  ].join('\n');
  const iframeOut = rewriteManifest(withIframe, 'https://cdn.example.com/live/master.m3u8', rewriteFn);
  assert('EXT-X-I-FRAME-STREAM-INF next-line URI rewritten', iframeOut.includes(encodeURIComponent('https://cdn.example.com/live/iframe.m3u8')));
}

function testHlsDetection() {
  console.log('\nHLS detection');
  assert(
    'isHlsManifestContent detects apple mpegurl',
    isHlsManifestContent('application/vnd.apple.mpegurl', 'https://cdn.example.com/live/user/pass/1')
  );
  assert(
    'isHlsManifestContent ignores plain HTML',
    !isHlsManifestContent('text/html', 'https://cdn.example.com/live/user/pass/1')
  );
  assert(
    'isHlsManifestContent detects .m3u8 path',
    isHlsManifestContent(null, 'https://cdn.example.com/stream.m3u8')
  );
  assert(
    'isHlsManifestContent detects extensionless IPTV path with m3u8 query',
    isHlsManifestContent(null, 'https://cdn.example.com/live/user/pass/1?format=m3u8')
  );
  assert(
    'isHlsManifestBody detects EXTM3U',
    isHlsManifestBody('#EXTM3U\n#EXTINF:6,\nseg.ts\n')
  );
}

function testPlaybackProxyEligibility() {
  console.log('\nplayback proxy eligibility\n');
  const tvmChannel = { url: 'https://cdn.example.com/live/tvm', requires_referrer: 0, requires_user_agent: 0 };
  const tvmDiagAuto = { is_hls: 1, is_http: 0, needs_proxy: 0 };
  assert(
    'HTTPS HLS without proxy signals uses direct (not forced proxy)',
    shouldUsePlaybackProxy(tvmChannel, tvmDiagAuto) === false
  );
  const tvmDiagExplicit = { is_hls: 1, is_http: 0, needs_proxy: 1 };
  assert(
    'HTTPS HLS with needs_proxy=1 uses proxy',
    shouldUsePlaybackProxy(tvmChannel, tvmDiagExplicit) === true
  );
  assert(
    'HTTP stream still uses proxy',
    shouldUsePlaybackProxy({ url: 'http://cdn.example.com/live.m3u8' }, { is_hls: 1, is_http: 1, needs_proxy: 1 }) === true
  );
  assert(
    'referrer-required stream uses proxy',
    shouldUsePlaybackProxy(
      { url: 'https://cdn.example.com/live.m3u8', requires_referrer: 1 },
      { is_hls: 1, is_http: 0, needs_proxy: 0 }
    ) === true
  );

  const mockReq = { protocol: 'https', get: () => 'tv.example.com' };
  const autoEnriched = enrichChannel(
    { id: 'tvm', url: 'https://cdn.example.com/live/tvm.m3u8', name: 'TVM' },
    { is_live: 1, is_hls: 1, is_http: 0, needs_proxy: 0, last_checked: '2026-01-01' },
    null,
    { id: 1 },
    mockReq
  );
  assert('auto mode HTTPS HLS exposes dual URLs', autoEnriched.playback_mode === 'auto');
  assert('auto mode direct_url is origin', autoEnriched.direct_url === 'https://cdn.example.com/live/tvm.m3u8');
  assert('auto mode proxy_url is built', autoEnriched.proxy_url && autoEnriched.proxy_url.includes('/api/stream/'));
  assert('auto mode playback_url prefers direct', autoEnriched.playback_url === autoEnriched.direct_url);

  const proxyEnriched = enrichChannel(
    { id: 'rumble', url: 'https://cdn.rumble.cloud/live/chunklist.m3u8', name: 'Rumble' },
    { is_live: 0, is_hls: 1, is_http: 0, needs_proxy: 1, failure_reason_code: 'OFFLINE', last_checked: '2026-01-01' },
    null,
    { id: 1 },
    mockReq
  );
  assert(
    'needs_proxy=1 forces proxy playback_mode',
    proxyEnriched.playback_mode === 'proxy'
  );
  assert(
    'needs_proxy=1 playback_url uses proxy',
    proxyEnriched.playback_url === proxyEnriched.proxy_url
  );
  assert(
    'offline probe still exposes direct_url for browser fallback metadata',
    proxyEnriched.direct_url === 'https://cdn.rumble.cloud/live/chunklist.m3u8'
  );
}

function testProxyHeaders() {
  console.log('\nproxy headers');
  const prevUa = process.env.STREAM_PROXY_USER_AGENT;
  process.env.STREAM_PROXY_USER_AGENT = 'TestProxyAgent/9.9';
  const defaultHeaders = buildOriginFetchHeaders({}, { resourceType: 'manifest' });
  assert('default env User-Agent', defaultHeaders['User-Agent'] === 'TestProxyAgent/9.9');
  assert('manifest Accept header', defaultHeaders.Accept.includes('mpegurl'));
  assert('Accept-Encoding identity on manifest', defaultHeaders['Accept-Encoding'] === 'identity');

  const channelHeaders = buildOriginFetchHeaders(
    { httpUserAgent: 'VLC/3.0.0', httpReferrer: 'https://ref.example/' },
    { resourceType: 'segment' }
  );
  assert('channel User-Agent forwarded', channelHeaders['User-Agent'] === 'VLC/3.0.0');
  assert('channel Referer forwarded', channelHeaders.Referer === 'https://ref.example/');
  assert('segment Accept is wildcard', channelHeaders.Accept === '*/*');

  if (prevUa === undefined) delete process.env.STREAM_PROXY_USER_AGENT;
  else process.env.STREAM_PROXY_USER_AGENT = prevUa;
  assert('resolveUserAgent falls back', resolveUserAgent({}) === (prevUa || 'BakeGrillTV/1.0'));
}

async function testStreamRangeSecurity() {
  console.log('\nstreamRange security');
  const { PassThrough } = require('stream');
  const out = new PassThrough();
  const expressRes = Object.assign(out, {
    statusCode: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, val) { this.headers[name.toLowerCase()] = val; },
    get headersSent() { return this.statusCode != null; },
  });

  try {
    await streamRange('http://127.0.0.1/seg.ts', { maxBytes: 1024, timeout: 2000, res: expressRes });
    assert('streamRange blocks localhost (SSRF)', false);
  } catch (err) {
    assert('streamRange blocks localhost (SSRF)', /private|reserved/i.test(err.message));
  }

  const segUrl = process.env.TEST_SEGMENT_URL;
  if (!segUrl) {
    console.log('  ⏭  Range 206 test skipped (set TEST_SEGMENT_URL to a public segment URL)');
    return;
  }

  const out2 = new PassThrough();
  const collected = [];
  out2.on('data', (c) => collected.push(c));
  const expressRes2 = Object.assign(out2, {
    statusCode: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, val) { this.headers[name.toLowerCase()] = val; },
    get headersSent() { return this.statusCode != null; },
  });

  try {
    const result = await streamRange(segUrl, {
      rangeHeader: 'bytes=0-1023',
      maxBytes: 52428800,
      timeout: 15000,
      res: expressRes2,
    });
    assert('TEST_SEGMENT_URL returns 200/206', result.status === 200 || result.status === 206);
    assert('TEST_SEGMENT_URL body non-empty', Buffer.concat(collected).length > 0);
  } catch (err) {
    assert(`TEST_SEGMENT_URL streamRange: ${err.message}`, false);
  }
}

async function testIntegrationOptional() {
  const testUrl = process.env.TEST_STREAM_URL;
  if (!testUrl) {
    console.log('\nintegration (skipped — set TEST_STREAM_URL to enable)');
    return;
  }

  console.log('\nintegration');
  try {
    const manifestRes = await fetchRange(testUrl, { start: 0, end: 8191, timeout: 15000 });
    const ok = manifestRes.status === 200 || manifestRes.status === 206;
    assert('TEST_STREAM_URL returns 200/206', ok);
    const body = manifestRes.data.toString('utf8');
    assert('manifest body non-empty', body.length > 0);
    const ct = (manifestRes.headers['content-type'] || '').toLowerCase();
    assert('content-type looks like HLS or octet', ct.includes('mpegurl') || ct.includes('octet') || body.includes('#EXTM3U'));
  } catch (err) {
    assert(`TEST_STREAM_URL fetch: ${err.message}`, false);
  }
}

function testStreamTokenIssue() {
  console.log('\nstream token');
  const token = issueStreamToken({
    channelId: 'test-ch',
    playlistId: 1,
    urlHash: 'abc123',
    scope: 'master',
  });
  assert('issueStreamToken returns non-empty string', typeof token === 'string' && token.length > 20);
}

async function run() {
  console.log('\n🔍  Stream proxy tests\n');
  testHttpClientExports();
  testManifestRewrite();
  testHlsDetection();
  testPlaybackProxyEligibility();
  testProxyHeaders();
  testStreamTokenIssue();
  await testStreamRangeSecurity();
  await testIntegrationOptional();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
