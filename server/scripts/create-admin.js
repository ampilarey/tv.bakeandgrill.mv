#!/usr/bin/env node
/**
 * Interactive CLI: create or reset an admin user.
 *
 * Usage:
 *   cd server
 *   node scripts/create-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const readline = require('readline');
const bcrypt   = require('bcrypt');
const mysql    = require('mysql2/promise');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n🔐  Bake & Grill TV — Admin Setup\n');

  const email    = (await ask('Admin email    : ')).trim();
  const phone    = (await ask('Phone (optional): ')).trim() || null;
  const password = (await ask('New password   : ')).trim();

  if (!email || !password) {
    console.error('❌  Email and password are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  rl.close();

  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'bakegrill_tv',
  });

  try {
    const hash = await bcrypt.hash(password, 12);

    await db.execute(
      `INSERT INTO users (email, phone_number, password_hash, role, first_name, last_name, is_active)
       VALUES (?, ?, ?, 'admin', 'Admin', 'User', 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         phone_number  = COALESCE(VALUES(phone_number), phone_number),
         role          = 'admin',
         is_active     = 1`,
      [email, phone, hash]
    );

    console.log(`\n✅  Admin account ready:`);
    console.log(`    Email : ${email}`);
    if (phone) console.log(`    Phone : ${phone}`);
    console.log(`    Role  : admin\n`);
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error('❌ ', err.message);
  process.exit(1);
});
