/**
 * Upsell Logic Utility
 * Smart product promotion system
 * Phase 7: Templates & CMS
 */
const { getDatabase } = require('../database/init');

/**
 * Get playlist items with upsell items inserted at regular intervals
 * @param {number} playlistId - Playlist ID
 * @param {number} upsellFrequency - Show upsell every N items (0 = disabled)
 * @param {boolean} kidsMode - Filter out non-kids-friendly content
 * @returns {Array} - Playlist items with upsells inserted
 */
async function getPlaylistWithUpsells(playlistId, upsellFrequency = 5, kidsMode = false) {
  const db = getDatabase();
  
  // Get all playlist items
  let query = 'SELECT * FROM playlist_items WHERE playlist_id = ?';
  const params = [playlistId];
  
  // Filter for kids-friendly if kids mode
  if (kidsMode) {
    query += ' AND is_kids_friendly = TRUE';
  }
  
  query += ' ORDER BY sort_order ASC, created_at ASC';
  
  const [items] = await db.query(query, params);
  
  // Separate upsell items and regular items
  const upsellItems = items.filter(item => item.is_upsell === true);
  const regularItems = items.filter(item => item.is_upsell !== true);
  
  // If no upsells or frequency is 0, return regular items
  if (upsellItems.length === 0 || upsellFrequency === 0) {
    return regularItems;
  }
  
  // Insert upsell items at regular intervals
  const result = [];
  let upsellIndex = 0;
  
  for (let i = 0; i < regularItems.length; i++) {
    result.push(regularItems[i]);
    
    // Insert upsell every N items
    if ((i + 1) % upsellFrequency === 0 && upsellItems.length > 0) {
      const upsellItem = upsellItems[upsellIndex % upsellItems.length];
      result.push(upsellItem);
      upsellIndex++;
    }
  }
  
  return result;
}

/**
 * Mark items as upsell
 * @param {number} itemId - Playlist item ID
 * @param {boolean} isUpsell - Is upsell or not
 */
async function markAsUpsell(itemId, isUpsell) {
  const db = getDatabase();
  await db.query(
    'UPDATE playlist_items SET is_upsell = ? WHERE id = ?',
    [isUpsell ? 1 : 0, itemId]
  );
}

/**
 * Get upsell statistics for a playlist
 * @param {number} playlistId - Playlist ID
 * @returns {Object} - Upsell statistics
 */
async function getUpsellStats(playlistId) {
  const db = getDatabase();
  
  const [stats] = await db.query(
    `SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN is_upsell = TRUE THEN 1 ELSE 0 END) as upsell_items,
      SUM(CASE WHEN is_upsell = FALSE THEN 1 ELSE 0 END) as regular_items
     FROM playlist_items 
     WHERE playlist_id = ?`,
    [playlistId]
  );
  
  return stats[0] || { total_items: 0, upsell_items: 0, regular_items: 0 };
}

module.exports = {
  getPlaylistWithUpsells,
  markAsUpsell,
  getUpsellStats
};

