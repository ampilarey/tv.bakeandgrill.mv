# 🔧 MySQL Setup Guide

## Quick Setup for Development

### 1. Install MySQL (if not already installed)

**Mac (Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Download from https://dev.mysql.com/downloads/mysql/

**Linux:**
```bash
sudo apt-get install mysql-server
sudo systemctl start mysql
```

### 2. Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE bakegrill_tv;

# Create user (optional, for production)
CREATE USER 'bakegrill'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON bakegrill_tv.* TO 'bakegrill'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### 3. Configure Environment

Create `/server/.env` file:
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=bake-and-grill-tv-super-secret-jwt-key-change-this

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bakegrill_tv

DEFAULT_ADMIN_EMAIL=admin@bakegrill.com
DEFAULT_ADMIN_PASSWORD=BakeGrill2025!
```

### 4. Install Dependencies & Initialize

```bash
cd server
npm install
node database/init.js
```

### 5. Start Server

```bash
npm run dev
```

---

## cPanel Deployment

1. **Create MySQL Database in cPanel:**
   - Go to "MySQL® Databases"
   - Create database: `username_bakegrill_tv`
   - Create user with password
   - Add user to database with ALL PRIVILEGES

2. **Note Your Credentials:**
   - Host: `localhost`
   - Database: `username_bakegrill_tv`
   - User: `username_bakegrill`
   - Password: (your chosen password)

3. **Set Environment Variables in cPanel Node.js App:**
   ```
   DB_HOST=localhost
   DB_USER=username_bakegrill
   DB_PASSWORD=your_password
   DB_NAME=username_bakegrill_tv
   JWT_SECRET=your-64-char-random-secret
   NODE_ENV=production
   ```

4. **Initialize Database:**
   ```bash
   cd /home/username/tv/server
   node database/init.js
   ```

Done! ✅

