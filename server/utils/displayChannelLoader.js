const { parseM3U, playlistBaseUrl } = require('./m3uParser');
const { enrichChannelsForPlaylist } = require('./channelEnrichment');
const { fetch } = require('./httpClient');

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
  const seenIds = new Set();
  const multi = playlistIds.length > 1;

  for (const pid of playlistIds) {
    const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [pid]);
    const playlist = playlists[0];
    if (!playlist?.m3u_url) continue;
    if (!primaryPlaylist) primaryPlaylist = playlist;

    try {
      const m3uResponse = await fetch(playlist.m3u_url, {
        timeout: 10000,
        headers: { 'User-Agent': 'BakeGrillTV/1.0' },
      });
      const parsed = parseM3U(m3uResponse.data, playlistBaseUrl(playlist.m3u_url));
      const tagged = parsed.map((ch) => ({
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
        if (!seenIds.has(ch.id)) {
          seenIds.add(ch.id);
          allEnriched.push(ch);
        }
      }
      for (const ch of kiosk) {
        if (!seenIds.has(`k-${ch.id}`)) {
          seenIds.add(`k-${ch.id}`);
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
