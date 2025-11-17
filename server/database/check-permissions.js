#!/usr/bin/env node

/**
 * Check user permissions in database
 * Run: node server/database/check-permissions.js [userId]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function checkPermissions() {
  try {
    const userId = process.argv[2];
    
    if (!userId) {
      console.log('Usage: node check-permissions.js [userId]');
      console.log('\nFetching all users first...\n');
    }
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakegrill_tv',
    });
    
    const conn = await pool.getConnection();
    
    // Show all users
    console.log('👥 All Users:\n');
    const [users] = await conn.query(`
      SELECT id, email, role, first_name, last_name, is_active 
      FROM users 
      WHERE role != 'display'
      ORDER BY id
    `);
    
    users.forEach(u => {
      console.log(`  ${u.id}: ${u.email} (${u.role}) - ${u.first_name} ${u.last_name} - ${u.is_active ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Show permissions for specific user or all
    const userIdToCheck = userId || (users.length > 0 ? users.map(u => u.id) : []);
    
    if (Array.isArray(userIdToCheck)) {
      for (const uid of userIdToCheck) {
        await showUserPermissions(conn, uid);
      }
    } else {
      await showUserPermissions(conn, userIdToCheck);
    }
    
    conn.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function showUserPermissions(conn, userId) {
  console.log(`🔑 Permissions for User ID ${userId}:\n`);
  
  const [perms] = await conn.query(`
    SELECT * FROM user_permissions WHERE user_id = ?
  `, [userId]);
  
  if (perms.length === 0) {
    console.log('  ⚠️  No permissions set (will use role defaults)\n');
    return;
  }
  
  const p = perms[0];
  
  console.log('  Playlist Permissions:');
  console.log(`    can_add_playlists: ${p.can_add_playlists}`);
  console.log(`    can_edit_own_playlists: ${p.can_edit_own_playlists}`);
  console.log(`    can_delete_own_playlists: ${p.can_delete_own_playlists}`);
  console.log(`    max_playlists: ${p.max_playlists}`);
  
  console.log('\n  Display Permissions:');
  console.log(`    can_manage_displays: ${p.can_manage_displays} (Type: ${typeof p.can_manage_displays})`);
  console.log(`    can_control_displays: ${p.can_control_displays} (Type: ${typeof p.can_control_displays})`);
  console.log(`    max_displays: ${p.max_displays}`);
  
  console.log('\n  Advanced Permissions:');
  console.log(`    can_create_users: ${p.can_create_users}`);
  console.log(`    can_view_analytics: ${p.can_view_analytics}`);
  console.log(`    can_manage_schedules: ${p.can_manage_schedules}`);
  
  console.log('\n' + '-'.repeat(80) + '\n');
}

checkPermissions();

