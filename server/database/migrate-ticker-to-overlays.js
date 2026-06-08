#!/usr/bin/env node
/**
 * Optional: copy legacy ticker_messages into overlay_messages.
 * No-op if ticker_messages table does not exist (common on production).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv',
  });

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('ticker_messages', 'overlay_messages')`
    );
    const names = new Set(tables.map((r) => r.TABLE_NAME));

    if (!names.has('overlay_messages')) {
      console.log('⚠️  overlay_messages table missing — run overlay migrations first.');
      process.exitCode = 1;
      return;
    }

    if (!names.has('ticker_messages')) {
      console.log('ℹ️  ticker_messages not found — nothing to migrate (OK for this server).');
      return;
    }

    const [result] = await connection.query(`
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
      )
    `);

    console.log(`✅ Migrated ${result.affectedRows} ticker message(s) to overlay_messages.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
