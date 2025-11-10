const express = require('express');
const axios = require('axios');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { parseM3U, extractGroups, searchChannels, filterByGroup, sortChannels } = require('../utils/m3uParser');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/channels
 * Get channels from a playlist
 * Query params: playlistId, search, group, sort
 */
router.get('/', asyncHandler(async (req, res) => {
  const { playlistId, search, group, sort } = req.query;
  
  if (!playlistId) {
    return res.status(400).json({
      success: false,
      error: 'Playlist ID is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  const db = getDatabase();
  
  // Get playlist
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ? AND is_active = TRUE', [playlistId]);
  
  if (playlists.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  const playlist = playlists[0];
  
  try {
    // Fetch M3U file
    const response = await axios.get(playlist.m3u_url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'BakeGrillTV/1.0'
      }
    });
    
    // Parse M3U
    let channels = parseM3U(response.data);
    
    if (channels.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse M3U file or no channels found',
        code: 'M3U_PARSE_ERROR'
      });
    }
    
    // Apply filters
    if (search) {
      channels = searchChannels(channels, search);
    }
    
    if (group) {
      channels = filterByGroup(channels, group);
    }
    
    // Sort channels
    channels = sortChannels(channels, sort || 'name');
    
    // Extract unique groups
    const groups = extractGroups(channels);
    
    // Update last_fetched timestamp
    await db.query('UPDATE playlists SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);
    
    res.json({
      success: true,
      channels,
      groups,
      total: channels.length,
      playlistId: parseInt(playlistId)
    });
    
  } catch (error) {
    console.error('Error fetching M3U:', error.message);
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout while fetching M3U file',
        code: 'M3U_FETCH_TIMEOUT'
      });
    }
    
    if (error.response && error.response.status >= 400) {
      return res.status(502).json({
        success: false,
        error: `Failed to fetch M3U file (HTTP ${error.response.status})`,
        code: 'M3U_FETCH_FAILED'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch or parse M3U file',
      code: 'M3U_ERROR'
    });
  }
}));

/**
 * GET /api/channels/:id
 * Get single channel details (not implemented - channels are not stored)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Single channel lookup not implemented',
    code: 'NOT_IMPLEMENTED'
  });
}));

module.exports = router;
