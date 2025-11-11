require('dotenv').config();
const { getDatabase } = require('./init');

/**
 * Migration script to add permissions for existing users
 * Run this after updating schema with permission tables
 */
async function migratePermissions() {
  console.log('🔄 Migrating user permissions...');
  
  try {
    const db = getDatabase();
    
    // Get all users
    const [users] = await db.query('SELECT id, role FROM users');
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      // Check if permissions already exist
      const [existing] = await db.query(
        'SELECT id FROM user_permissions WHERE user_id = ?',
        [user.id]
      );
      
      if (existing.length > 0) {
        console.log(`  ⏭️  User ${user.id} already has permissions`);
        continue;
      }
      
      // Set permissions based on role
      let permissions = {};
      
      if (user.role === 'admin') {
        // Admin gets everything
        permissions = {
          can_add_playlists: true,
          can_edit_own_playlists: true,
          can_delete_own_playlists: true,
          can_manage_displays: true,
          can_control_displays: true,
          can_create_users: true,
          can_view_analytics: true,
          can_manage_schedules: true,
          max_playlists: 0, // unlimited
          max_displays: 0   // unlimited
        };
      } else if (user.role === 'staff') {
        // Staff can manage own content
        permissions = {
          can_add_playlists: true,
          can_edit_own_playlists: true,
          can_delete_own_playlists: true,
          can_manage_displays: false,
          can_control_displays: false,
          can_create_users: false,
          can_view_analytics: false,
          can_manage_schedules: false,
          max_playlists: 10,  // 10 playlists max
          max_displays: -1    // none
        };
      } else {
        // User (view only)
        permissions = {
          can_add_playlists: false,
          can_edit_own_playlists: false,
          can_delete_own_playlists: false,
          can_manage_displays: false,
          can_control_displays: false,
          can_create_users: false,
          can_view_analytics: false,
          can_manage_schedules: false,
          max_playlists: -1,  // none
          max_displays: -1    // none
        };
      }
      
      // Insert permissions
      await db.query(
        `INSERT INTO user_permissions 
        (user_id, can_add_playlists, can_edit_own_playlists, can_delete_own_playlists,
         can_manage_displays, can_control_displays, can_create_users,
         can_view_analytics, can_manage_schedules, max_playlists, max_displays)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          permissions.can_add_playlists,
          permissions.can_edit_own_playlists,
          permissions.can_delete_own_playlists,
          permissions.can_manage_displays,
          permissions.can_control_displays,
          permissions.can_create_users,
          permissions.can_view_analytics,
          permissions.can_manage_schedules,
          permissions.max_playlists,
          permissions.max_displays
        ]
      );
      
      console.log(`  ✅ Created permissions for user ${user.id} (${user.role})`);
    }
    
    console.log('✅ Permission migration complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePermissions();

