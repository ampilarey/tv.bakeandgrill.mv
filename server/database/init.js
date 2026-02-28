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
    
    // Run migrations
    await runMigrations(connection);
    
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
 * Run database migrations
 */
async function runMigrations(connection) {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Swallow idempotent errors so migrations can be re-run safely
          if (
            error.message.includes('does not exist') ||
            error.message.includes('Unknown constraint') ||
            error.message.includes('Duplicate column name') ||
            error.message.includes('already exists')
          ) {
            console.log(`⚠️  Migration ${file}: Skipping already-applied statement (${error.message.split('\n')[0]})`);
          } else {
            throw error;
          }
        }
      }
      
      console.log(`✅ Migration applied: ${file}`);
    }
  } catch (error) {
    console.error('⚠️  Migration error (continuing anyway):', error.message);
    // Don't fail initialization if migrations fail
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
    
    // Only create default admin if explicitly allowed (security best practice)
    // OPT-IN security model: must explicitly set ALLOW_DEFAULT_ADMIN=true
    const allowDefaultAdmin = process.env.ALLOW_DEFAULT_ADMIN === 'true';
    
    if (adminRows[0].count === 0 && allowDefaultAdmin) {
      console.log('👤 Creating default admin user...');
      console.warn('⚠️  WARNING: Default admin credentials should be changed immediately after first login!');
      
      // Require environment variables for security
      const email = process.env.DEFAULT_ADMIN_EMAIL;
      const password = process.env.DEFAULT_ADMIN_PASSWORD;
      
      if (!email || !password) {
        console.error('🚨 SECURITY ERROR: DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set in .env');
        console.error('🚨 SECURITY ERROR: Default admin creation aborted!');
        console.error('📝 Example: DEFAULT_ADMIN_EMAIL=admin@example.com DEFAULT_ADMIN_PASSWORD=SecurePass123!');
        return;
      }
      
      // Validate password strength
      if (password.length < 12) {
        console.error('🚨 SECURITY ERROR: DEFAULT_ADMIN_PASSWORD must be at least 12 characters');
        console.error('🚨 SECURITY ERROR: Default admin creation aborted!');
        return;
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      await connection.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name)
         VALUES (?, ?, 'admin', 'Admin', 'User')`,
        [email, passwordHash]
      );
      
      console.log(`✅ Default admin created: ${email}`);
      console.log(`⚠️  IMPORTANT: Change password after first login!`);
      console.log(`🔒 SECURITY: Remove or set ALLOW_DEFAULT_ADMIN=false in .env immediately!`);
    } else if (adminRows[0].count === 0) {
      console.log('⚠️  No admin user exists!');
      console.log('📝 To create default admin, set in .env:');
      console.log('   ALLOW_DEFAULT_ADMIN=true');
      console.log('   DEFAULT_ADMIN_EMAIL=your-email@example.com');
      console.log('   DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!');
      console.log('🔒 Then restart the server');
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
