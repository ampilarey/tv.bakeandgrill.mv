-- Optional admin override for HLS transport selection per channel
ALTER TABLE channel_overrides
  ADD COLUMN playback_mode ENUM('auto', 'direct', 'proxy') NULL DEFAULT NULL;
