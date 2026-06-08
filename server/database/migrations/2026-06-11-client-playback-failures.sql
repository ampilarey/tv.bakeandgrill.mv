-- Separate client playback failures from server diagnosis (is_live)
ALTER TABLE channel_health
  ADD COLUMN last_client_failure_reason VARCHAR(64) NULL,
  ADD COLUMN last_client_failure_device VARCHAR(32) NULL,
  ADD COLUMN last_client_failure_stage VARCHAR(64) NULL,
  ADD COLUMN client_failure_count INT NOT NULL DEFAULT 0;
