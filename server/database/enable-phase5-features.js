/**
 * Enable Phase 5 Feature Flags
 * Activate advanced scheduling
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function enablePhase5Features() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv'
  });

  console.log('🚀 Enabling Phase 5 features...');

  try {
    // Enable Phase 5 features
    await connection.query(`
      UPDATE feature_flags 
      SET is_enabled = TRUE, updated_at = NOW()
      WHERE flag_name = 'advanced_scheduling'
    `);

    // Verify
    const [flags] = await connection.query(`
      SELECT flag_name, is_enabled 
      FROM feature_flags 
      WHERE flag_name = 'advanced_scheduling'
    `);

    console.log('\n✅ Phase 5 features enabled:');
    flags.forEach(flag => {
      console.log(`   ${flag.is_enabled ? '✅' : '❌'} ${flag.flag_name}`);
    });

    console.log('\n🎉 Phase 5 features are now active!');
  } catch (error) {
    console.error('❌ Error enabling features:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

enablePhase5Features();

