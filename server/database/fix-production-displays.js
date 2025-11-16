#!/usr/bin/env node

/**
 * Fix production displays table - Add missing columns
 * Run this manually on production: node server/database/fix-production-displays.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const path = require('path');

async function fixProductionDisplays() {
  try {
    console.log('🔧 Fixing production displays table...\n');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakegrill_tv',
    });
    
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL\n');
    
    // 1. Add missing columns first (these are critical for pairing to work)
    
    // Step 1: Add location_pin column
    console.log('1️⃣  Adding location_pin column...');
    const [locationPinCols] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'displays' 
      AND COLUMN_NAME = 'location_pin'
    `);
    
    if (locationPinCols[0].count === 0) {
      await connection.query('ALTER TABLE displays ADD COLUMN location_pin VARCHAR(4) NULL AFTER token');
      console.log('   ✅ Column added');
      
      try {
        await connection.query('CREATE INDEX idx_displays_location_pin ON displays(location_pin)');
        console.log('   ✅ Index created\n');
      } catch (error) {
        console.log('   ⚠️  Index already exists (ok)\n');
      }
    } else {
      console.log('   ✅ Column already exists\n');
    }
    
    // Step 2: Add user_id column
    console.log('2️⃣  Adding user_id column...');
    const [userIdCols] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'displays' 
      AND COLUMN_NAME = 'user_id'
    `);
    
    if (userIdCols[0].count === 0) {
      await connection.query('ALTER TABLE displays ADD COLUMN user_id INT NULL AFTER playlist_id');
      console.log('   ✅ Column added');
      
      try {
        await connection.query('ALTER TABLE displays ADD CONSTRAINT fk_displays_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
        console.log('   ✅ Foreign key added');
      } catch (error) {
        console.log('   ⚠️  Foreign key already exists (ok)');
      }
      
      try {
        await connection.query('CREATE INDEX idx_displays_user ON displays(user_id)');
        console.log('   ✅ Index created\n');
      } catch (error) {
        console.log('   ⚠️  Index already exists (ok)\n');
      }
    } else {
      console.log('   ✅ Column already exists\n');
    }
    
    // Step 3: Verify all columns exist
    console.log('3️⃣  Verifying columns...');
    const [allCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'displays' 
      AND COLUMN_NAME IN ('location_pin', 'user_id')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('   Required columns:');
    allCols.forEach(col => {
      console.log(`   ✅ ${col.COLUMN_NAME}`);
    });
    
    if (allCols.length === 2) {
      console.log('\n🎉 All required columns exist!');
      console.log('✅ Display pairing should work now.\n');
    } else {
      console.log(`\n⚠️  Warning: Missing ${2 - allCols.length} column(s)`);
    }
    
    // Step 4: Try to fix display role constraint (optional - may fail on some DB versions)
    console.log('4️⃣  Fixing display role constraint (optional)...');
    try {
      // Check database version
      const [versionRows] = await connection.query('SELECT VERSION() as version');
      const dbVersion = versionRows[0].version;
      const isMariaDB = dbVersion.toLowerCase().includes('mariadb');
      
      console.log(`   Database: ${isMariaDB ? 'MariaDB' : 'MySQL'} ${dbVersion}`);
      
      // Try to modify constraint - use a simple approach that works on both
      // First, try to insert a test user with 'display' role to see if it works
      const testEmail = `test_display_${Date.now()}@test.com`;
      try {
        const [testResult] = await connection.query(`
          INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
          VALUES (?, ?, 'display', 'Test', 'User', 0)
        `, [testEmail, 'test_hash']);
        
        // If we got here, the constraint allows 'display' role!
        console.log('   ✅ Constraint already allows display role');
        
        // Clean up test user
        await connection.query('DELETE FROM users WHERE email = ?', [testEmail]);
        console.log('   ✅ Removed test user\n');
      } catch (testError) {
        if (testError.message.includes('CHECK constraint') || testError.message.includes('check constraint')) {
          console.log('   ⚠️  Constraint does not allow display role, attempting to fix...');
          
          // Try to drop and recreate constraint
          try {
            if (isMariaDB) {
              await connection.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_chk_1').catch(() => {});
              await connection.query('ALTER TABLE users DROP CONSTRAINT users_chk_1').catch(() => {});
            } else {
              await connection.query('ALTER TABLE users DROP CHECK users_chk_1').catch(() => {});
            }
          } catch (dropErr) {
            // Ignore drop errors
          }
          
          try {
            await connection.query(`
              ALTER TABLE users 
              ADD CONSTRAINT users_chk_1 
              CHECK (role IN ('admin', 'staff', 'user', 'display'))
            `);
            console.log('   ✅ Constraint fixed successfully\n');
          } catch (addErr) {
            console.log('   ⚠️  Could not modify constraint automatically');
            console.log('   ⚠️  You may need to manually update the constraint in the database\n');
          }
        } else {
          throw testError;
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not verify/fix constraint (non-critical)');
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
    
    connection.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixProductionDisplays();

