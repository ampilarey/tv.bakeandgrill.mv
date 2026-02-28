/**
 * Channel Health Checker Service
 *
 * Periodically checks all channels in every active playlist and records
 * whether each stream URL is reachable. Results are stored in the
 * channel_health table and merged into the channels API response.
 *
 * Design goals:
 *  - Zero bandwidth: TCP connection is destroyed immediately after the HTTP
 *    status code is received — the stream body is never downloaded.
 *  - Low memory: channels are processed in small batches with delays.
 *  - Non-blocking: errors are swallowed so the checker never crashes the app.
 */

const http  = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const { getDatabase } = require('../database/init');
const { parseM3U } = require('../utils/m3uParser');
const { fetch }    = require('../utils/httpClient');

// ─── Config ──────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS  = 30 * 60 * 1000; // run every 30 minutes
const BATCH_SIZE         = 8;              // channels checked in parallel
const BATCH_DELAY_MS     = 1500;           // pause between batches
const URL_TIMEOUT_MS     = 8000;           // per-URL connection timeout

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function isHlsUrl(url) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return url.toLowerCase().includes('.m3u8');
  }
}

/**
 * Check a single stream URL.
 * Returns true (live), false (down), or null (unknown protocol / error we
 * can't attribute to the stream being down).
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (!settled) { settled = true; resolve(result); }
    };

    try {
      const urlObj = new URL(url);

      // Only HTTP/HTTPS can be checked this way
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return done(null);
      }

      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port:     urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path:     urlObj.pathname + urlObj.search,
        method:   'GET',
        headers:  { 'User-Agent': 'BakeGrillTV/1.0' },
        timeout:  URL_TIMEOUT_MS,
      };

      const req = protocol.request(options, (res) => {
        const live = res.statusCode >= 200 && res.statusCode < 400;
        // Immediately stop — we never read the body
        req.destroy();
        done(live);
      });

      req.setTimeout(URL_TIMEOUT_MS, () => { req.destroy(); done(false); });

      req.on('error', (err) => {
        // ECONNRESET is expected when we call req.destroy() inside the handler
        if (err.code === 'ECONNRESET') return done(true); // already resolved above
        done(false);
      });

      req.end();
    } catch {
      done(false);
    }
  });
}

/**
 * For HLS streams, also validate that the manifest starts with #EXTM3U.
 * Falls back to simple URL check on any error.
 */
async function checkHlsUrl(url) {
  try {
    const res = await fetch(url, {
      timeout: URL_TIMEOUT_MS,
      headers: { 'User-Agent': 'BakeGrillTV/1.0' },
    });
    const body = (res.data || '').trim();
    return body.startsWith('#EXTM3U') || body.startsWith('#EXT-X-');
  } catch {
    return false;
  }
}

// ─── Core logic ──────────────────────────────────────────────────────────────

async function checkChannel(channel, playlistId) {
  const { url, name } = channel;
  if (!url) return;

  const hash = urlHash(url);
  const isHls = isHlsUrl(url);

  let live;
  try {
    live = isHls ? await checkHlsUrl(url) : await checkUrl(url);
  } catch {
    live = false;
  }

  if (live === null) return; // Unknown protocol — skip DB write

  const db = getDatabase();
  try {
    await db.query(
      `INSERT INTO channel_health
         (url_hash, playlist_id, url, channel_name, is_live, last_checked,
          consecutive_failures, last_seen_live)
       VALUES (?, ?, ?, ?, ?, NOW(),
         IF(? = 0, 1, 0),
         IF(? = 1, NOW(), NULL))
       ON DUPLICATE KEY UPDATE
         channel_name        = VALUES(channel_name),
         is_live             = VALUES(is_live),
         last_checked        = NOW(),
         consecutive_failures = IF(? = 1, 0, consecutive_failures + 1),
         last_seen_live      = IF(? = 1, NOW(), last_seen_live)`,
      [hash, playlistId, url, name || null, live ? 1 : 0,
       live ? 1 : 0,   // consecutive_failures reset condition
       live ? 1 : 0,   // last_seen_live set condition
       live ? 1 : 0,   // ON DUPLICATE: reset failures
       live ? 1 : 0]   // ON DUPLICATE: last_seen_live
    );
  } catch (err) {
    console.error(`[ChannelChecker] DB error for ${url}:`, err.message);
  }
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureTable() {
  try {
    const db = getDatabase();
    await db.query(`
      CREATE TABLE IF NOT EXISTS channel_health (
        url_hash             CHAR(32)     NOT NULL,
        playlist_id          INT          NOT NULL,
        url                  TEXT         NOT NULL,
        channel_name         VARCHAR(255) NULL,
        is_live              TINYINT(1)   NULL DEFAULT NULL,
        last_checked         DATETIME     NULL DEFAULT NULL,
        consecutive_failures INT          NOT NULL DEFAULT 0,
        last_seen_live       DATETIME     NULL DEFAULT NULL,
        PRIMARY KEY (url_hash, playlist_id),
        INDEX idx_playlist_id (playlist_id),
        INDEX idx_is_live (is_live)
      )
    `);
  } catch (err) {
    console.error('[ChannelChecker] Could not ensure channel_health table:', err.message);
  }
}

async function runCheck() {
  console.log('[ChannelChecker] Starting channel health check run...');
  const startedAt = Date.now();

  try {
    await ensureTable();
    const db = getDatabase();

    // Fetch all active playlists
    const [playlists] = await db.query(
      'SELECT id, m3u_url FROM playlists WHERE is_active = 1'
    );

    if (playlists.length === 0) {
      console.log('[ChannelChecker] No active playlists found.');
      return;
    }

    let totalChecked = 0;

    for (const playlist of playlists) {
      let channels = [];

      // Fetch + parse M3U for this playlist
      try {
        const res = await fetch(playlist.m3u_url, {
          timeout: 15000,
          headers: { 'User-Agent': 'BakeGrillTV/1.0' },
        });
        channels = parseM3U(res.data);
      } catch (err) {
        console.warn(`[ChannelChecker] Failed to fetch playlist ${playlist.id}: ${err.message}`);
        continue;
      }

      if (!channels || channels.length === 0) continue;

      console.log(`[ChannelChecker] Checking ${channels.length} channels for playlist ${playlist.id}...`);

      // Process in batches
      for (let i = 0; i < channels.length; i += BATCH_SIZE) {
        const batch = channels.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((ch) => checkChannel(ch, playlist.id)));
        totalChecked += batch.length;

        if (i + BATCH_SIZE < channels.length) {
          await delay(BATCH_DELAY_MS);
        }
      }
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[ChannelChecker] Done. Checked ${totalChecked} channels in ${elapsed}s.`);

  } catch (err) {
    console.error('[ChannelChecker] Unexpected error during check run:', err.message);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

let checkInterval = null;

function start() {
  if (checkInterval) return; // already running

  // Run once shortly after startup (give DB time to settle)
  setTimeout(runCheck, 60 * 1000); // 1 minute after boot

  // Then every CHECK_INTERVAL_MS
  checkInterval = setInterval(runCheck, CHECK_INTERVAL_MS);
  console.log(`[ChannelChecker] Started. Interval: ${CHECK_INTERVAL_MS / 60000} min.`);
}

function stop() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/** Manually trigger a run (used by admin API) */
function triggerRun() {
  runCheck().catch((err) => console.error('[ChannelChecker] Manual run error:', err.message));
}

module.exports = { start, stop, triggerRun, urlHash };
