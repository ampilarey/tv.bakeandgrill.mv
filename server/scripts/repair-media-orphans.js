#!/usr/bin/env node
/**
 * Remove orphaned media_playlist_items before FK migration.
 * Usage: node scripts/repair-media-orphans.js
 */
const { getDatabase } = require('../database/init');

async function main() {
  const db = getDatabase();

  const [badMedia] = await db.query(`
    DELETE mpi FROM media_playlist_items mpi
    LEFT JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE ma.id IS NULL
  `);
  console.log(`Removed ${badMedia.affectedRows} items with missing media_assets`);

  const [badPlaylist] = await db.query(`
    DELETE mpi FROM media_playlist_items mpi
    LEFT JOIN media_playlists mp ON mp.id = mpi.playlist_id
    WHERE mp.id IS NULL
  `);
  console.log(`Removed ${badPlaylist.affectedRows} items with missing media_playlists`);

  try {
    const [dups] = await db.query(`
      DELETE mpi FROM media_playlist_items mpi
      INNER JOIN (
        SELECT MIN(id) AS keep_id, playlist_id, media_id
        FROM media_playlist_items
        GROUP BY playlist_id, media_id
        HAVING COUNT(*) > 1
      ) d ON mpi.playlist_id = d.playlist_id AND mpi.media_id = d.media_id AND mpi.id <> d.keep_id
    `);
    console.log(`Removed ${dups.affectedRows} duplicate playlist/media pairs`);
  } catch (err) {
    console.warn('Duplicate cleanup skipped:', err.message);
  }

  console.log('Orphan repair complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
