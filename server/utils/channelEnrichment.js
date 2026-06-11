const { urlHash, computePlayStatus, isHlsUrl } = require('../services/channelDiagnosis');
const { buildPlaybackProxyUrl } = require('./streamToken');
const { getDatabase } = require('../database/init');

function urlIsHttpScheme(url) {
  return /^http:/i.test(String(url || ''));
}

function channelNeedsReferrerOrUa(ch) {
  return !!(ch.requires_referrer || ch.requires_user_agent || ch.httpReferrer || ch.httpUserAgent);
}

/** Proxy only when required — HTTPS HLS plays direct in Safari / many CDNs. */
function shouldUsePlaybackProxy(ch, diagnosis) {
  if (diagnosis.is_http === 1 || urlIsHttpScheme(ch.url)) return true;
  if (channelNeedsReferrerOrUa(ch)) return true;
  if (diagnosis.needs_proxy !== 1) return false;
  const isHls =
    diagnosis.is_hls === 1 || (ch.url && isHlsUrl(ch.url));
  if (isHls && diagnosis.is_http !== 1 && !channelNeedsReferrerOrUa(ch)) {
    return false;
  }
  return true;
}

function normalizeStoredNeedsProxy(stored, ch, health) {
  const inferred =
    (health?.is_http === 1 || urlIsHttpScheme(ch.url) || channelNeedsReferrerOrUa(ch)) ? 1 : 0;
  if (stored == null) return inferred;
  if (stored === 1) {
    const isHls = health?.is_hls === 1 || (ch.url && isHlsUrl(ch.url));
    if (isHls && health?.is_http !== 1 && !channelNeedsReferrerOrUa(ch)) return inferred;
  }
  return stored;
}

/** Kiosk auto-play: only health-checked playable channels. */
function isStrictlyPlayable(channel) {
  if (!channel || channel.is_hidden === 1) return false;
  return channel.play_status === 'playable';
}

/** Watch page "Playable only" — includes undiagnosed streams users can still try. */
function isVisibleInPlayableFilter(channel) {
  if (!channel || channel.is_hidden === 1) return false;
  if (channel.play_status === 'playable') return true;
  if (channel.play_status === 'unknown' || channel.play_status === 'needs_recheck') {
    return !!(channel.playback_url || channel.url);
  }
  // Server probe may fail from the host while the stream works in the user's browser.
  if (channel.play_status === 'offline' && (channel.playback_url || channel.url) && channel.is_drm !== 1) {
    return true;
  }
  return false;
}

function enrichChannel(ch, health, override, playlist, req) {
  const hash = ch.url ? urlHash(ch.url) : null;
  const h = health || {};
  const o = override || {};

  const urlIsHttp = h.is_http === 1 || (h.is_http == null && urlIsHttpScheme(ch.url));
  const urlIsHls = ch.url ? isHlsUrl(ch.url) : false;
  const healthIsHls = h.is_hls === 1;
  const inferredNeedsProxy =
    urlIsHttp || channelNeedsReferrerOrUa(ch) ? 1 : 0;

  const diagnosis = {
    is_live: h.is_live ?? null,
    last_checked: h.last_checked ?? null,
    failure_reason_code: h.failure_reason_code ?? null,
    failure_message: h.failure_message ?? null,
    failure_stage: h.failure_stage ?? null,
    last_device_type: h.last_device_type ?? null,
    last_client_failure_reason: h.last_client_failure_reason ?? null,
    last_client_failure_stage: h.last_client_failure_stage ?? null,
    client_failure_count: h.client_failure_count ?? 0,
    playable_ios: h.playable_ios ?? null,
    playable_android_chrome: h.playable_android_chrome ?? null,
    playable_desktop_chrome: h.playable_desktop_chrome ?? null,
    playable_tv_browser: h.playable_tv_browser ?? null,
    needs_proxy: normalizeStoredNeedsProxy(h.needs_proxy, ch, h) ?? inferredNeedsProxy,
    is_drm: h.is_drm ?? 0,
    is_hls: h.is_hls ?? (urlIsHls ? 1 : 0),
    is_http: urlIsHttp ? 1 : 0,
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
    const useProxy = shouldUsePlaybackProxy(ch, diagnosis);
    playback_url = useProxy
      ? buildPlaybackProxyUrl(ch.id, playlist.id, hash, req)
      : ch.url;
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
      `SELECT url_hash, is_live, last_checked, failure_reason_code, failure_message, failure_stage,
              last_device_type, last_client_failure_reason, last_client_failure_stage, client_failure_count,
              playable_ios, playable_android_chrome, playable_desktop_chrome,
              playable_tv_browser, needs_proxy, is_drm, is_hls, manifest_reachable, first_segment_reachable, is_http
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

  const mode = playableOnly === true ? 'soft' : playableOnly;
  if (mode === 'strict') {
    enriched = enriched.filter(isStrictlyPlayable);
  } else if (mode === 'soft') {
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
  isStrictlyPlayable,
  isVisibleInPlayableFilter,
  shouldUsePlaybackProxy,
};
