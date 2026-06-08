const crypto = require('crypto');
const bcrypt = require('bcrypt');

function syntheticDisplayPhone() {
  return `9${String(Math.floor(100000 + Math.random() * 900000))}`;
}

function isDisplayRoleConstraintError(error) {
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('check constraint')
    || msg.includes('chk_1')
    || error.code === 'ER_CHECK_CONSTRAINT_VIOLATED'
    || error.code === 'ER_CONSTRAINT_FAILED'
    || error.errno === 4025
  );
}

/**
 * Create an internal user row for a kiosk display (history/favorites FK).
 * Production DBs require phone_number and may need the display role in users_chk_1.
 */
async function createDisplaySystemUser(db, { name, location }) {
  const displayEmail = `display_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@internal.system`;
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const firstName = `Display: ${name}`;
  const lastName = location || 'Kiosk';

  for (let attempt = 0; attempt < 8; attempt++) {
    const phoneNumber = syntheticDisplayPhone();
    try {
      const [result] = await db.query(
        `INSERT INTO users (email, phone_number, password_hash, role, first_name, last_name, is_active)
         VALUES (?, ?, ?, 'display', ?, ?, 1)`,
        [displayEmail, phoneNumber, passwordHash, firstName, lastName]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') continue;

      if (error.code === 'ER_BAD_FIELD_ERROR') {
        const [result] = await db.query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
           VALUES (?, ?, 'display', ?, ?, 1)`,
          [displayEmail, passwordHash, firstName, lastName]
        );
        return result.insertId;
      }

      if (isDisplayRoleConstraintError(error)) {
        const err = new Error(
          'Display pairing is blocked by database role settings. Ask your admin to run: node database/run-fix-display-role.js'
        );
        err.status = 503;
        err.userFacing = true;
        err.code = 'DISPLAY_ROLE_NOT_ALLOWED';
        throw err;
      }

      throw error;
    }
  }

  const err = new Error('Could not create display system user. Please try again.');
  err.status = 500;
  err.userFacing = true;
  err.code = 'DISPLAY_USER_CREATE_FAILED';
  throw err;
}

module.exports = {
  createDisplaySystemUser,
  isDisplayRoleConstraintError,
};
