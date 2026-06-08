-- Legacy ticker → overlay copy is optional (ticker_messages may not exist on production).
-- Run: node database/migrate-ticker-to-overlays.js
SELECT 1 AS ticker_overlay_migration_noop;
