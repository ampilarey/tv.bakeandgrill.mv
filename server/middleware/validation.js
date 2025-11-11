/**
 * Validation middleware functions
 */

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters
 */
function isValidPassword(password) {
  return password && password.length >= 8;
}

/**
 * Validate M3U URL format
 */
function isValidM3UUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate time format (HH:MM:SS or HH:MM)
 */
function isValidTime(time) {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
  return timeRegex.test(time);
}

/**
 * Validate day of week (0-6)
 */
function isValidDayOfWeek(day) {
  return day === null || (Number.isInteger(day) && day >= 0 && day <= 6);
}

/**
 * Middleware: Validate login request
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
}

/**
 * Middleware: Validate user creation
 */
function validateUserCreate(req, res, next) {
  const { email, password, role } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (role && !['admin', 'staff', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role. Must be "admin", "staff", or "user"',
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
}

/**
 * Middleware: Validate playlist creation
 */
function validatePlaylistCreate(req, res, next) {
  const { name, m3u_url } = req.body;
  
  if (!name || !m3u_url) {
    return res.status(400).json({
      success: false,
      error: 'Name and M3U URL are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (!isValidM3UUrl(m3u_url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid M3U URL format',
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
}

/**
 * Middleware: Validate display creation
 */
function validateDisplayCreate(req, res, next) {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Display name is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
}

/**
 * Middleware: Validate schedule creation
 */
function validateScheduleCreate(req, res, next) {
  const { channel_id, start_time, end_time, day_of_week } = req.body;
  
  if (!channel_id || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      error: 'Channel ID, start time, and end time are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid time format. Use HH:MM or HH:MM:SS',
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (day_of_week !== undefined && !isValidDayOfWeek(day_of_week)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid day of week. Must be 0-6 or null',
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidM3UUrl,
  isValidTime,
  isValidDayOfWeek,
  validateLogin,
  validateUserCreate,
  validatePlaylistCreate,
  validateDisplayCreate,
  validateScheduleCreate
};

