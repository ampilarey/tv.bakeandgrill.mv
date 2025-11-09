const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

let pool = null;

/**
 * Create MySQL connection pool
 */
function createPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  return pool;
}

/**
 * Initialize database with schema and default data
 */
async function initDatabase() {
  console.log('🗄️  Initializing MySQL database...');
  
  try {
    const pool = createPool();
    const connection = await pool.getConnection();
    
    console.log('✅ Connected to MySQL');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    console.log('✅ Database schema created');
    
    // Insert default data
    await insertDefaultData(connection);
    
    connection.release();
    console.log('✅ Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Insert default data if tables are empty
 */
async function insertDefaultData(connection) {
  try {
    // Check if admin user exists
    const [adminRows] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );
    
    if (adminRows[0].count === 0) {
      console.log('👤 Creating default admin user...');
      
      const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@bakegrill.com';
      const password = process.env.DEFAULT_ADMIN_PASSWORD || 'BakeGrill2025!';
      const passwordHash = await bcrypt.hash(password, 10);
      
      await connection.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name)
         VALUES (?, ?, 'admin', 'Admin', 'User')`,
        [email, passwordHash]
      );
      
      console.log(`✅ Default admin created: ${email}`);
      console.log(`⚠️  IMPORTANT: Change password after first login!`);
    }
    
    // Check if default settings exist
    const [settingsRows] = await connection.query('SELECT COUNT(*) as count FROM app_settings');
    
    if (settingsRows[0].count === 0) {
      console.log('⚙️  Inserting default settings...');
      
      const defaultSettings = [
        ['app_name', process.env.APP_NAME || 'Bake and Grill TV', 'Application display name'],
        ['pwa_icon_path', '/pwa-512x512.png', 'Path to custom PWA icon'],
        ['max_playlists_per_user', process.env.MAX_PLAYLISTS_PER_USER || '10', 'Maximum playlists per user'],
        ['session_timeout_days', process.env.SESSION_TIMEOUT_DAYS || '7', 'JWT token expiry (days)'],
        ['enable_registration', 'false', 'Allow new user signups (always false for cafe)']
      ];
      
      for (const [key, value, description] of defaultSettings) {
        await connection.query(
          'INSERT INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [key, value, description]
        );
      }
      
      console.log('✅ Default settings inserted');
    }
    
  } catch (error) {
    console.error('Error inserting default data:', error);
  }
}

/**
 * Get database connection pool
 */
function getDatabase() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * Close database connection
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Database connection closed');
  }
}

// If run directly, initialize database
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  initDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  initDatabase, 
  getDatabase, 
  closeDatabase,
  createPool 
};
