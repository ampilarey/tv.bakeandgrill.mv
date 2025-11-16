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
    
    // 1. Fix display role constraint
    // Check if we're using MariaDB or MySQL
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const dbVersion = versionRows[0].version;
    const isMariaDB = dbVersion.toLowerCase().includes('mariadb');
    
    console.log(`1️⃣  Fixing display role constraint (${isMariaDB ? 'MariaDB' : 'MySQL'})...`);
    
    // Try to drop existing constraint (MariaDB uses DROP CONSTRAINT, MySQL uses DROP CHECK)
    try {
      if (isMariaDB) {
        await connection.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_chk_1');
      } else {
        await connection.query('ALTER TABLE users DROP CHECK users_chk_1');
      }
      console.log('   ✅ Dropped old constraint');
    } catch (error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('Unknown constraint') ||
          error.message.includes('syntax')) {
        // Try alternative syntax
        try {
          if (isMariaDB) {
            await connection.query('ALTER TABLE users DROP CONSTRAINT users_chk_1');
          }
        } catch (err2) {
          console.log('   ⚠️  Constraint does not exist (ok)');
        }
      }
    }
    
    // Check if constraint already has 'display' role
    const [constraints] = await connection.query(`
      SELECT CHECK_CLAUSE 
      FROM information_schema.CHECK_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND CONSTRAINT_NAME = 'users_chk_1'
    `).catch(() => [[null]]); // If CHECK_CONSTRAINTS table doesn't exist (old MariaDB)
    
    if (constraints.length > 0 && constraints[0].CHECK_CLAUSE && 
        constraints[0].CHECK_CLAUSE.includes("'display'")) {
      console.log('   ✅ Constraint already includes display role\n');
    } else {
      try {
        await connection.query(`
          ALTER TABLE users 
          ADD CONSTRAINT users_chk_1 
          CHECK (role IN ('admin', 'staff', 'user', 'display'))
        `);
        console.log('   ✅ Added constraint with display role\n');
      } catch (error) {
        if (error.message.includes('Duplicate') || 
            error.message.includes('already exists') ||
            error.message.includes('Duplicate key')) {
          console.log('   ⚠️  Constraint already exists, trying to modify...');
          // For MariaDB, we might need to drop and recreate
          try {
            if (isMariaDB) {
              await connection.query('ALTER TABLE users DROP CONSTRAINT users_chk_1');
            } else {
              await connection.query('ALTER TABLE users DROP CHECK users_chk_1');
            }
            await connection.query(`
              ALTER TABLE users 
              ADD CONSTRAINT users_chk_1 
              CHECK (role IN ('admin', 'staff', 'user', 'display'))
            `);
            console.log('   ✅ Constraint recreated with display role\n');
          } catch (err2) {
            console.log('   ⚠️  Could not modify constraint (may already be correct)\n');
          }
        } else {
          throw error;
        }
      }
    }
    
    // 2. Add location_pin column
    console.log('2️⃣  Adding location_pin column...');
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
    
    // 3. Add user_id column
    console.log('3️⃣  Adding user_id column...');
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
    
    // Verify all columns exist
    console.log('4️⃣  Verifying columns...');
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
      console.log('\n🎉 All fixes applied successfully!');
      console.log('✅ Display pairing should work now.\n');
    } else {
      console.log(`\n⚠️  Warning: Missing ${2 - allCols.length} column(s)`);
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

