ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_password_change_at DATETIME NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS media_assets (
  id              INT           NOT NULL AUTO_INCREMENT,
  type            ENUM('image','video') NOT NULL,
  original_name   VARCHAR(255)  NOT NULL,
  stored_name     VARCHAR(255)  NOT NULL,
  url             TEXT          NOT NULL,
  thumbnail_url   TEXT          NULL,
  mime_type       VARCHAR(100)  NOT NULL,
  size_bytes      BIGINT        NOT NULL DEFAULT 0,
  width           INT           NULL,
  height          INT           NULL,
  duration_seconds FLOAT        NULL,
  uploaded_by     INT           NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_type       (type),
  INDEX idx_created_at (created_at),
  INDEX idx_uploaded_by (uploaded_by)
);

CREATE TABLE IF NOT EXISTS media_playlists (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)  NOT NULL,
  description TEXT          NULL,
  shuffle     TINYINT(1)    NOT NULL DEFAULT 0,
  created_by  INT           NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_by (created_by)
);

CREATE TABLE IF NOT EXISTS media_playlist_items (
  id                     INT           NOT NULL AUTO_INCREMENT,
  playlist_id            INT           NOT NULL,
  media_id               INT           NOT NULL,
  sort_order             INT           NOT NULL DEFAULT 0,
  image_duration_seconds INT           NOT NULL DEFAULT 8,
  play_video_full        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_playlist_sort (playlist_id, sort_order),
  INDEX idx_media_id (media_id)
);

CREATE TABLE IF NOT EXISTS content_schedules (
  id           INT                         NOT NULL AUTO_INCREMENT,
  target_type  ENUM('display','zone')      NOT NULL,
  target_id    INT                         NOT NULL,
  playlist_id  INT                         NOT NULL,
  days_of_week VARCHAR(32)                 NOT NULL DEFAULT '0,1,2,3,4,5,6',
  start_time   TIME                        NOT NULL,
  end_time     TIME                        NOT NULL,
  priority     INT                         NOT NULL DEFAULT 0,
  enabled      TINYINT(1)                  NOT NULL DEFAULT 1,
  created_at   DATETIME                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_target   (target_type, target_id),
  INDEX idx_enabled  (enabled),
  INDEX idx_priority (priority)
);

ALTER TABLE displays ADD COLUMN media_playlist_id   INT       NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN is_outdoor           TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE displays ADD COLUMN mute_audio           TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE displays ADD COLUMN day_playlist_id      INT       NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN night_playlist_id    INT       NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN day_start_time       TIME      NULL DEFAULT '07:00:00';
ALTER TABLE displays ADD COLUMN night_start_time     TIME      NULL DEFAULT '18:00:00';
ALTER TABLE displays ADD COLUMN show_clock_overlay   TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE displays ADD COLUMN show_brand_overlay   TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE displays ADD COLUMN display_type         VARCHAR(10) NOT NULL DEFAULT 'stream';

ALTER TABLE emergency_overrides ADD COLUMN media_playlist_id INT  NULL DEFAULT NULL;
ALTER TABLE emergency_overrides ADD COLUMN target_type       VARCHAR(10) NOT NULL DEFAULT 'zone';
