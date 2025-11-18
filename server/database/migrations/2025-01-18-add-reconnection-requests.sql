-- Migration: Add reconnection_requests table
-- Date: 2025-01-18
-- Description: Support display reconnection approval workflow

CREATE TABLE IF NOT EXISTS reconnection_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  display_token VARCHAR(255) NOT NULL,
  request_ip VARCHAR(45),
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reconnect_status (status, expires_at),
  INDEX idx_reconnect_display (display_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

