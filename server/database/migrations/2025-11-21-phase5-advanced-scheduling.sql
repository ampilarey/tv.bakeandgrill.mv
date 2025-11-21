-- ============================================
-- PHASE 5: ADVANCED SCHEDULING - Database Enhancement
-- Date: 2025-11-21
-- Purpose: Add date ranges, priorities, and advanced scheduling
-- Risk: MEDIUM (modifies existing table)
-- ============================================

-- ============================================
-- Enhance display_schedules table
-- ============================================

-- Add new columns for advanced scheduling (ignore errors if they already exist)
ALTER TABLE display_schedules 
ADD COLUMN date_start DATE NULL COMMENT 'Start date for schedule (NULL = always active)';

ALTER TABLE display_schedules 
ADD COLUMN date_end DATE NULL COMMENT 'End date for schedule (NULL = no end)';

ALTER TABLE display_schedules 
ADD COLUMN priority INT DEFAULT 0 COMMENT 'Higher priority takes precedence (0-10)';

ALTER TABLE display_schedules 
ADD COLUMN schedule_type ENUM('time_of_day', 'date_range', 'special_event', 'meal_period') DEFAULT 'time_of_day' COMMENT 'Type of schedule';

ALTER TABLE display_schedules 
ADD COLUMN event_name VARCHAR(100) NULL COMMENT 'Name of special event (Ramadan, Eid, etc.)';

ALTER TABLE display_schedules 
ADD COLUMN meal_period ENUM('breakfast', 'lunch', 'dinner', 'late_night') NULL COMMENT 'Meal period for automated switching';

ALTER TABLE display_schedules 
ADD COLUMN playlist_id INT NULL COMMENT 'Playlist to use for this schedule';

ALTER TABLE display_schedules 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE COMMENT 'Does this schedule repeat yearly';

-- Add indexes (will fail silently if they exist)
ALTER TABLE display_schedules ADD INDEX idx_schedules_date_range (date_start, date_end);
ALTER TABLE display_schedules ADD INDEX idx_schedules_priority (priority);
ALTER TABLE display_schedules ADD INDEX idx_schedules_type (schedule_type);

-- ============================================
-- Create schedule_presets table
-- Pre-configured schedule templates
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule_type ENUM('time_of_day', 'date_range', 'special_event', 'meal_period') NOT NULL,
  
  -- Schedule configuration (JSON for flexibility)
  config JSON NOT NULL COMMENT 'Schedule configuration settings',
  
  -- Metadata
  is_system BOOLEAN DEFAULT FALSE COMMENT 'System preset vs user-created',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_presets_type (schedule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert default schedule presets
-- ============================================

-- Meal Period Presets
INSERT INTO schedule_presets (name, description, schedule_type, config, is_system) VALUES
('Breakfast Menu', 'Breakfast items (6 AM - 11 AM)', 'meal_period', 
 '{"meal_period": "breakfast", "start_time": "06:00:00", "end_time": "11:00:00", "days": [0,1,2,3,4,5,6]}', 
 TRUE),

('Lunch Menu', 'Lunch items (11 AM - 3 PM)', 'meal_period',
 '{"meal_period": "lunch", "start_time": "11:00:00", "end_time": "15:00:00", "days": [0,1,2,3,4,5,6]}',
 TRUE),

('Dinner Menu', 'Dinner items (6 PM - 11 PM)', 'meal_period',
 '{"meal_period": "dinner", "start_time": "18:00:00", "end_time": "23:00:00", "days": [0,1,2,3,4,5,6]}',
 TRUE),

('Late Night Menu', 'Late night items (11 PM - 6 AM)', 'meal_period',
 '{"meal_period": "late_night", "start_time": "23:00:00", "end_time": "06:00:00", "days": [0,1,2,3,4,5,6]}',
 TRUE);

-- Special Event Presets
INSERT INTO schedule_presets (name, description, schedule_type, config, is_system) VALUES
('Ramadan Special', 'Ramadan menu (30 days)', 'special_event',
 '{"event_name": "Ramadan", "duration_days": 30, "is_recurring": true, "priority": 8}',
 TRUE),

('Eid Celebration', 'Eid special menu (2 days)', 'special_event',
 '{"event_name": "Eid", "duration_days": 2, "is_recurring": true, "priority": 9}',
 TRUE),

('New Year Special', 'New Year promotion (January 1)', 'special_event',
 '{"event_name": "New Year", "month": 1, "day": 1, "is_recurring": true, "priority": 8}',
 TRUE),

('Weekend Special', 'Weekend menu (Friday-Saturday)', 'special_event',
 '{"event_name": "Weekend", "days": [5,6], "is_recurring": true, "priority": 5}',
 TRUE);

-- Time-based Presets
INSERT INTO schedule_presets (name, description, schedule_type, config, is_system) VALUES
('Morning Rush (Mon-Fri)', 'Weekday morning rush (7 AM - 9 AM)', 'time_of_day',
 '{"start_time": "07:00:00", "end_time": "09:00:00", "days": [1,2,3,4,5], "priority": 6}',
 TRUE),

('Lunch Rush (Weekdays)', 'Weekday lunch rush (12 PM - 2 PM)', 'time_of_day',
 '{"start_time": "12:00:00", "end_time": "14:00:00", "days": [1,2,3,4,5], "priority": 6}',
 TRUE),

('Evening Peak', 'Evening peak hours (7 PM - 9 PM)', 'time_of_day',
 '{"start_time": "19:00:00", "end_time": "21:00:00", "days": [0,1,2,3,4,5,6], "priority": 5}',
 TRUE);

-- ============================================
-- Create schedule_conflicts table
-- Track and log scheduling conflicts
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  schedule_id_1 INT NOT NULL COMMENT 'First conflicting schedule',
  schedule_id_2 INT NOT NULL COMMENT 'Second conflicting schedule',
  conflict_type ENUM('time_overlap', 'priority_conflict', 'resource_conflict') NOT NULL,
  resolution ENUM('manual', 'auto_priority', 'auto_time') DEFAULT 'manual',
  resolved BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id_1) REFERENCES display_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id_2) REFERENCES display_schedules(id) ON DELETE CASCADE,
  INDEX idx_conflicts_display (display_id, resolved),
  INDEX idx_conflicts_detected (detected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PHASE 5 MIGRATION COMPLETE
-- ============================================

