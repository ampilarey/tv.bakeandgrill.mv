/**
 * Enable Phase 6 Feature Flags
 * Activate scenes and modes
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function enablePhase6Features() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv'
  });

  console.log('🚀 Enabling Phase 6 features...');

  try {
    // Enable Phase 6 features
    await connection.query(`
      UPDATE feature_flags 
      SET is_enabled = TRUE, updated_at = NOW()
      WHERE flag_name IN ('scenes', 'kids_mode', 'staff_training_mode')
    `);

    // Verify
    const [flags] = await connection.query(`
      SELECT flag_name, is_enabled 
      FROM feature_flags 
      WHERE flag_name IN ('scenes', 'kids_mode', 'staff_training_mode')
    `);

    console.log('\n✅ Phase 6 features enabled:');
    flags.forEach(flag => {
      console.log(`   ${flag.is_enabled ? '✅' : '❌'} ${flag.flag_name}`);
    });

    console.log('\n🎉 Phase 6 features are now active!');
  } catch (error) {
    console.error('❌ Error enabling features:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

enablePhase6Features();

