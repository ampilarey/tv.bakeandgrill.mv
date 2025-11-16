#!/usr/bin/env node

/**
 * Quick fix script to add 'display' role to users table constraint
 * Run this manually: node server/database/run-fix-display-role.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const path = require('path');

async function fixDisplayRole() {
  try {
    console.log('🔧 Fixing display role constraint...\n');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakegrill_tv',
    });
    
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL\n');
    
    // Drop existing constraint (ignore if doesn't exist)
    console.log('\n🗑️  Dropping existing constraint...');
    try {
      await connection.query('ALTER TABLE users DROP CHECK users_chk_1');
      console.log('✅ Constraint dropped');
    } catch (error) {
      if (error.message.includes('does not exist') || 
          error.code === 'ER_CHECK_CONSTRAINT_NOT_FOUND' ||
          error.message.includes('Unknown constraint')) {
        console.log('⚠️  Constraint does not exist (this is ok, will create new one)');
      } else {
        throw error;
      }
    }
    
    // Add new constraint with 'display' role
    console.log('\n➕ Adding new constraint with "display" role...');
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_chk_1 
        CHECK (role IN ('admin', 'staff', 'user', 'display'))
      `);
      console.log('✅ New constraint added successfully!\n');
    } catch (error) {
      if (error.message.includes('Duplicate key name') || 
          error.message.includes('already exists')) {
        console.log('⚠️  Constraint already exists, trying to modify...');
        // Try to drop and recreate
        await connection.query('ALTER TABLE users DROP CHECK users_chk_1');
        await connection.query(`
          ALTER TABLE users 
          ADD CONSTRAINT users_chk_1 
          CHECK (role IN ('admin', 'staff', 'user', 'display'))
        `);
        console.log('✅ Constraint recreated successfully!\n');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Display role constraint fixed successfully!');
    console.log('✅ You can now pair displays without constraint errors.');
    
    connection.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixDisplayRole();

