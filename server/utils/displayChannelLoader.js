const { enrichChannelsForPlaylist } = require('./channelEnrichment');
const { getRawMergedChannels } = require('./playlistChannelMerge');

function normalizePlaylistIds(body, fallbackSingle) {
  const raw = body?.playlist_ids ?? body?.playlistIds;
  if (Array.isArray(raw) && raw.length) {
    return [...new Set(raw.map((id) => parseInt(id, 10)).filter((id) => id > 0))];
  }
  const single = parseInt(body?.playlist_id ?? fallbackSingle, 10);
  return single > 0 ? [single] : [];
}

async function getDisplayPlaylistIds(db, display) {
  const ordered = [];
  const seen = new Set();

  const add = (id) => {
    const n = parseInt(id, 10);
    if (n > 0 && !seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  };

  if (display.playlist_id) add(display.playlist_id);

  try {
    const [rows] = await db.query(
      'SELECT playlist_id FROM display_playlists WHERE display_id = ? ORDER BY sort_order ASC, playlist_id ASC',
      [display.id]
    );
    rows.forEach((r) => add(r.playlist_id));
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  return ordered;
}

async function syncDisplayPlaylists(dbOrConn, displayId, playlistIds) {
  const ids = [...new Set(playlistIds.map((id) => parseInt(id, 10)).filter((id) => id > 0))];
  if (!ids.length) return ids;

  try {
    await dbOrConn.query('DELETE FROM display_playlists WHERE display_id = ?', [displayId]);
    for (let i = 0; i < ids.length; i += 1) {
      await dbOrConn.query(
        'INSERT INTO display_playlists (display_id, playlist_id, sort_order) VALUES (?, ?, ?)',
        [displayId, ids[i], i]
      );
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  return ids;
}

async function loadDisplayChannels(db, display, req, { playableOnly = 'soft' } = {}) {
  const playlistIds = await getDisplayPlaylistIds(db, display);
  let primaryPlaylist = null;
  const allEnriched = [];
  const kioskChannels = [];
  const seenAll = new Set();
  const seenKiosk = new Set();
  const multi = playlistIds.length > 1;

  for (const pid of playlistIds) {
    try {
      const { playlist, channels } = await getRawMergedChannels(pid);
      if (!playlist) continue;
      if (!primaryPlaylist) primaryPlaylist = playlist;
      if (!channels.length) continue;

      const tagged = channels.map((ch) => ({
        ...ch,
        id: multi ? `${pid}-${ch.id}` : ch.id,
        source_playlist_id: pid,
        source_playlist_name: playlist.name,
        group: multi && ch.group ? `${playlist.name} · ${ch.group}` : (ch.group || playlist.name),
      }));

      const all = await enrichChannelsForPlaylist(tagged, playlist, req, {
        hideHidden: true,
        playableOnly: false,
      });
      const kiosk = await enrichChannelsForPlaylist(tagged, playlist, req, {
        hideHidden: true,
        playableOnly,
      });

      for (const ch of all) {
        if (!seenAll.has(ch.id)) {
          seenAll.add(ch.id);
          allEnriched.push(ch);
        }
      }
      for (const ch of kiosk) {
        if (!seenKiosk.has(ch.id)) {
          seenKiosk.add(ch.id);
          kioskChannels.push(ch);
        }
      }
    } catch (err) {
      console.error(`[displayChannelLoader] playlist ${pid}:`, err.message);
    }
  }

  return {
    playlistIds,
    playlist: primaryPlaylist,
    channels: kioskChannels,
    allEnriched,
  };
}

async function findChannelForDisplay(db, display, channelId, req) {
  const { allEnriched } = await loadDisplayChannels(db, display, req, { playableOnly: false });
  const id = String(channelId);
  return allEnriched.find((c) => String(c.id) === id) || null;
}

module.exports = {
  normalizePlaylistIds,
  getDisplayPlaylistIds,
  syncDisplayPlaylists,
  loadDisplayChannels,
  findChannelForDisplay,
};
