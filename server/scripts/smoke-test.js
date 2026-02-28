#!/usr/bin/env node
/**
 * Smoke test — verifies the live server is healthy.
 *
 * Usage:
 *   node server/scripts/smoke-test.js [base-url]
 *
 * Examples:
 *   node server/scripts/smoke-test.js                          # defaults to localhost:4000
 *   node server/scripts/smoke-test.js https://tv.bakeandgrill.mv
 */

const https = require('https');
const http  = require('http');
const url   = require('url');

const BASE = process.argv[2] || 'http://localhost:4000';

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const full   = `${BASE}${endpoint}`;
    const parsed = url.parse(full);
    const mod    = parsed.protocol === 'https:' ? https : http;

    const req = mod.get(full, { timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function run() {
  console.log(`\n🔍  Smoke-testing ${BASE}\n`);
  let passed = 0;
  let failed = 0;

  async function check(label, endpoint, expect) {
    try {
      const { status, body } = await get(endpoint);
      const json = JSON.parse(body);
      const ok = expect(status, json);
      if (ok) {
        console.log(`  ✅  ${label}`);
        passed++;
      } else {
        console.error(`  ❌  ${label}  (status=${status})`);
        failed++;
      }
    } catch (err) {
      console.error(`  ❌  ${label}  — ${err.message}`);
      failed++;
    }
  }

  await check('/api/health returns 200 + ok status', '/api/health',
    (s, j) => s === 200 && j.status === 'ok');

  await check('/api/version returns version string', '/api/version',
    (s, j) => s === 200 && typeof j.version === 'string');

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err.message); process.exit(1); });
