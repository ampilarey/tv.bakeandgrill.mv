const crypto = require('crypto');
const { URL } = require('url');
const { getDatabase } = require('../database/init');
const { classifyPlaylistContent, isHlsPlaylistType } = require('../utils/playlistClassifier');
const { isHlsUrl } = require('../services/channelDiagnosis');

const DIRECT_STREAMS_PLAYLIST_NAME = 'Direct Streams';

function normalizeStreamUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    u.hash = '';
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    u.pathname = path;
    return u.toString();
  } catch {
    return trimmed;
  }
}

function streamUrlHash(url) {
  return crypto.createHash('md5').update(normalizeStreamUrl(url)).digest('hex');
}

function parseDirectChannelId(channelId) {
  if (!channelId || typeof channelId !== 'string') return null;
  const m = channelId.match(/^direct-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function directChannelApiId(dbId) {
  return `direct-${dbId}`;
}

function detectStreamType(url, body = null) {
  const lower = String(url || '').toLowerCase();
  if (body) {
    const cls = classifyPlaylistContent(body, url);
    if (isHlsPlaylistType(cls.type)) return 'hls';
  }
  if (lower.includes('.m3u8') || lower.includes('.m3u') || /[?&](format|type|output)=m3u8/.test(lower)) {
    return 'hls';
  }
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lower)) return 'mp4';
  if (/^https?:\/\//i.test(lower)) return 'web_video';
  return 'unknown';
}

function toChannelObject(row) {
  if (!row) return null;
  return {
    id: directChannelApiId(row.id),
    direct_db_id: row.id,
    name: row.name,
    url: row.stream_url,
    originalUrl: row.stream_url,
    group: row.group_name || 'Direct Streams',
    logo: row.logo_url || null,
    source_type: 'direct_stream',
    source_playlist_id: row.playlist_id,
    stream_type: row.stream_type,
    playback_mode: row.playback_mode || 'auto',
    httpUserAgent: row.http_user_agent || null,
    httpReferrer: row.http_referer || null,
    requires_user_agent: !!row.http_user_agent,
    requires_referrer: !!row.http_referer,
    is_active: row.is_active !== 0,
    index: row.sort_order ?? 0,
    unsupported_protocol: false,
  };
}

async function ensureDirectStreamsPlaylist(db = null) {
  const database = db || getDatabase();
  const envId = parseInt(process.env.DIRECT_STREAMS_PLAYLIST_ID || '', 10);
  if (envId) {
    const [rows] = await database.query(
      'SELECT * FROM playlists WHERE id = ? AND is_active = TRUE',
      [envId]
    );
    if (rows.length) return rows[0];
  }

  const [existing] = await database.query(
    `SELECT * FROM playlists WHERE name = ? AND playlist_kind = 'direct_only' AND is_active = TRUE LIMIT 1`,
    [DIRECT_STREAMS_PLAYLIST_NAME]
  );
  if (existing.length) return existing[0];

  const [result] = await database.query(
    `INSERT INTO playlists (name, m3u_url, description, playlist_kind, is_active)
     VALUES (?, NULL, ?, 'direct_only', TRUE)`,
    [DIRECT_STREAMS_PLAYLIST_NAME, 'Manually added direct HLS and video streams']
  );
  const [created] = await database.query('SELECT * FROM playlists WHERE id = ?', [result.insertId]);
  return created[0];
}

async function loadDirectChannelsForPlaylist(playlistId, { activeOnly = true } = {}) {
  const db = getDatabase();
  let sql = 'SELECT * FROM direct_channels WHERE playlist_id = ?';
  const params = [playlistId];
  if (activeOnly) {
    sql += ' AND is_active = 1';
  }
  sql += ' ORDER BY sort_order ASC, id ASC';
  const [rows] = await db.query(sql, params);
  return rows.map(toChannelObject);
}

async function getDirectChannelByApiId(apiId) {
  const dbId = parseDirectChannelId(apiId);
  if (!dbId) return null;
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM direct_channels WHERE id = ?', [dbId]);
  return rows[0] || null;
}

async function findDuplicates(playlistId, streamUrl) {
  const db = getDatabase();
  const hash = streamUrlHash(streamUrl);
  const [samePlaylist] = await db.query(
    'SELECT id, name, playlist_id FROM direct_channels WHERE playlist_id = ? AND stream_url_hash = ?',
    [playlistId, hash]
  );
  const [otherPlaylists] = await db.query(
    `SELECT dc.id, dc.name, dc.playlist_id, p.name AS playlist_name
     FROM direct_channels dc
     JOIN playlists p ON p.id = dc.playlist_id
     WHERE dc.stream_url_hash = ? AND dc.playlist_id != ?`,
    [hash, playlistId]
  );
  return { hash, samePlaylist, otherPlaylists };
}

async function checkReferencesBeforeDelete(dbId) {
  const apiId = directChannelApiId(dbId);
  const db = getDatabase();
  const refs = [];

  const [row] = await db.query('SELECT playlist_id, name FROM direct_channels WHERE id = ?', [dbId]);
  if (!row.length) return { found: false, refs: [] };
  const { playlist_id: playlistId, name } = row[0];

  const [favs] = await db.query(
    'SELECT COUNT(*) AS c FROM favorites WHERE playlist_id = ? AND channel_id = ?',
    [playlistId, apiId]
  );
  if (favs[0].c > 0) refs.push({ type: 'favorites', count: favs[0].c });

  const [hist] = await db.query(
    'SELECT COUNT(*) AS c FROM watch_history WHERE playlist_id = ? AND channel_id = ?',
    [playlistId, apiId]
  );
  if (hist[0].c > 0) refs.push({ type: 'watch_history', count: hist[0].c });

  const [sched] = await db.query(
    'SELECT COUNT(*) AS c FROM display_schedules WHERE playlist_id = ? AND channel_id = ?',
    [playlistId, apiId]
  );
  if (sched[0].c > 0) refs.push({ type: 'display_schedules', count: sched[0].c });

  const [displays] = await db.query(
    'SELECT COUNT(*) AS c FROM displays WHERE current_channel_id = ?',
    [apiId]
  );
  if (displays[0].c > 0) refs.push({ type: 'displays_current', count: displays[0].c });

  return { found: true, name, refs };
}

async function createDirectChannel(data, userId) {
  const db = getDatabase();
  const normalized = normalizeStreamUrl(data.stream_url);
  const hash = streamUrlHash(normalized);
  const dup = await findDuplicates(data.playlist_id, normalized);
  if (dup.samePlaylist.length && !data.allow_duplicate) {
    const err = new Error('Channel with this URL already exists in this playlist');
    err.code = 'DUPLICATE_URL';
    err.existing = dup.samePlaylist[0];
    throw err;
  }

  const streamType = data.stream_type || detectStreamType(normalized, data.probe_body);
  const [result] = await db.query(
    `INSERT INTO direct_channels
      (playlist_id, name, stream_url, stream_url_hash, stream_type, group_name, logo_url,
       playback_mode, http_user_agent, http_referer, is_active, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.playlist_id,
      data.name,
      normalized,
      hash,
      streamType,
      data.group_name || null,
      data.logo_url || null,
      data.playback_mode || 'auto',
      data.http_user_agent || null,
      data.http_referer || null,
      data.is_active !== false ? 1 : 0,
      data.sort_order ?? 0,
      userId || null,
    ]
  );

  await db.query(
    `UPDATE playlists SET playlist_kind = CASE
       WHEN playlist_kind = 'direct_only' THEN 'direct_only'
       WHEN m3u_url IS NOT NULL AND m3u_url != '' THEN 'mixed'
       ELSE playlist_kind END
     WHERE id = ?`,
    [data.playlist_id]
  );

  const [rows] = await db.query('SELECT * FROM direct_channels WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function updateDirectChannel(dbId, data) {
  const db = getDatabase();
  const [existing] = await db.query('SELECT * FROM direct_channels WHERE id = ?', [dbId]);
  if (!existing.length) return null;

  const updates = [];
  const params = [];

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.group_name !== undefined) { updates.push('group_name = ?'); params.push(data.group_name || null); }
  if (data.logo_url !== undefined) { updates.push('logo_url = ?'); params.push(data.logo_url || null); }
  if (data.playback_mode !== undefined) { updates.push('playback_mode = ?'); params.push(data.playback_mode); }
  if (data.http_user_agent !== undefined) { updates.push('http_user_agent = ?'); params.push(data.http_user_agent || null); }
  if (data.http_referer !== undefined) { updates.push('http_referer = ?'); params.push(data.http_referer || null); }
  if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
  if (data.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(data.sort_order); }

  if (data.stream_url !== undefined) {
    const normalized = normalizeStreamUrl(data.stream_url);
    updates.push('stream_url = ?', 'stream_url_hash = ?');
    params.push(normalized, streamUrlHash(normalized));
    if (data.stream_type !== undefined) {
      updates.push('stream_type = ?');
      params.push(data.stream_type);
    }
  }

  if (!updates.length) return existing[0];

  params.push(dbId);
  await db.query(`UPDATE direct_channels SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM direct_channels WHERE id = ?', [dbId]);
  return rows[0];
}

async function deleteDirectChannel(dbId, { force = false } = {}) {
  const refs = await checkReferencesBeforeDelete(dbId);
  if (!refs.found) return { deleted: false, reason: 'not_found' };
  if (refs.refs.length && !force) {
    return { deleted: false, reason: 'referenced', refs: refs.refs };
  }
  const db = getDatabase();
  await db.query('DELETE FROM direct_channels WHERE id = ?', [dbId]);
  return { deleted: true };
}

async function listDirectChannels({ playlistId = null, includeInactive = false } = {}) {
  const db = getDatabase();
  let sql = 'SELECT dc.*, p.name AS playlist_name FROM direct_channels dc JOIN playlists p ON p.id = dc.playlist_id WHERE 1=1';
  const params = [];
  if (playlistId) {
    sql += ' AND dc.playlist_id = ?';
    params.push(playlistId);
  }
  if (!includeInactive) {
    sql += ' AND dc.is_active = 1';
  }
  sql += ' ORDER BY dc.playlist_id, dc.sort_order, dc.id';
  const [rows] = await db.query(sql, params);
  return rows;
}

function parseBulkText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().startsWith('name,url') || line.toLowerCase().startsWith('name,url,')) {
      continue;
    }

    if (line.includes('|')) {
      const [namePart, urlPart, ...rest] = line.split('|').map((s) => s.trim());
      rows.push({
        line: i + 1,
        name: namePart || 'New HLS Channel',
        stream_url: urlPart,
        group_name: rest[0] || null,
        logo_url: rest[1] || null,
        playback_mode: rest[2] || 'auto',
      });
      continue;
    }

    if (line.includes(',') && !/^https?:\/\//i.test(line)) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length >= 2 && /^https?:\/\//i.test(parts[1])) {
        rows.push({
          line: i + 1,
          name: parts[0] || 'New HLS Channel',
          stream_url: parts[1],
          group_name: parts[2] || null,
          logo_url: parts[3] || null,
          playback_mode: parts[4] || 'auto',
        });
        continue;
      }
    }

    if (/^https?:\/\//i.test(line)) {
      rows.push({
        line: i + 1,
        name: 'New HLS Channel',
        stream_url: line,
        group_name: null,
        logo_url: null,
        playback_mode: 'auto',
      });
      continue;
    }

    rows.push({ line: i + 1, invalid: true, raw: line });
  }

  return rows;
}

module.exports = {
  normalizeStreamUrl,
  streamUrlHash,
  parseDirectChannelId,
  directChannelApiId,
  detectStreamType,
  toChannelObject,
  ensureDirectStreamsPlaylist,
  loadDirectChannelsForPlaylist,
  getDirectChannelByApiId,
  findDuplicates,
  checkReferencesBeforeDelete,
  createDirectChannel,
  updateDirectChannel,
  deleteDirectChannel,
  listDirectChannels,
  parseBulkText,
  DIRECT_STREAMS_PLAYLIST_NAME,
};
