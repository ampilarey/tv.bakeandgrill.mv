/**
 * Channel Health Checker Service
 *
 * Periodically diagnoses all channels in active playlists using deep probes
 * (manifest + segment reachability, codec detection, DRM flags).
 */

const { getDatabase } = require('../database/init');
const { diagnoseAndPersist, urlHash } = require('./channelDiagnosis');

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const BATCH_SIZE = 6;
const BATCH_DELAY_MS = 2000;

async function checkChannel(channel, playlistId) {
  if (!channel?.url) return;
  try {
    await diagnoseAndPersist(channel, playlistId);
  } catch (err) {
    console.error(`[ChannelChecker] Diagnosis error for channel: ${err.message}`);
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

const { parseM3U, playlistBaseUrl } = require('../utils/m3uParser');
const { getRawMergedChannels } = require('../utils/playlistChannelMerge');

async function fetchChannelsForPlaylist(playlist) {
  const { channels } = await getRawMergedChannels(playlist.id);
  return channels;
}

async function runCheck() {
  console.log('[ChannelChecker] Starting channel health check run...');
  const startedAt = Date.now();

  try {
    await ensureTable();
    const db = getDatabase();
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
      try {
        channels = await fetchChannelsForPlaylist(playlist);
      } catch (err) {
        console.warn(`[ChannelChecker] Failed to fetch playlist ${playlist.id}: ${err.message}`);
        continue;
      }

      if (!channels.length) continue;

      console.log(`[ChannelChecker] Diagnosing ${channels.length} channels for playlist ${playlist.id}...`);

      for (let i = 0; i < channels.length; i += BATCH_SIZE) {
        const batch = channels.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((ch) => checkChannel(ch, playlist.id)));
        totalChecked += batch.length;
        if (i + BATCH_SIZE < channels.length) await delay(BATCH_DELAY_MS);
      }
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[ChannelChecker] Done. Checked ${totalChecked} channels in ${elapsed}s.`);
  } catch (err) {
    console.error('[ChannelChecker] Unexpected error during check run:', err.message);
  }
}

let checkInterval = null;

function start() {
  if (checkInterval) return;
  setTimeout(runCheck, 60 * 1000);
  checkInterval = setInterval(runCheck, CHECK_INTERVAL_MS);
  console.log(`[ChannelChecker] Started. Interval: ${CHECK_INTERVAL_MS / 60000} min.`);
}

function stop() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function triggerRun() {
  runCheck().catch((err) => console.error('[ChannelChecker] Manual run error:', err.message));
}

async function recheckPlaylist(playlist) {
  await ensureTable();
  let channels = [];
  try {
    channels = await fetchChannelsForPlaylist(playlist);
  } catch (err) {
    console.warn(`[ChannelChecker] recheckPlaylist fetch error: ${err.message}`);
    return;
  }
  if (!channels.length) return;
  console.log(`[ChannelChecker] Manual recheck: ${channels.length} channels for playlist ${playlist.id}`);
  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((ch) => checkChannel(ch, playlist.id)));
    if (i + BATCH_SIZE < channels.length) await delay(BATCH_DELAY_MS);
  }
  console.log(`[ChannelChecker] Manual recheck done for playlist ${playlist.id}`);
}

async function recheckSingleChannel(playlist, channelId) {
  await ensureTable();
  const channels = await fetchChannelsForPlaylist(playlist);
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) throw new Error('Channel not found in playlist');
  return diagnoseAndPersist(channel, playlist.id);
}

module.exports = {
  start,
  stop,
  triggerRun,
  recheckPlaylist,
  recheckSingleChannel,
  urlHash,
  fetchChannelsForPlaylist,
};
