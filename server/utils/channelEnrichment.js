const { urlHash, computePlayStatus } = require('../services/channelDiagnosis');
const { buildPlaybackProxyUrl } = require('./streamToken');
const { getDatabase } = require('../database/init');

/** Channels worth showing in "Playable only" — includes undiagnosed streams users can still try. */
function isVisibleInPlayableFilter(channel) {
  if (!channel || channel.is_hidden === 1) return false;
  if (channel.play_status === 'playable') return true;
  if (channel.play_status === 'unknown' || channel.play_status === 'needs_recheck') {
    return !!(channel.playback_url || channel.url);
  }
  return false;
}

function enrichChannel(ch, health, override, playlist, req) {
  const hash = ch.url ? urlHash(ch.url) : null;
  const h = health || {};
  const o = override || {};

  const diagnosis = {
    is_live: h.is_live ?? null,
    last_checked: h.last_checked ?? null,
    failure_reason_code: h.failure_reason_code ?? null,
    failure_message: h.failure_message ?? null,
    playable_ios: h.playable_ios ?? null,
    playable_android_chrome: h.playable_android_chrome ?? null,
    playable_desktop_chrome: h.playable_desktop_chrome ?? null,
    playable_tv_browser: h.playable_tv_browser ?? null,
    needs_proxy: h.needs_proxy ?? (ch.requires_referrer || ch.requires_user_agent ? 1 : 0),
    is_drm: h.is_drm ?? 0,
    manifest_reachable: h.manifest_reachable ?? null,
    first_segment_reachable: h.first_segment_reachable ?? null,
    is_hidden: o.is_hidden ?? 0,
    is_trusted: o.is_trusted ?? 1,
  };

  const play_status = computePlayStatus(
    { ...diagnosis, last_checked: h.last_checked },
    o
  );

  let playback_url = null;
  if (!diagnosis.is_drm && play_status !== 'blocked' && ch.url) {
    const needsProxy =
      diagnosis.needs_proxy ||
      (h.is_http === 1) ||
      ch.requires_referrer ||
      ch.requires_user_agent;

    if (needsProxy && play_status !== 'offline') {
      playback_url = buildPlaybackProxyUrl(ch.id, playlist.id, hash, req);
    } else if (play_status === 'playable' || play_status === 'unknown' || play_status === 'needs_recheck') {
      playback_url = ch.url;
    }
  }

  return {
    ...ch,
    ...diagnosis,
    play_status,
    playback_url,
  };
}

async function loadHealthAndOverrides(playlistId) {
  const db = getDatabase();
  let healthMap = new Map();
  let overrideMap = new Map();

  try {
    const [healthRows] = await db.query(
      `SELECT url_hash, is_live, last_checked, failure_reason_code, failure_message,
              playable_ios, playable_android_chrome, playable_desktop_chrome, playable_tv_browser,
              needs_proxy, is_drm, manifest_reachable, first_segment_reachable, is_http
       FROM channel_health WHERE playlist_id = ?`,
      [playlistId]
    );
    healthMap = new Map(healthRows.map((r) => [r.url_hash, r]));

    const [overrideRows] = await db.query(
      'SELECT url_hash, is_hidden, is_trusted FROM channel_overrides WHERE playlist_id = ?',
      [playlistId]
    );
    overrideMap = new Map(overrideRows.map((r) => [r.url_hash, r]));
  } catch (err) {
    console.warn('[channelEnrichment] Could not load health/override:', err.message);
  }

  return { healthMap, overrideMap };
}

async function enrichChannelsForPlaylist(channels, playlist, req, { hideHidden = true, playableOnly = false } = {}) {
  if (!channels?.length || !playlist) return channels || [];

  const { healthMap, overrideMap } = await loadHealthAndOverrides(playlist.id);

  let enriched = channels.map((ch) => {
    const hash = ch.url ? urlHash(ch.url) : null;
    return enrichChannel(
      ch,
      hash ? healthMap.get(hash) : null,
      hash ? overrideMap.get(hash) : null,
      playlist,
      req
    );
  });

  if (playlist.trusted_streams_only) {
    enriched = enriched.filter((c) => c.is_trusted !== 0);
  }
  if (hideHidden) {
    enriched = enriched.filter((c) => c.is_hidden !== 1);
  }
  if (playableOnly) {
    enriched = enriched.filter(isVisibleInPlayableFilter);
  } else {
    enriched.sort((a, b) => {
      const order = { playable: 0, unknown: 1, needs_recheck: 2, unsupported: 3, offline: 4, blocked: 5 };
      return (order[a.play_status] ?? 9) - (order[b.play_status] ?? 9) || a.name.localeCompare(b.name);
    });
  }

  return enriched;
}

module.exports = {
  enrichChannel,
  enrichChannelsForPlaylist,
  loadHealthAndOverrides,
  isVisibleInPlayableFilter,
};
