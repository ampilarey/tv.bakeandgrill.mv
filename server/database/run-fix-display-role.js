#!/usr/bin/env node

/**
 * Add 'display' role to users table CHECK constraint (MySQL 8 + MariaDB).
 * Run on production: node database/run-fix-display-role.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const ROLES_CHECK = "CHECK (role IN ('admin', 'staff', 'user', 'display'))";

async function dropUserRoleConstraints(connection) {
  const [constraints] = await connection.query(`
    SELECT CONSTRAINT_NAME, CHECK_CLAUSE
    FROM information_schema.CHECK_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
  `);

  if (constraints.length === 0) {
    console.log('   ℹ️  No CHECK constraints found in information_schema (may use inline CHECK on column)');
    try {
      await connection.query(`
        ALTER TABLE users
        MODIFY COLUMN role VARCHAR(20) DEFAULT 'user'
      `);
      console.log('   ✅ Cleared inline role CHECK (if any) via MODIFY COLUMN');
    } catch (err) {
      console.log(`   ⚠️  MODIFY COLUMN skipped: ${err.message.split('\n')[0]}`);
    }
    return;
  }

  for (const { CONSTRAINT_NAME, CHECK_CLAUSE } of constraints) {
    if (CHECK_CLAUSE && CHECK_CLAUSE.includes("'display'")) {
      console.log(`   ✅ ${CONSTRAINT_NAME} already allows display role`);
      continue;
    }

    console.log(`   🗑️  Dropping ${CONSTRAINT_NAME}...`);
    const attempts = [
      `ALTER TABLE users DROP CONSTRAINT \`${CONSTRAINT_NAME}\``,
      `ALTER TABLE users DROP CHECK \`${CONSTRAINT_NAME}\``,
      `ALTER TABLE users DROP CONSTRAINT ${CONSTRAINT_NAME}`,
    ];

    let dropped = false;
    for (const sql of attempts) {
      try {
        await connection.query(sql);
        console.log(`   ✅ Dropped ${CONSTRAINT_NAME}`);
        dropped = true;
        break;
      } catch {
        // try next syntax (MariaDB vs MySQL)
      }
    }

    if (!dropped) {
      try {
        await connection.query(`
          ALTER TABLE users
          MODIFY COLUMN role VARCHAR(20) DEFAULT 'user'
        `);
        console.log('   ✅ Removed role CHECK via MODIFY COLUMN');
      } catch (err) {
        console.log(`   ⚠️  Could not drop ${CONSTRAINT_NAME}: ${err.message.split('\n')[0]}`);
      }
    }
  }
}

async function addDisplayRoleConstraint(connection) {
  try {
    await connection.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_chk_1
      ${ROLES_CHECK}
    `);
    console.log('   ✅ Added users_chk_1 with display role');
  } catch (error) {
    if (
      error.message.includes('Duplicate')
      || error.message.includes('already exists')
      || error.code === 'ER_DUP_KEYNAME'
    ) {
      console.log('   ℹ️  users_chk_1 already exists');
    } else {
      throw error;
    }
  }
}

async function testDisplayRoleInsert(connection) {
  const testEmail = `test_display_${Date.now()}@internal.system`;
  const testPhone = `9${String(Math.floor(100000 + Math.random() * 900000))}`;

  const attempts = [
    {
      sql: `INSERT INTO users (email, phone_number, password_hash, role, first_name, last_name, is_active)
            VALUES (?, ?, ?, 'display', 'Test', 'User', 0)`,
      params: [testEmail, testPhone, 'test_hash'],
    },
    {
      sql: `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
            VALUES (?, ?, 'display', 'Test', 'User', 0)`,
      params: [testEmail, 'test_hash'],
    },
  ];

  for (const { sql, params } of attempts) {
    try {
      await connection.query(sql, params);
      await connection.query('DELETE FROM users WHERE email = ?', [testEmail]);
      return true;
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') continue;
      throw err;
    }
  }
  return false;
}

async function fixDisplayRole() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv',
  });

  const connection = await pool.getConnection();
  console.log('🔧 Fixing display role constraint...\n');

  try {
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    console.log(`📊 Database: ${versionRows[0].version}\n`);

    console.log('1️⃣  Inspecting / updating role constraints...');
    await dropUserRoleConstraints(connection);

    console.log('\n2️⃣  Ensuring display role is allowed...');
    await addDisplayRoleConstraint(connection);

    console.log('\n3️⃣  Testing display role insert...');
    const ok = await testDisplayRoleInsert(connection);
    if (ok) {
      console.log('   ✅ Test insert with role=display succeeded');
      console.log('\n🎉 Display role constraint is OK — pairing should work.');
    } else {
      console.log('   ❌ Test insert failed — constraint may still block display role');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

fixDisplayRole();
