# 🔐 ADMIN PASSWORD

---

## 👤 YOUR ADMIN ACCOUNT

**Email:** `7820288@gamil.com`  
**Phone:** `7820288`  
**Role:** `admin`  
**Password:** `Assampvig1@`

---

## 🚀 LOGIN STEPS

1. **Open:** `http://localhost:5173/login`

2. **Login with:**
   - **Email:** `7820288@gamil.com`
   - **Password:** `Assampvig1@`
   
   **OR**
   
   - **Phone:** `7820288`
   - **Password:** `Assampvig1@`

3. **After login, go to:**
   ```
   http://localhost:5173/admin/dashboard
   ```

4. **See 3 NEW buttons:**
   - 📢 Ticker Messages
   - 📅 Schedules
   - 🎬 Scenes & Modes

---

## ⚠️ IF PASSWORD DOESN'T WORK

**The password might have been changed. Reset it:**

### **Option 1: Reset via Database**

```bash
cd /Users/vigani/Website/tv/server
node -e "
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv'
  });
  
  const newPassword = 'BakeGrill2025!';
  const hash = await bcrypt.hash(newPassword, 10);
  
  await connection.query(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, '7820288@gamil.com']
  );
  
  console.log('✅ Password reset to: BakeGrill2025!');
  await connection.end();
})();
"
```

### **Option 2: Create New Admin**

```bash
cd /Users/vigani/Website/tv/server
node -e "
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bakegrill_tv'
  });
  
  const email = 'admin@bakegrill.com';
  const password = 'BakeGrill2025!';
  const hash = await bcrypt.hash(password, 10);
  
  await connection.query(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
    [email, hash, 'admin', hash]
  );
  
  console.log('✅ Admin user ready:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  await connection.end();
})();
"
```

---

## ✅ QUICK LOGIN

**Your credentials:**

1. **Email:** `7820288@gamil.com`  
   **Password:** `Assampvig1@`

2. **OR Phone:** `7820288`  
   **Password:** `Assampvig1@`

---

## 🎯 AFTER LOGIN

Once logged in:
1. Go to `/admin/dashboard`
2. See all 6 admin buttons
3. Click any new button to test features!

---

**Password:** `Assampvig1@` 🔐

