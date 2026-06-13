#!/usr/bin/env node
/**
 * HLS transport selection regression tests — Rumble-like mock origin.
 *
 * Usage: node scripts/test-hls-transport.js
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.STREAM_TOKEN_SECRET = process.env.STREAM_TOKEN_SECRET || 'test-hls-transport-secret';

const { rewriteManifest, isHlsManifestBody } = require('../utils/hlsManifest');
const { buildOriginFetchHeaders } = require('../utils/streamProxyHeaders');
const { issueStreamToken, verifyToken } = require('../utils/streamToken');
const { enrichChannel } = require('../utils/channelEnrichment');

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

function startRumbleLikeOrigin() {
  const segmentBody = Buffer.from('FAKE_TS_SEGMENT_DATA');
  const mediaPlaylist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:6',
    '#EXT-X-MAP:URI="init.mp4"',
    '#EXT-X-KEY:METHOD=AES-128,URI="enc.key"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",URI="audio.m3u8",DEFAULT=YES',
    '#EXTINF:6.0,',
    'seg001.ts',
    '',
  ].join('\n');

  const nestedPlaylist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:6',
    '#EXTINF:6.0,',
    'chunklist_i1_DVR',
    '',
  ].join('\n');

  const masterPlaylist = [
    '#EXTM3U',
    '#EXT-X-STREAM-INF:BANDWIDTH=1280000',
    'chunklist_i1_DVR',
    '',
  ].join('\n');

  const server = http.createServer((req, res) => {
    // No Access-Control-Allow-Origin — browser direct fetch would fail CORS
    const ua = req.headers['user-agent'] || '';
    if (!ua.includes('VLC') && !ua.includes('BakeGrill') && !ua.includes('TestProxy')) {
      // Still serve — some origins don't check UA; we log for test
    }

    const p = req.url.split('?')[0];
    if (p.endsWith('master.m3u8') || p === '/live-hls/qmuc-rv6d/chunklist_i1_DVR.m3u8') {
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(p.includes('chunklist') ? mediaPlaylist : masterPlaylist);
      return;
    }
    if (p.includes('chunklist_i1_DVR') && !p.endsWith('.m3u8')) {
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(nestedPlaylist);
      return;
    }
    if (p.endsWith('audio.m3u8')) {
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(mediaPlaylist);
      return;
    }
    if (p.endsWith('init.mp4') || p.endsWith('enc.key') || p.endsWith('.ts')) {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(segmentBody);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        manifestUrl: `http://127.0.0.1:${port}/live-hls/qmuc-rv6d/chunklist_i1_DVR.m3u8`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

async function testRumbleLikeOrigin() {
  console.log('\nRumble-like mock origin');
  const origin = await startRumbleLikeOrigin();

  try {
    const rawRes = await new Promise((resolve, reject) => {
      http.get(origin.manifestUrl, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      }).on('error', reject);
    });

    assert('mock origin returns 200', rawRes.status === 200);
    assert('mock origin does not send ACAO (browser CORS would fail)', !rawRes.headers['access-control-allow-origin']);
    assert('mock body is HLS', isHlsManifestBody(rawRes.body));

    const headers = buildOriginFetchHeaders(
      { httpUserAgent: 'VLC/3.0.20 LibVLC/3.0.20' },
      { resourceType: 'manifest' }
    );
    assert('proxy request profile includes VLC User-Agent', headers['User-Agent'].includes('VLC'));

    const rewriteFn = (absoluteUrl) => `/api/stream/rumble/seg?token=MOCK&u=${encodeURIComponent(absoluteUrl)}`;
    const rewritten = rewriteManifest(rawRes.body.toString('utf8'), origin.manifestUrl, rewriteFn);
    assert('nested playlist URL rewritten', rewritten.includes('/api/stream/rumble/seg'));
    assert('EXT-X-MAP rewritten', rewritten.includes(encodeURIComponent(`${origin.baseUrl}/live-hls/qmuc-rv6d/init.mp4`)));
    assert('EXT-X-KEY rewritten', rewritten.includes(encodeURIComponent(`${origin.baseUrl}/live-hls/qmuc-rv6d/enc.key`)));
    assert('segment URL rewritten', rewritten.includes(encodeURIComponent(`${origin.baseUrl}/live-hls/qmuc-rv6d/seg001.ts`)));
    assert('EXT-X-MEDIA audio URI rewritten', rewritten.includes(encodeURIComponent(`${origin.baseUrl}/live-hls/qmuc-rv6d/audio.m3u8`)));
  } finally {
    await origin.close();
  }
}

function testEnrichmentAutoMode() {
  console.log('\nenrichment auto mode');
  const ch = enrichChannel(
    { id: 'rumble-ch', url: 'https://hugh.cdn.rumble.cloud/live/chunklist.m3u8', name: 'Rumble' },
    { is_hls: 1, is_http: 0, needs_proxy: 0, is_live: 1 },
    null,
    { id: 42 },
    { protocol: 'https', get: () => 'tv.bakeandgrill.mv' }
  );
  assert('playback_mode auto for ordinary HTTPS HLS', ch.playback_mode === 'auto');
  assert('direct_url set', ch.direct_url === ch.url);
  assert('proxy_url available for fallback', ch.proxy_url && ch.proxy_url.includes('/api/stream/'));
  assert('playback_url starts direct', ch.playback_url === ch.direct_url);
}

function testDirectChannelIdEnrichment() {
  console.log('\ndirect channel id direct-N');
  const ch = enrichChannel(
    {
      id: 'direct-99',
      url: 'https://cdn.example.com/single.m3u8',
      name: 'Single HLS',
      source_type: 'direct_stream',
      stream_type: 'hls',
      playback_mode: 'auto',
      source_playlist_id: 3,
    },
    { is_hls: 1, is_live: 1 },
    null,
    { id: 3 },
    { protocol: 'https', get: () => 'tv.bakeandgrill.mv' }
  );
  assert('direct-N id preserved', ch.id === 'direct-99');
  assert('proxy URL uses direct-N channel id', ch.proxy_url && ch.proxy_url.includes('/api/stream/direct-99'));
  assert('source_type on enriched channel', ch.source_type === 'direct_stream');
}

function testTokenExpiry() {
  console.log('\nproxy token expiry');
  const token = issueStreamToken({
    channelId: 'ch1',
    playlistId: 1,
    urlHash: 'abc',
    scope: 'master',
  });
  assert('token verifies when fresh', verifyToken(token) !== null);

  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  payload.exp = Math.floor(Date.now() / 1000) - 10;
  const expiredBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const crypto = require('crypto');
  const secret = process.env.STREAM_TOKEN_SECRET || process.env.JWT_SECRET;
  const sig = crypto.createHmac('sha256', secret).update(expiredBody).digest('base64url');
  const expiredToken = `${expiredBody}.${sig}`;
  assert('expired token rejected', verifyToken(expiredToken) === null);
}

function testExplicitProxyMode() {
  console.log('\nexplicit proxy mode');
  const ch = enrichChannel(
    { id: 'x', url: 'https://cdn.example.com/live.m3u8', name: 'X' },
    { is_hls: 1, is_http: 0, needs_proxy: 1 },
    null,
    { id: 1 },
    { protocol: 'https', get: () => 'tv.example.com' }
  );
  assert('needs_proxy forces proxy mode', ch.playback_mode === 'proxy');
  assert('playback_url is proxy', ch.playback_url === ch.proxy_url);
}

async function run() {
  console.log('\n🔍  HLS transport tests\n');
  testEnrichmentAutoMode();
  testDirectChannelIdEnrichment();
  testExplicitProxyMode();
  testTokenExpiry();
  await testRumbleLikeOrigin();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
