# Security Considerations

## Authentication & Authorization

### Password Security
- **bcrypt hashing**: 10 rounds (balance of security and performance)
- **Minimum requirements**: 8 characters, mix of letters/numbers recommended
- **Password reset**: Token-based, expires in 1 hour

### JWT Tokens
- **Algorithm**: HS256
- **Secret**: 64+ character random string (environment variable)
- **User tokens**: 7 day expiry
- **Display tokens**: No expiry (for 24/7 operation)
- **Storage**: localStorage (httpOnly cookies alternative available)

### Role-Based Access
- **Roles**: admin, user, display
- **Middleware**: verifyAuth, verifyAdmin
- **Protected routes**: All `/api/*` except auth endpoints

## Input Validation

### Server-Side
- Email format validation
- M3U URL format validation
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize inputs)
- File upload validation (type, size limits)

### Client-Side
- Form validation with error messages
- Input sanitization before API calls

## Database Security

### SQLite
- File permissions: `chmod 600 database.sqlite`
- Location: Outside web root
- Backups: Encrypted if sensitive data
- Prepared statements: All queries use parameterized inputs

### Cascading Deletes
- User deleted → All related data removed
- Prevents orphaned records

## API Security

### Rate Limiting
- Auth endpoints: 5 requests/minute per IP
- API endpoints: 100 requests/minute per user
- Prevents brute force attacks

### CORS
- Configured for same-origin
- Display mode: Allow specific origins if needed

### HTTPS
- SSL certificate required for production
- Redirects HTTP → HTTPS
- Secure cookies (when using httpOnly)

## File Uploads

### Restrictions
- **Allowed**: PNG, JPG (for PWA icons)
- **Max size**: 5MB
- **Storage**: `/uploads/` folder outside public access
- **Validation**: Check MIME type and file signature

### Serving Uploaded Files
- Serve through backend route with auth check
- No direct file system access from web

## Display/Kiosk Security

### Token Management
- Unique 32+ character tokens
- Stored hashed in database
- Can be revoked by admin
- No expiry (for 24/7 operation)

### Network Security
- Display should be on separate VLAN (cafe network)
- Restrict display devices to only access app URL

## Environment Variables

### Required
- `JWT_SECRET`: Never commit to git
- `M3U_URL`: Can contain sensitive stream URLs
- Store in `.env` file (gitignored)

### Production
- Use environment-specific secrets
- Rotate JWT_SECRET periodically
- Use hosting platform's secret management

## Monitoring & Logging

### What to Log
- Failed login attempts
- Admin actions (user creation, deletion)
- Display status changes
- API errors

### What NOT to Log
- Passwords (even hashed)
- JWT tokens
- Sensitive user data

### Log Rotation
- Keep last 30 days
- Compress old logs
- Secure log files (chmod 600)

## Regular Updates

### Dependencies
- Run `npm audit` monthly
- Update vulnerable packages
- Test after updates

### Security Patches
- Monitor Node.js security bulletins
- Update Node.js version regularly

## Backup Security

### Database Backups
- Stored outside web root
- Encrypted if containing sensitive data
- Access restricted to admin only

### Recovery Plan
- Test restore procedure quarterly
- Document recovery steps
- Keep offsite backup copy

## Compliance Notes

### Data Protection
- User data: email, watch history
- No credit card or payment info
- GDPR: Allow user data export/deletion

### Cafe Displays
- Public viewing: No personal data on screens
- Display mode: No user info shown

