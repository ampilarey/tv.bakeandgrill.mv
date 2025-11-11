/**
 * One-off script to execute an SQL migration file against the configured MySQL database.
 *
 * Usage:
 *   NODE_ENV=production node run-migration.js migrations/2025-11-11-add-owner-columns.sql
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    console.error('❌ Please provide the path to the SQL migration file.');
    console.error('   Example: node run-migration.js migrations/2025-11-11-add-owner-columns.sql');
    process.exit(1);
  }

  const absolutePath = path.resolve(__dirname, migrationPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Migration file not found: ${absolutePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(absolutePath, 'utf8')
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  if (sql.length === 0) {
    console.log('⚠️  Migration file is empty, nothing to run.');
    process.exit(0);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv',
    multipleStatements: true
  });

  console.log(`🚀 Running migration: ${migrationPath}`);

  try {
    for (const statement of sql) {
      await connection.query(statement);
    }
    console.log('✅ Migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigration();

