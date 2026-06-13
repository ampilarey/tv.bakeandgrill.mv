#!/usr/bin/env node
/**
 * Direct stream channel feature regression tests (fixtures + unit checks).
 *
 * Usage: node scripts/test-direct-channels.js
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.STREAM_TOKEN_SECRET = process.env.STREAM_TOKEN_SECRET || 'test-direct-channels-secret';

const FIXTURES = path.join(__dirname, '..', 'test', 'fixtures');

const { classifyPlaylistContent, isHlsPlaylistType } = require('../utils/playlistClassifier');
const { parseM3U } = require('../utils/m3uParser');
const {
  normalizeStreamUrl,
  streamUrlHash,
  parseDirectChannelId,
  directChannelApiId,
  toChannelObject,
  parseBulkText,
} = require('../services/directChannelService');
const { enrichChannel } = require('../utils/channelEnrichment');
const { rewriteManifest } = require('../utils/hlsManifest');

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

function readFixture(...parts) {
  return fs.readFileSync(path.join(FIXTURES, ...parts), 'utf8');
}

function testClassifierFixtures() {
  console.log('\nplaylist classifier fixtures');

  const iptv = readFixture('iptv', 'iptv-channels.m3u');
  const iptvCls = classifyPlaylistContent(iptv, 'https://example.com/list.m3u');
  assert('iptv-channels.m3u → iptv_m3u', iptvCls.type === 'iptv_m3u');
  assert('iptv is not HLS type', !isHlsPlaylistType(iptvCls.type));

  const media = readFixture('hls', 'hls-media.m3u8');
  const mediaCls = classifyPlaylistContent(media, 'https://cdn.example.com/live.m3u8');
  assert('hls-media.m3u8 → hls_media', mediaCls.type === 'hls_media');
  assert('hls media is HLS type', isHlsPlaylistType(mediaCls.type));

  const master = readFixture('hls', 'hls-master.m3u8');
  assert('hls-master.m3u8 → hls_master', classifyPlaylistContent(master).type === 'hls_master');

  const nested = readFixture('hls', 'nested-audio.m3u8');
  assert('nested-audio.m3u8 → hls_master', classifyPlaylistContent(nested).type === 'hls_master');

  const extless = readFixture('hls', 'extensionless-playlist');
  assert('extensionless playlist → hls_media', classifyPlaylistContent(extless, 'https://x.test/chunklist').type === 'hls_media');

  const malformed = readFixture('hls', 'malformed.m3u8');
  assert('malformed → invalid', classifyPlaylistContent(malformed).type === 'invalid');
}

function testM3uParserHlsGuard() {
  console.log('\nm3uParser HLS guard');

  const media = readFixture('hls', 'hls-media.m3u8');
  const channels = parseM3U(media, 'https://rumble.example/live.m3u8');
  assert('HLS media playlist returns zero channels', Array.isArray(channels) && channels.length === 0);

  const iptv = readFixture('iptv', 'iptv-channels.m3u');
  const iptvChannels = parseM3U(iptv, 'https://example.com/list.m3u');
  assert('IPTV playlist parses channels', iptvChannels.length === 2);
  assert('IPTV channel has name', iptvChannels[0].name === 'News One');
  assert('IPTV channel not Unknown', iptvChannels.every((c) => c.name !== 'Unknown Channel'));
}

function testDirectChannelIds() {
  console.log('\ndirect channel IDs and shape');

  assert('parseDirectChannelId accepts direct-42', parseDirectChannelId('direct-42') === 42);
  assert('parseDirectChannelId rejects md5 id', parseDirectChannelId('abc123') === null);
  assert('directChannelApiId formats id', directChannelApiId(7) === 'direct-7');

  const row = {
    id: 5,
    name: 'Rumble Live',
    stream_url: 'https://cdn.example.com/live.m3u8',
    group_name: 'Web',
    logo_url: null,
    stream_type: 'hls',
    playback_mode: 'auto',
    http_user_agent: null,
    http_referer: null,
    is_active: 1,
    sort_order: 0,
    playlist_id: 99,
  };
  const ch = toChannelObject(row);
  assert('toChannelObject id is direct-5', ch.id === 'direct-5');
  assert('source_type direct_stream', ch.source_type === 'direct_stream');
  assert('url equals stream_url', ch.url === row.stream_url);
}

function testNormalizeAndDedupe() {
  console.log('\nURL normalization');

  const a = normalizeStreamUrl('https://cdn.example.com/live.m3u8/');
  const b = normalizeStreamUrl('https://cdn.example.com/live.m3u8');
  assert('trailing slash normalized', a === b);
  assert('hash stable', streamUrlHash(a) === streamUrlHash(b));
}

function testBulkParser() {
  console.log('\nbulk text parser');

  const rows = parseBulkText([
    'https://a.example.com/1.m3u8',
    'News|https://b.example.com/2.m3u8|News',
    'name,url,group',
    'Sports,https://c.example.com/3.m3u8,Sports',
    'not-a-url',
  ].join('\n'));

  assert('URL-only line parsed', rows[0].stream_url.includes('a.example.com'));
  assert('pipe format parsed', rows[1].name === 'News' && rows[1].group_name === 'News');
  assert('CSV format parsed', rows[2].name === 'Sports');
  assert('invalid line flagged', rows[3].invalid === true);
}

function testDirectEnrichment() {
  console.log('\ndirect channel enrichment');

  const ch = enrichChannel(
    {
      id: 'direct-12',
      url: 'https://cdn.example.com/live.m3u8',
      name: 'Direct HLS',
      source_type: 'direct_stream',
      stream_type: 'hls',
      playback_mode: 'auto',
      source_playlist_id: 1,
    },
    { is_hls: 1, is_live: 1 },
    null,
    { id: 1 },
    { protocol: 'https', get: () => 'tv.example.com' }
  );

  assert('enriched id preserved', ch.id === 'direct-12');
  assert('is_hls true for direct hls', ch.is_hls === 1 || ch.is_hls === true);
  assert('direct_url set', ch.direct_url === ch.url);
  assert('proxy_url available', ch.proxy_url && ch.proxy_url.includes('/api/stream/direct-12'));
  assert('playback_mode from channel object', ch.playback_mode === 'auto');
}

function testProxyRewriteDirectShape() {
  console.log('\nproxy rewrite with direct channel id');

  const media = readFixture('hls', 'relative-segments.m3u8');
  const rewriteFn = (u) => `/api/stream/direct-99/seg?u=${encodeURIComponent(u)}`;
  const out = rewriteManifest(media, 'https://cdn.example.com/live/variant.m3u8', rewriteFn);
  assert('relative segment rewritten', out.includes('/api/stream/direct-99/seg'));
  assert('absolute segment path', out.includes(encodeURIComponent('https://cdn.example.com/live/segments/seg001.ts')));
}

function testProbeClassifierOnly() {
  console.log('\nclassifier on fixture bodies (no live fetch)');

  const media = readFixture('hls', 'hls-media.m3u8');
  const cls = classifyPlaylistContent(media, 'https://cdn.example.com/live/chunklist.m3u8');
  assert('Rumble-style media playlist classified hls_media', cls.type === 'hls_media');
  assert('would return DIRECT_HLS_NOT_IPTV for playlist import', isHlsPlaylistType(cls.type));
}

async function run() {
  console.log('\n🔍  Direct stream channel tests\n');

  testClassifierFixtures();
  testM3uParserHlsGuard();
  testDirectChannelIds();
  testNormalizeAndDedupe();
  testBulkParser();
  testDirectEnrichment();
  testProxyRewriteDirectShape();
  testProbeClassifierOnly();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
