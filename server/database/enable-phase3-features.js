/**
 * Enable Phase 3 Feature Flags (info_ticker + announcements).
 * Bootstraps feature_flags table if missing on older production DBs.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const DEFAULT_FLAGS = [
  ['multi_type_player', 'Enable multi-type content player (images, videos, YouTube)'],
  ['image_slides', 'Enable image slide support'],
  ['youtube_embed', 'Enable YouTube video embedding'],
  ['info_ticker', 'Enable scrolling info ticker'],
  ['qr_codes', 'Enable QR code generation on slides'],
  ['scenes', 'Enable one-click scene configurations'],
  ['multilang', 'Enable multi-language support (English + Dhivehi)'],
  ['offline_cache', 'Enable offline content caching'],
  ['slide_templates', 'Enable slide template system'],
  ['kids_mode', 'Enable kids/family-friendly mode'],
  ['upsell_logic', 'Enable smart upsell/promotion logic'],
  ['announcements', 'Enable quick announcements overlay'],
  ['staff_training_mode', 'Enable staff training mode'],
  ['advanced_scheduling', 'Enable date-based scheduling'],
];

async function ensureFeatureFlagsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      flag_name VARCHAR(100) UNIQUE NOT NULL,
      is_enabled BOOLEAN DEFAULT FALSE,
      description TEXT,
      rollout_percentage INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_feature_flags_name (flag_name),
      INDEX idx_feature_flags_enabled (is_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  for (const [flag_name, description] of DEFAULT_FLAGS) {
    await connection.query(
      `INSERT INTO feature_flags (flag_name, is_enabled, description)
       VALUES (?, FALSE, ?)
       ON DUPLICATE KEY UPDATE flag_name = flag_name`,
      [flag_name, description]
    );
  }
}

async function enablePhase3Features() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv',
  });

  console.log('🚀 Enabling Phase 3 features...');

  try {
    await ensureFeatureFlagsTable(connection);

    await connection.query(`
      UPDATE feature_flags
      SET is_enabled = TRUE, updated_at = NOW()
      WHERE flag_name IN ('info_ticker', 'announcements')
    `);

    const [flags] = await connection.query(`
      SELECT flag_name, is_enabled
      FROM feature_flags
      WHERE flag_name IN ('info_ticker', 'announcements')
    `);

    console.log('\n✅ Phase 3 features:');
    flags.forEach((flag) => {
      console.log(`   ${flag.is_enabled ? '✅' : '❌'} ${flag.flag_name}`);
    });

    console.log('\n🎉 Phase 3 features are now active!');
  } catch (error) {
    console.error('❌ Error enabling features:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

enablePhase3Features();
