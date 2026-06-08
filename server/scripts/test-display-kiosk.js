#!/usr/bin/env node
/**
 * Display kiosk pairing + remote control integration tests.
 *
 * Usage:
 *   node scripts/test-display-kiosk.js
 *
 * Env (integration — skipped if unset):
 *   TEST_BASE_URL          e.g. http://localhost:4000
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD  OR  TEST_ADMIN_TOKEN
 *   TEST_PLAYLIST_ID       playlist id for pairing (required for full flow)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const https = require('https');

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const PLAYLIST_ID = parseInt(process.env.TEST_PLAYLIST_ID || '1', 10);

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

function testModuleSmoke() {
  console.log('\nmodule smoke');
  const displaysRouter = require('../routes/displays');
  assert('displayTokenKey exported', typeof displaysRouter.displayTokenKey === 'function');
  const fakeReq = { params: { token: 'abc' }, ip: '1.2.3.4' };
  assert('displayTokenKey prefers param token', displaysRouter.displayTokenKey(fakeReq) === 'abc');
  assert('displayTokenKey falls back to IP', displaysRouter.displayTokenKey({ ip: '9.9.9.9' }) === '9.9.9.9');
}

async function testRateLimitPerToken(adminToken, tokenA, tokenB) {
  console.log('\nrate limit (dual token)');
  if (!tokenA || !tokenB) {
    console.log('  (skipped — need two display tokens from integration)');
    return;
  }

  let hitsA = 0;
  let hitsB = 0;
  let rateLimited = 0;

  const polls = [];
  for (let i = 0; i < 35; i++) {
    polls.push(request('GET', `/api/displays/commands/${tokenA}`));
    polls.push(request('GET', `/api/displays/commands/${tokenB}`));
  }

  const results = await Promise.all(polls);
  for (const r of results) {
    if (r.status === 200) {
      if (r.raw.includes(tokenA)) hitsA += 1;
      hitsB += 1;
    } else if (r.status === 429) {
      rateLimited += 1;
    }
  }

  assert('no 429 during dual-token burst', rateLimited === 0);
  assert('received 200 responses', results.filter((r) => r.status === 200).length > 50);
}

async function testIntegration() {
  const adminToken = await loginAdmin();
  if (!adminToken) {
    console.log('\nintegration (skipped — set TEST_ADMIN_TOKEN or TEST_ADMIN_EMAIL/PASSWORD)');
    return { tokenA: null, tokenB: null };
  }

  console.log('\nintegration');

  const pinRes = await request('POST', '/api/pairing/request-pin');
  assert('request-pin returns 200', pinRes.status === 200 && pinRes.json?.pin);
  const pin = pinRes.json?.pin;

  const pairRes = await request('POST', '/api/pairing/admin-pair-pin', {
    token: adminToken,
    body: {
      pin,
      name: `Test Display ${Date.now()}`,
      location: 'Test',
      playlist_id: PLAYLIST_ID,
      playlist_ids: [PLAYLIST_ID],
    },
  });
  assert('admin-pair-pin succeeds', pairRes.status === 200 && pairRes.json?.display?.token);
  const displayToken = pairRes.json?.display?.token;
  const displayId = pairRes.json?.display?.id;

  const verifyRes = await request('POST', '/api/displays/verify', { body: { token: displayToken } });
  assert('display verify succeeds', verifyRes.status === 200 && verifyRes.json?.success);

  const hbRes = await request('POST', '/api/displays/heartbeat', {
    body: { token: displayToken, status: 'playing', appVersion: 'test', uptime: 60 },
  });
  assert('heartbeat succeeds', hbRes.status === 200);

  const ctrlRes = await request('POST', `/api/displays/${displayId}/control`, {
    token: adminToken,
    body: { action: 'sync_now' },
  });
  assert('admin control queues command', ctrlRes.status === 201 && ctrlRes.json?.command?.id);

  const cmdRes = await request('GET', `/api/displays/commands/${displayToken}`);
  assert('display fetches commands', cmdRes.status === 200);
  const cmd = (cmdRes.json?.commands || [])[0];
  assert('pending command present', !!cmd);

  if (cmd) {
    const execRes = await request('PATCH', `/api/displays/commands/${cmd.id}/execute`, {
      body: { token: displayToken, status: 'executed', app_version: 'test' },
    });
    assert('mark command executed', execRes.status === 200);

    const ctrl2 = await request('POST', `/api/displays/${displayId}/control`, {
      token: adminToken,
      body: { action: 'sync_now' },
    });
    const cmd2 = ctrl2.json?.command;
    if (cmd2?.id) {
      const failRes = await request('PATCH', `/api/displays/commands/${cmd2.id}/execute`, {
        body: {
          token: displayToken,
          status: 'failed',
          error_code: 'TEST_FAIL',
          error_message: 'Intentional test failure',
          app_version: 'test',
        },
      });
      assert('mark command failed', failRes.status === 200);
    }
  }

  const pinRes2 = await request('POST', '/api/pairing/request-pin');
  const pin2 = pinRes2.json?.pin;
  const pairRes2 = await request('POST', '/api/pairing/admin-pair-pin', {
    token: adminToken,
    body: {
      pin: pin2,
      name: `Test Display B ${Date.now()}`,
      location: 'Test',
      playlist_id: PLAYLIST_ID,
      playlist_ids: [PLAYLIST_ID],
    },
  });
  const displayTokenB = pairRes2.json?.display?.token;

  return { tokenA: displayToken, tokenB: displayTokenB || displayToken };
}

async function run() {
  console.log(`\n🔍  Display kiosk tests (${BASE})\n`);
  testModuleSmoke();

  let tokens = { tokenA: null, tokenB: null };
  try {
    tokens = await testIntegration();
  } catch (err) {
    console.error(`  ❌  integration error: ${err.message}`);
    failed += 1;
  }

  try {
    const adminToken = await loginAdmin();
    if (adminToken && tokens.tokenA) {
      await testRateLimitPerToken(adminToken, tokens.tokenA, tokens.tokenB);
    }
  } catch (err) {
    console.error(`  ❌  rate limit test error: ${err.message}`);
    failed += 1;
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
