#!/usr/bin/env node
/**
 * Playback stall fix tests — client failure separation + proxy codes.
 *
 * Usage:
 *   node scripts/test-playback-stall.js
 *
 * Integration (optional):
 *   TEST_BASE_URL, TEST_ADMIN_TOKEN or TEST_ADMIN_EMAIL/PASSWORD
 *   TEST_PLAYLIST_ID, TEST_CHANNEL_URL
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const https = require('https');

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

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

function request(method, urlPath, { body, token, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`);
    const mod = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { /* text */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginAdmin() {
  if (ADMIN_TOKEN) return ADMIN_TOKEN;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
  const res = await request('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  return res.json?.token || null;
}

function moduleSmoke() {
  console.log('\n📦  Module smoke\n');
  const { REASON_CODES } = require('../services/channelDiagnosis');
  assert('PLAYBACK_STALLED in REASON_CODES', REASON_CODES.has('PLAYBACK_STALLED'));
  assert('SEGMENT_FETCH_FAILED in REASON_CODES', REASON_CODES.has('SEGMENT_FETCH_FAILED'));
  assert('PLAYBACK_START_TIMEOUT in REASON_CODES', REASON_CODES.has('PLAYBACK_START_TIMEOUT'));

  const { streamRange } = require('../utils/httpClient');
  assert('streamRange exported', typeof streamRange === 'function');
}

async function testReportFailureNoPoison(token) {
  console.log('\n🔌  report-failure integration\n');
  const testUrl = process.env.TEST_CHANNEL_URL || `https://test-playback-stall.example/live.m3u8?t=${Date.now()}`;
  const playlistId = parseInt(process.env.TEST_PLAYLIST_ID || '1', 10);

  const res = await request('POST', '/api/channels/report-failure', {
    token,
    body: {
      url: testUrl,
      playlistId,
      channelName: 'Test Stall Channel',
      reasonCode: 'PLAYBACK_START_TIMEOUT',
      deviceType: 'ios_safari',
      failureStage: 'playback_start_timeout',
    },
  });
  assert('report-failure returns 200', res.status === 200);

  const health = await request('GET', `/api/channels/health-report?playlistId=${playlistId}`, { token });
  if (health.status === 200 && health.json?.rows) {
    const row = health.json.rows.find((c) => c.url === testUrl);
    if (row) {
      assert('client report does not set is_live=0', row.is_live !== 0);
      assert('client_failure_count incremented', (row.client_failure_count || 0) >= 1);
      assert('last_client_failure_reason stored', row.last_client_failure_reason === 'PLAYBACK_START_TIMEOUT');
    } else {
      console.log('  ⏭  Health row not found (channel may not appear in health list yet)');
    }
  } else {
    console.log('  ⏭  Skipping health verification (endpoint unavailable)');
  }
}

async function main() {
  console.log(`\n🧪  Playback stall tests (${BASE})\n`);
  moduleSmoke();

  const token = await loginAdmin();
  if (token) {
    try {
      await testReportFailureNoPoison(token);
    } catch (e) {
      console.error('Integration error:', e.message);
      failed += 1;
    }
  } else {
    console.log('\n⏭  Integration skipped (no admin credentials)\n');
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
