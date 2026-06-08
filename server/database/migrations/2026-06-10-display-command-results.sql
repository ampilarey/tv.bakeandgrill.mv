-- Command execution results + display health fields for kiosk remote control
ALTER TABLE display_commands
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN error_code VARCHAR(64) NULL,
  ADD COLUMN error_message VARCHAR(512) NULL,
  ADD COLUMN kiosk_app_version VARCHAR(32) NULL,
  ADD COLUMN result_payload JSON NULL;

ALTER TABLE displays
  ADD COLUMN last_user_agent VARCHAR(255) NULL,
  ADD COLUMN last_command_id INT NULL,
  ADD COLUMN last_command_status VARCHAR(20) NULL,
  ADD COLUMN last_command_at DATETIME NULL,
  ADD COLUMN last_error_code VARCHAR(64) NULL,
  ADD COLUMN last_error_message VARCHAR(512) NULL;

UPDATE display_commands SET status = 'executed' WHERE is_executed = 1;
