#!/usr/bin/env node

/**
 * Manually add phone_number and force_password_change columns
 * Run: node server/database/add-phone-columns.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function addPhoneColumns() {
  try {
    console.log('🔧 Adding phone_number and force_password_change columns...\n');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakegrill_tv',
    });
    
    const conn = await pool.getConnection();
    console.log('✅ Connected to database\n');
    
    // 1. Add phone_number column
    console.log('1️⃣  Adding phone_number column...');
    const [phoneCol] = await conn.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'phone_number'
    `);
    
    if (phoneCol[0].count === 0) {
      await conn.query('ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL UNIQUE AFTER email');
      console.log('   ✅ Column added');
      
      await conn.query('CREATE INDEX idx_users_phone ON users(phone_number)');
      console.log('   ✅ Index created\n');
    } else {
      console.log('   ✅ Column already exists\n');
    }
    
    // 2. Add force_password_change column
    console.log('2️⃣  Adding force_password_change column...');
    const [forceCol] = await conn.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'force_password_change'
    `);
    
    if (forceCol[0].count === 0) {
      await conn.query('ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE AFTER is_active');
      console.log('   ✅ Column added\n');
    } else {
      console.log('   ✅ Column already exists\n');
    }
    
    // 3. Verify
    console.log('3️⃣  Verifying columns...');
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('phone_number', 'force_password_change')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('   Required columns:');
    cols.forEach(col => {
      console.log(`   ✅ ${col.COLUMN_NAME}`);
    });
    
    if (cols.length === 2) {
      console.log('\n🎉 All columns added successfully!');
      console.log('✅ Phone number login is now enabled.\n');
    }
    
    conn.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addPhoneColumns();

