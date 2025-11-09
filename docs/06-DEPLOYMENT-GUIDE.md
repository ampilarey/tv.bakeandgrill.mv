# Deployment Guide for cPanel

Complete deployment instructions for Bake and Grill TV on cPanel Node.js hosting.

---

## Prerequisites

### What You Need:
1. **cPanel hosting account** with:
   - Node.js support (v18 or higher)
   - SSH access (optional but recommended)
   - File Manager or FTP access
2. **Subdomain created**: e.g., `tv.bakeandgrill.com`
3. **M3U playlist URL** ready
4. **Project files** (from development)

---

## Step 1: Prepare Files Locally

### A. Build Frontend
```bash
# Navigate to client folder
cd /Users/vigani/Website/tv/client

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in client/dist/
```

### B. Prepare Backend
```bash
# Navigate to server folder
cd /Users/vigani/Website/tv/server

# Install production dependencies
npm install --production

# Ensure package.json has correct start script:
# "scripts": { "start": "node server.js" }
```

### C. Create .env File
In `/Users/vigani/Website/tv/server/.env`:
```env
PORT=4000
M3U_URL=https://your-m3u-playlist-url.m3u
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

**Important**: Generate a strong JWT_SECRET (random 64-character string)

---

## Step 2: Upload Files to cPanel

### Option A: Using File Manager (Easier)

1. **Login to cPanel**
   - Go to your hosting control panel

2. **Navigate to File Manager**
   - Open File Manager
   - Navigate to: `/home/USERNAME/`

3. **Create Project Folder**
   - Create new folder: `tv` (or `bakegrill-tv`)
   - Result: `/home/USERNAME/tv/`

4. **Upload Files**
   - Upload entire `server/` folder contents to `/home/USERNAME/tv/server/`
   - Upload entire `client/dist/` folder to `/home/USERNAME/tv/client/dist/`
   - Upload `package.json` and `package-lock.json` from server folder

5. **File Structure on Server**:
```
/home/USERNAME/tv/
├── server/
│   ├── server.js
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── uploads/
│   ├── package.json
│   ├── package-lock.json
│   └── .env
└── client/
    └── dist/
        ├── index.html
        ├── assets/
        └── ...
```

### Option B: Using SSH/SCP (Advanced)

```bash
# From your local machine
# Compress project
tar -czf bakegrill-tv.tar.gz server/ client/dist/

# Upload via SCP
scp bakegrill-tv.tar.gz username@yourserver.com:/home/USERNAME/

# SSH into server
ssh username@yourserver.com

# Extract
cd /home/USERNAME/
tar -xzf bakegrill-tv.tar.gz
mv server tv/server
mv client/dist tv/client/dist
```

---

## Step 3: Setup Node.js Application in cPanel

### A. Access Setup Node.js App

1. **Login to cPanel**
2. **Find "Setup Node.js App"** (in Software section)
3. **Click "Create Application"**

### B. Application Configuration

Fill in the form:

| Field | Value |
|-------|-------|
| **Node.js version** | 18.x or higher (latest available) |
| **Application mode** | Production |
| **Application root** | `/home/USERNAME/tv/server` |
| **Application URL** | Select your subdomain: `tv.bakeandgrill.com` |
| **Application startup file** | `server.js` |
| **Passenger log file** | (leave default or specify custom) |

### C. Environment Variables

In the same form, add environment variables:

| Variable Name | Value |
|---------------|-------|
| `M3U_URL` | `https://your-m3u-playlist-url.m3u` |
| `JWT_SECRET` | `your-64-char-random-secret` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` (or leave empty, cPanel assigns) |

**Important**: Don't include PORT if cPanel auto-assigns it.

### D. Save and Start

1. **Click "Create"**
2. cPanel will:
   - Install Node.js
   - Run `npm install` automatically
   - Start the application
3. **Copy the command to enter virtual environment** (you'll need this)

---

## Step 4: Install Dependencies

### Via cPanel Terminal

1. **Open Terminal in cPanel** (or SSH)
2. **Enter virtual environment**:
```bash
cd /home/USERNAME/tv/server
source /home/USERNAME/nodevenv/tv/server/18/bin/activate
```
3. **Install dependencies**:
```bash
npm install
```
4. **Exit**:
```bash
deactivate
```

---

## Step 5: Initialize Database

### Create Default Admin User

1. **Access Terminal**
2. **Enter virtual environment** (as above)
3. **Run initialization script**:
```bash
node database/init.js
```
This will:
- Create SQLite database
- Create all tables
- Insert default admin user: `admin@bakegrill.com` / `BakeGrill2025!`

**IMPORTANT**: Login immediately and change the admin password!

---

## Step 6: Configure Subdomain

### A. Verify Subdomain Points to App

1. **cPanel → Domains** (or Subdomains)
2. **Ensure subdomain exists**: `tv.bakeandgrill.com`
3. **Document Root should point to**: `/home/USERNAME/tv/server`
   - cPanel Node.js App handles this automatically

### B. Test Access

1. **Open browser**
2. **Navigate to**: `https://tv.bakeandgrill.com`
3. **You should see**: Login page (or landing page)

---

## Step 7: SSL Certificate

### Enable HTTPS (Highly Recommended)

1. **cPanel → SSL/TLS Status**
2. **Select domain**: `tv.bakeandgrill.com`
3. **Click "Run AutoSSL"**
4. **Wait for certificate installation**
5. **Test**: `https://tv.bakeandgrill.com` (should work with padlock icon)

---

## Step 8: Configure App Settings

### A. First Login

1. **Visit**: `https://tv.bakeandgrill.com`
2. **Login with default admin**:
   - Email: `admin@bakegrill.com`
   - Password: `BakeGrill2025!`
3. **Immediately change password**:
   - Go to Profile → Change Password

### B. Upload PWA Icon

1. **Admin Dashboard → Settings → PWA Icon**
2. **Upload 512x512 PNG** with Bake and Grill logo
3. **Click "Generate Icons"** (creates all sizes)

### C. Update App Name

1. **Settings → General**
2. **App Name**: "Bake and Grill TV"
3. **Save**

---

## Step 9: Restart Application

### When to Restart:
- After changing environment variables
- After code updates
- After database schema changes

### How to Restart:

1. **cPanel → Setup Node.js App**
2. **Find your application**
3. **Click "Restart"** button
4. **Wait ~10 seconds**
5. **Test in browser**

---

## Step 10: Create First Display (Cafe TV)

### A. Create Display Token

1. **Admin Dashboard → Displays**
2. **Click "Add New Display"**
3. **Fill form**:
   - Name: "Main Wall Display"
   - Location: "Cafe Main Wall"
   - Assign Playlist: (create one first if needed)
   - Auto-play: ✓ Enabled
4. **Click "Create"**

### B. Display URL

After creation, you'll see:
```
Display URL: https://tv.bakeandgrill.com?display=GENERATED_TOKEN_HERE

Example: https://tv.bakeandgrill.com?display=cafe-wall-abc123xyz
```

**Copy this URL**

### C. Setup Cafe TV

1. **Open browser on cafe TV/tablet**
2. **Navigate to the display URL**
3. **Bookmark it / set as homepage**
4. **Enable fullscreen (F11 on most browsers)**
5. **Auto-play will start**

---

## Maintenance

### Daily Backups (Recommended)

#### Setup Cron Job for Database Backup:

1. **cPanel → Cron Jobs**
2. **Add New Cron Job**:
   - **Minute**: `0`
   - **Hour**: `3` (3 AM)
   - **Command**:
```bash
cp /home/USERNAME/tv/server/database/database.sqlite /home/USERNAME/tv/server/database/backups/backup-$(date +\%Y\%m\%d).sqlite
```

#### Keep Last 7 Days:
Add another cron (daily at 4 AM):
```bash
find /home/USERNAME/tv/server/database/backups/ -name "backup-*.sqlite" -mtime +7 -delete
```

### View Logs

1. **cPanel → Setup Node.js App**
2. **Click "View Log"** next to your app
3. **Check for errors**

Or via SSH:
```bash
tail -f /home/USERNAME/logs/tv_bakeandgrill_com.log
```

### Update Code

1. **Build new frontend locally**: `npm run build`
2. **Upload new `client/dist/`** files via File Manager
3. **Update `server/` files** if backend changed
4. **Restart application** in cPanel

---

## Troubleshooting

### Issue: "Application failed to start"

**Solutions:**
1. Check Node.js version (must be 18+)
2. Verify `server.js` exists in Application Root
3. Check logs for errors
4. Ensure `package.json` has correct start script
5. Verify all environment variables are set

### Issue: "Cannot connect to database"

**Solutions:**
1. Ensure `database/` folder has write permissions: `chmod 755`
2. Run initialization: `node database/init.js`
3. Check if `database.sqlite` file exists

### Issue: "Streams won't play"

**Solutions:**
1. Verify M3U_URL is correct and accessible
2. Check if M3U file is valid
3. Test stream URL directly in browser
4. Check CORS settings (streams must allow cross-origin)

### Issue: "Display token doesn't work"

**Solutions:**
1. Verify token in database (`displays` table)
2. Check if display is active (`is_active = 1`)
3. Ensure display has assigned playlist
4. Test URL format: `?display=TOKEN` (not `&display`)

### Issue: "Can't upload files"

**Solutions:**
1. Check folder permissions: `chmod 755 uploads/`
2. Verify `uploads/` folder exists
3. Check max upload size in cPanel → PHP settings
4. Increase if needed: `upload_max_filesize = 10M`

---

## Performance Optimization

### Enable Compression

In `.htaccess` (if not already):
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### Enable Caching

In `.htaccess`:
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Monitor Resources

1. **cPanel → Resource Usage**
2. **Check**: CPU, Memory, I/O usage
3. **If high**: Consider upgrading hosting plan

---

## Security Checklist

- [ ] Changed default admin password
- [ ] JWT_SECRET is strong and unique (64+ chars)
- [ ] SSL certificate installed (HTTPS)
- [ ] `.env` file has correct permissions (`chmod 600`)
- [ ] Database file not publicly accessible
- [ ] Regular backups enabled
- [ ] User registration disabled (or monitored)
- [ ] Display tokens kept private
- [ ] Logs monitored for suspicious activity

---

## Post-Deployment Testing

### Test Checklist:

1. [ ] Visit `https://tv.bakeandgrill.com` → Loads correctly
2. [ ] Register new user → Success
3. [ ] Login → Success
4. [ ] Add playlist with M3U URL → Fetches channels
5. [ ] Play channel → Video streams
6. [ ] Favorite a channel → Saved
7. [ ] View watch history → Shows entries
8. [ ] Admin login → Access admin dashboard
9. [ ] Create display token → Success
10. [ ] Open display URL → Auto-plays in kiosk mode
11. [ ] Remote control display → Changes channel
12. [ ] PWA install prompt → Appears on mobile
13. [ ] Install PWA → Works as app

---

## Support & Monitoring

### Set Up Monitoring (Optional)

1. **UptimeRobot** (free): Monitor if site is up
2. **Google Analytics**: Track usage
3. **Sentry**: Error tracking (optional)

### Health Check

Add cron job to ping `/api/health` every 5 minutes:
```bash
*/5 * * * * curl -s https://tv.bakeandgrill.com/api/health > /dev/null
```

---

## Scaling Considerations

If you outgrow shared hosting:

1. **VPS Hosting**: More resources, root access
2. **Cloud Hosting**: AWS, DigitalOcean, etc.
3. **CDN**: Cloudflare for static assets
4. **Database**: Migrate to PostgreSQL/MySQL for better performance
5. **Load Balancer**: Multiple server instances

---

## Backup & Recovery

### Full Backup:

```bash
# Database
cp database/database.sqlite backups/

# Uploads (PWA icons, etc.)
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz uploads/

# Config
cp .env backups/env-$(date +%Y%m%d).txt
```

### Restore:

```bash
# Database
cp backups/database.sqlite database/

# Uploads
tar -xzf backups/uploads-YYYYMMDD.tar.gz

# Restart app
# (via cPanel Node.js App → Restart)
```

---

## Quick Reference

### Important Paths:
- **App Root**: `/home/USERNAME/tv/server/`
- **Frontend**: `/home/USERNAME/tv/client/dist/`
- **Database**: `/home/USERNAME/tv/server/database/database.sqlite`
- **Uploads**: `/home/USERNAME/tv/server/uploads/`
- **Logs**: `/home/USERNAME/logs/tv_bakeandgrill_com.log`

### Important URLs:
- **Main Site**: `https://tv.bakeandgrill.com`
- **Health Check**: `https://tv.bakeandgrill.com/api/health`
- **Admin**: `https://tv.bakeandgrill.com/admin/dashboard`
- **Display**: `https://tv.bakeandgrill.com?display=TOKEN`

### Default Credentials:
- **Email**: `admin@bakegrill.com`
- **Password**: `BakeGrill2025!`
- **⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN**

---

**Deployment Complete! 🎉**

