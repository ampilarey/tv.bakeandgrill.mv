#!/usr/bin/env node

/**
 * Fix MariaDB constraint to allow 'display' role
 * Run this on production: node server/database/fix-mariadb-constraint.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function fixMariaDBConstraint() {
  try {
    console.log('🔧 Fixing MariaDB constraint for display role...\n');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakegrill_tv',
    });
    
    const connection = await pool.getConnection();
    console.log('✅ Connected to database\n');
    
    // Get database version
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    console.log(`📊 Database: ${versionRows[0].version}\n`);
    
    // Find all CHECK constraints on users table
    console.log('🔍 Finding constraints on users table...');
    const [constraints] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        CHECK_CLAUSE
      FROM information_schema.CHECK_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
    `);
    
    console.log(`Found ${constraints.length} constraint(s):\n`);
    constraints.forEach(c => {
      console.log(`   - ${c.CONSTRAINT_NAME}: ${c.CHECK_CLAUSE}`);
    });
    console.log('');
    
    // Try to drop each constraint that doesn't include 'display'
    for (const constraint of constraints) {
      if (!constraint.CHECK_CLAUSE.includes("'display'")) {
        console.log(`🗑️  Dropping constraint: ${constraint.CONSTRAINT_NAME}...`);
        try {
          // MariaDB uses backticks for constraint names with dots
          const constraintName = constraint.CONSTRAINT_NAME.includes('.') 
            ? `\`${constraint.CONSTRAINT_NAME}\``
            : constraint.CONSTRAINT_NAME;
          
          await connection.query(`ALTER TABLE users DROP CONSTRAINT ${constraintName}`);
          console.log(`   ✅ Dropped ${constraint.CONSTRAINT_NAME}\n`);
        } catch (error) {
          console.log(`   ⚠️  Could not drop: ${error.message}\n`);
        }
      } else {
        console.log(`✅ Constraint ${constraint.CONSTRAINT_NAME} already includes 'display' role\n`);
      }
    }
    
    // Add new constraint with display role
    console.log('➕ Adding new constraint with display role...');
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_chk_1 
        CHECK (role IN ('admin', 'staff', 'user', 'display'))
      `);
      console.log('   ✅ Constraint added successfully\n');
    } catch (error) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log('   ℹ️  Constraint already exists\n');
      } else {
        console.log(`   ⚠️  Could not add constraint: ${error.message}\n`);
      }
    }
    
    // Verify by attempting to insert a test user
    console.log('🧪 Testing constraint...');
    const testEmail = `test_display_${Date.now()}@test.com`;
    try {
      await connection.query(`
        INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
        VALUES (?, ?, 'display', 'Test', 'User', 0)
      `, [testEmail, 'test_hash']);
      
      console.log('   ✅ Test insert successful - constraint allows display role!');
      
      // Clean up test user
      await connection.query('DELETE FROM users WHERE email = ?', [testEmail]);
      console.log('   ✅ Test user removed\n');
      
      console.log('🎉 Constraint fixed successfully!');
      console.log('✅ Display pairing should work now.\n');
    } catch (testError) {
      console.log(`   ❌ Test failed: ${testError.message}`);
      console.log('\n⚠️  Constraint still blocks display role.');
      console.log('⚠️  You may need to manually modify the constraint in the database.\n');
    }
    
    connection.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixMariaDBConstraint();

