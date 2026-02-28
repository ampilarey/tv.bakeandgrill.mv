/**
 * Startup environment validation.
 * Call once at the very top of server.js (after dotenv.config()).
 * In production, any missing required var kills the process immediately.
 */

const REQUIRED = [
  { key: 'JWT_SECRET',   min: 32, hint: 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"' },
  { key: 'DB_HOST',      hint: 'e.g. localhost' },
  { key: 'DB_USER',      hint: 'MySQL username' },
  { key: 'DB_NAME',      hint: 'MySQL database name' },
];

const WEAK_JWT_PATTERNS = [
  'change-this',
  'your-super-secret',
  'secret',
  '12345',
  'password',
];

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  for (const { key, min, hint } of REQUIRED) {
    const val = process.env[key];
    if (!val) {
      errors.push(`  ❌  ${key} is not set  →  ${hint || ''}`);
    } else if (min && val.length < min) {
      errors.push(`  ❌  ${key} is too short (${val.length} chars, need ≥${min})`);
    }
  }

  // Weak JWT secret check
  const jwt = process.env.JWT_SECRET || '';
  if (jwt && WEAK_JWT_PATTERNS.some(p => jwt.toLowerCase().includes(p))) {
    (isProd ? errors : warnings).push('  ⚠️   JWT_SECRET looks like a placeholder/default — generate a real random secret');
  }

  // NODE_ENV sanity
  const env = process.env.NODE_ENV;
  if (env && !['development', 'production', 'test'].includes(env)) {
    warnings.push(`  ⚠️   NODE_ENV="${env}" is unusual — expected development | production | test`);
  }

  if (warnings.length) {
    console.warn('\n⚠️  Environment warnings:');
    warnings.forEach(w => console.warn(w));
  }

  if (errors.length) {
    console.error('\n🚨 Environment validation FAILED:');
    errors.forEach(e => console.error(e));
    if (isProd) {
      console.error('\n🚨 Refusing to start in production with invalid config.\n');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in development mode — fix before deploying to production.\n');
    }
  }
}

module.exports = validateEnv;
