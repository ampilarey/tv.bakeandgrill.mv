const { fetch } = require('./httpClient');
const { parseM3U, playlistBaseUrl } = require('./m3uParser');
const m3uCache = require('./m3uCache');
const { getDatabase } = require('../database/init');

async function getPlaylistChannels(playlistId) {
  const db = getDatabase();
  const [playlists] = await db.query(
    'SELECT * FROM playlists WHERE id = ? AND is_active = TRUE',
    [playlistId]
  );
  if (!playlists.length) return { playlist: null, channels: [] };

  const playlist = playlists[0];
  let channels = m3uCache.get(playlistId, playlist.m3u_url);

  if (!channels) {
    const response = await fetch(playlist.m3u_url, {
      timeout: 10000,
      headers: { 'User-Agent': 'BakeGrillTV/1.0' },
    });
    channels = parseM3U(response.data, playlistBaseUrl(playlist.m3u_url));
    if (channels?.length) m3uCache.set(playlistId, playlist.m3u_url, channels);
  }

  return { playlist, channels: channels || [] };
}

async function resolveChannel(playlistId, channelId) {
  const { playlist, channels } = await getPlaylistChannels(playlistId);
  if (!playlist) return null;
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return null;
  return { playlist, channel };
}

module.exports = { getPlaylistChannels, resolveChannel };
