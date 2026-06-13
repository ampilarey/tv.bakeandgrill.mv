const { fetch } = require('./httpClient');
const { parseM3U, playlistBaseUrl } = require('./m3uParser');
const m3uCache = require('./m3uCache');
const { getDatabase } = require('../database/init');
const { enrichChannelsForPlaylist } = require('./channelEnrichment');
const { loadDirectChannelsForPlaylist } = require('../services/directChannelService');

async function fetchM3uChannels(playlist) {
  if (!playlist?.m3u_url) return [];

  let channels = m3uCache.get(playlist.id, playlist.m3u_url);
  if (!channels) {
    const response = await fetch(playlist.m3u_url, {
      timeout: 10000,
      headers: { 'User-Agent': 'BakeGrillTV/1.0' },
    });
    channels = parseM3U(response.data, playlistBaseUrl(playlist.m3u_url));
    if (channels?.length) {
      m3uCache.set(playlist.id, playlist.m3u_url, channels);
    } else {
      channels = [];
    }
  }
  return channels || [];
}

async function getRawMergedChannels(playlistId, { activeDirectOnly = true } = {}) {
  const db = getDatabase();
  const [playlists] = await db.query(
    'SELECT * FROM playlists WHERE id = ? AND is_active = TRUE',
    [playlistId]
  );
  if (!playlists.length) return { playlist: null, channels: [] };

  const playlist = playlists[0];
  const m3uChannels = await fetchM3uChannels(playlist);
  const directChannels = await loadDirectChannelsForPlaylist(playlistId, { activeOnly: activeDirectOnly });

  const channels = [...m3uChannels, ...directChannels].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0) || a.name.localeCompare(b.name)
  );

  return { playlist, channels };
}

async function getPlaylistChannelsMerged(playlistId, req, options = {}) {
  const { playlist, channels } = await getRawMergedChannels(playlistId, options);
  if (!playlist) return { playlist: null, channels: [] };

  const enriched = await enrichChannelsForPlaylist(channels, playlist, req, options);
  return { playlist, channels: enriched };
}

async function findChannelInMerged(playlistId, channelId, req) {
  const { playlist, channels } = await getPlaylistChannelsMerged(playlistId, req, {});
  if (!playlist) return null;
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return null;
  return { playlist, channel };
}

module.exports = {
  fetchM3uChannels,
  getRawMergedChannels,
  getPlaylistChannelsMerged,
  findChannelInMerged,
};
