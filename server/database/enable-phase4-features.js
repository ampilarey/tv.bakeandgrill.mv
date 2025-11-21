/**
 * Enable Phase 4 Feature Flags
 * Activate YouTube embed and video playback
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function enablePhase4Features() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv'
  });

  console.log('🚀 Enabling Phase 4 features...');

  try {
    // Enable Phase 4 features
    await connection.query(`
      UPDATE feature_flags 
      SET is_enabled = TRUE, updated_at = NOW()
      WHERE flag_name IN ('youtube_embed', 'multi_type_player')
    `);

    // Verify
    const [flags] = await connection.query(`
      SELECT flag_name, is_enabled 
      FROM feature_flags 
      WHERE flag_name IN ('youtube_embed', 'multi_type_player')
    `);

    console.log('\n✅ Phase 4 features enabled:');
    flags.forEach(flag => {
      console.log(`   ${flag.is_enabled ? '✅' : '❌'} ${flag.flag_name}`);
    });

    console.log('\n🎉 Phase 4 features are now active!');
    console.log('\n⚠️  Note: YouTube IFrame API requires HTTPS in production');
  } catch (error) {
    console.error('❌ Error enabling features:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

enablePhase4Features();

