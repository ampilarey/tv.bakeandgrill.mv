-- One-time: copy legacy ticker_messages into overlay_messages (TVs read overlays only).
INSERT INTO overlay_messages (
  text, icon, enabled, priority, rotation_seconds, show_qr, qr_url,
  start_at, end_at, target_type, target_id
)
SELECT
  tm.text,
  NULL,
  IF(tm.is_active, 1, 0),
  COALESCE(tm.priority, 0),
  8,
  0,
  NULL,
  CASE WHEN tm.start_date IS NOT NULL THEN TIMESTAMP(tm.start_date, '00:00:00') ELSE NULL END,
  CASE WHEN tm.end_date IS NOT NULL THEN TIMESTAMP(tm.end_date, '23:59:59') ELSE NULL END,
  CASE WHEN tm.display_id IS NULL THEN 'all' ELSE 'display' END,
  tm.display_id
FROM ticker_messages tm
WHERE NOT EXISTS (
  SELECT 1 FROM overlay_messages om
  WHERE om.text = tm.text
    AND om.target_type = IF(tm.display_id IS NULL, 'all', 'display')
    AND (om.target_id <=> tm.display_id)
);
