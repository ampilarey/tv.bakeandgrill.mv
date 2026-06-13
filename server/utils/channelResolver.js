const { getRawMergedChannels, findChannelInMerged } = require('./playlistChannelMerge');
const { parseDirectChannelId } = require('../services/directChannelService');

function normalizeChannelIdForPlaylist(channelId, playlistId) {
  if (!channelId) return channelId;
  const id = String(channelId);
  const prefix = `${playlistId}-`;
  if (id.startsWith(prefix)) return id.slice(prefix.length);
  return id;
}

async function getPlaylistChannels(playlistId) {
  const { playlist, channels } = await getRawMergedChannels(playlistId);
  return { playlist, channels };
}

async function resolveChannel(playlistId, channelId) {
  const normalizedId = normalizeChannelIdForPlaylist(channelId, playlistId);
  const { playlist, channels } = await getRawMergedChannels(playlistId);
  if (!playlist) return null;

  let channel = channels.find((c) => c.id === channelId || c.id === normalizedId);
  if (!channel && parseDirectChannelId(normalizedId)) {
    channel = channels.find((c) => c.id === `direct-${parseDirectChannelId(normalizedId)}`);
  }
  if (!channel) return null;
  return { playlist, channel };
}

module.exports = { getPlaylistChannels, resolveChannel, normalizeChannelIdForPlaylist };
