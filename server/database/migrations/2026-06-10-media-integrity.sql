-- Media library integrity: metadata columns + FK constraints
-- Run repair-media-orphans.js before applying this migration.

ALTER TABLE media_assets
  ADD COLUMN category VARCHAR(64) NULL,
  ADD COLUMN tags VARCHAR(255) NULL;

ALTER TABLE media_playlist_items
  ADD CONSTRAINT fk_mpi_playlist FOREIGN KEY (playlist_id) REFERENCES media_playlists(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_mpi_media FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE;

ALTER TABLE media_playlist_items
  ADD UNIQUE KEY uq_playlist_media (playlist_id, media_id);
