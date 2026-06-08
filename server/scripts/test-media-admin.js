#!/usr/bin/env node
/**
 * Media admin API tests — module smoke + optional integration.
 *
 * Usage:
 *   node scripts/test-media-admin.js
 *
 * Env (integration — skipped if unset):
 *   TEST_BASE_URL
 *   TEST_ADMIN_TOKEN  OR  TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD
 *   TEST_DISPLAY_TOKEN
 *   TEST_MEDIA_PLAYLIST_ID   assigned playlist for display token
 *   TEST_WRONG_PLAYLIST_ID   unassigned playlist (defaults to 999999)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const DISPLAY_TOKEN = process.env.TEST_DISPLAY_TOKEN;
const ASSIGNED_PL_ID = process.env.TEST_MEDIA_PLAYLIST_ID;
const WRONG_PL_ID = process.env.TEST_WRONG_PLAYLIST_ID || '999999';

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

function request(method, urlPath, { body, token, headers = {}, rawBody } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`);
    const mod = url.protocol === 'https:' ? https : http;
    const payload = rawBody || (body ? JSON.stringify(body) : null);
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        ...(body && !rawBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
      timeout: 20000,
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

function multipartUpload(token, fieldName, filename, buffer, mime) {
  const boundary = `----test${Date.now()}`;
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(head), buffer, Buffer.from(tail)]);
  return request('POST', '/api/uploads', {
    token,
    rawBody: body,
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
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
  try {
    const access = require('../utils/mediaPlaylistAccess');
    assert('mediaPlaylistAccess exports getAllowedMediaPlaylistIds', typeof access.getAllowedMediaPlaylistIds === 'function');
    assert('mediaPlaylistAccess exports assertDisplayCanAccessPlaylist', typeof access.assertDisplayCanAccessPlaylist === 'function');
  } catch (e) {
    assert('mediaPlaylistAccess loads', false);
    console.error(e.message);
  }
}

async function integrationTests(token) {
  console.log('\n🔌  Integration tests\n');

  // Config endpoint
  const cfg = await request('GET', '/api/uploads/config', { token });
  assert('GET /uploads/config → 200', cfg.status === 200);
  assert('config has maxImageMb', cfg.json?.maxImageMb > 0);

  const stats = await request('GET', '/api/uploads/stats', { token });
  assert('GET /uploads/stats → 200', stats.status === 200);

  // Bad MIME
  const badMime = await multipartUpload(token, 'file', 'bad.txt', Buffer.from('hello'), 'text/plain');
  assert('bad MIME → 400', badMime.status === 400);

  // Image over limit (25 MB when default 20)
  const bigImage = Buffer.alloc(25 * 1024 * 1024, 0xff);
  bigImage[0] = 0xff; bigImage[1] = 0xd8; bigImage[2] = 0xff;
  const overImg = await multipartUpload(token, 'file', 'big.jpg', bigImage, 'image/jpeg');
  assert('image over limit → 413', overImg.status === 413);

  // Valid tiny PNG upload
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d,
    0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const upload = await multipartUpload(token, 'file', 'test-pixel.png', png, 'image/png');
  assert('valid upload → 201', upload.status === 201);
  const assetId = upload.json?.asset?.id;
  assert('upload returns asset id', !!assetId);

  if (assetId) {
    const usage = await request('GET', `/api/uploads/${assetId}/usage`, { token });
    assert('GET /uploads/:id/usage → 200', usage.status === 200);

    // Create temp playlist + item, then delete asset
    const pl = await request('POST', '/api/media-playlists', {
      token,
      body: { name: `test-media-${Date.now()}` },
    });
    const plId = pl.json?.playlist?.id;
    if (plId) {
      await request('POST', `/api/media-playlists/${plId}/items`, {
        token,
        body: { media_id: assetId, image_duration_seconds: 5 },
      });
      const del = await request('DELETE', `/api/uploads/${assetId}?confirm=true`, { token });
      assert('delete removes asset + playlist items → 200', del.status === 200);
      assert('delete reports removedFromPlaylists', Array.isArray(del.json?.removedFromPlaylists));
      await request('DELETE', `/api/media-playlists/${plId}`, { token });
    } else {
      await request('DELETE', `/api/uploads/${assetId}?confirm=true`, { token });
    }
  }

  // for-display access
  if (DISPLAY_TOKEN) {
    const denied = await request('GET', `/api/media-playlists/for-display/items?token=${DISPLAY_TOKEN}&playlist_id=${WRONG_PL_ID}`);
    assert('for-display wrong playlist → 403', denied.status === 403);
    assert('for-display denied code', denied.json?.code === 'PLAYLIST_ACCESS_DENIED');

    if (ASSIGNED_PL_ID) {
      const ok = await request('GET', `/api/media-playlists/for-display/items?token=${DISPLAY_TOKEN}&playlist_id=${ASSIGNED_PL_ID}`);
      assert('for-display assigned playlist → 200', ok.status === 200);
    }
  } else {
    console.log('  ⏭  Skipping for-display tests (TEST_DISPLAY_TOKEN unset)');
  }

  // Reorder + PUT scoping
  const pl2 = await request('POST', '/api/media-playlists', {
    token,
    body: { name: `test-reorder-${Date.now()}` },
  });
  const pl2Id = pl2.json?.playlist?.id;
  if (pl2Id) {
    const upA = await multipartUpload(token, 'file', 'reorder-a.png', png, 'image/png');
    const upB = await multipartUpload(token, 'file', 'reorder-b.png', png, 'image/png');
    const aidA = upA.json?.asset?.id;
    const aidB = upB.json?.asset?.id;
    const item1 = await request('POST', `/api/media-playlists/${pl2Id}/items`, {
      token, body: { media_id: aidA },
    });
    const item2 = await request('POST', `/api/media-playlists/${pl2Id}/items`, {
      token, body: { media_id: aidB },
    });
    const i1 = item1.json?.item?.id;
    const i2 = item2.json?.item?.id;

    if (i1 && i2) {
      const badReorder = await request('POST', `/api/media-playlists/${pl2Id}/items/reorder`, {
        token,
        body: { order: [{ id: 999999, sort_order: 0 }] },
      });
      assert('reorder foreign id → 400', badReorder.status === 400);

      const badPut = await request('PUT', `/api/media-playlists/${pl2Id}/items/${i1}`, {
        token,
        body: { image_duration_seconds: 10 },
      });
      // Wrong playlist in URL with valid item — use another playlist id
      const otherPl = await request('POST', '/api/media-playlists', {
        token, body: { name: `other-${Date.now()}` },
      });
      const otherId = otherPl.json?.playlist?.id;
      if (otherId) {
        const crossPut = await request('PUT', `/api/media-playlists/${otherId}/items/${i1}`, {
          token,
          body: { image_duration_seconds: 10 },
        });
        assert('PUT item wrong playlist → 404', crossPut.status === 404);
        await request('DELETE', `/api/media-playlists/${otherId}`, { token });
      }
      assert('PUT item in correct playlist → 200', badPut.status === 200);
    }

    await request('DELETE', `/api/media-playlists/${pl2Id}`, { token });
    if (aidA) await request('DELETE', `/api/uploads/${aidA}?confirm=true`, { token });
    if (aidB) await request('DELETE', `/api/uploads/${aidB}?confirm=true`, { token });
  }
}

async function main() {
  console.log(`\n🧪  Media admin tests (${BASE})\n`);
  moduleSmoke();

  const token = await loginAdmin();
  if (!token && !ADMIN_TOKEN) {
    console.log('\n⏭  Integration tests skipped (no admin credentials)\n');
  } else {
    const t = token || ADMIN_TOKEN;
    try {
      await integrationTests(t);
    } catch (e) {
      console.error('Integration error:', e.message);
      failed += 1;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
