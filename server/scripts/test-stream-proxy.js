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
const { rewriteManifest } = require('../utils/hlsManifest');
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
  testStreamTokenIssue();
  await testIntegrationOptional();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
