-- Add created_by column to playlists for ownership tracking
ALTER TABLE playlists
  ADD COLUMN created_by INT NULL DEFAULT NULL,
  ADD INDEX idx_playlists_owner (created_by),
  ADD CONSTRAINT fk_playlists_owner FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL;

-- Add created_by column to displays for ownership tracking
ALTER TABLE displays
  ADD COLUMN created_by INT NULL DEFAULT NULL,
  ADD INDEX idx_displays_owner (created_by),
  ADD CONSTRAINT fk_displays_owner FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL;

