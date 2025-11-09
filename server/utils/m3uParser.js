const crypto = require('crypto');

/**
 * Parse M3U playlist text into structured channel objects
 * @param {string} m3uText - Raw M3U file content
 * @returns {Array} Array of channel objects
 */
function parseM3U(m3uText) {
  try {
    const lines = m3uText.split('\n').map(line => line.trim()).filter(Boolean);
    const channels = [];
    
    let currentChannel = null;
    let channelIndex = 0; // Add counter for unique IDs
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip #EXTM3U header
      if (line === '#EXTM3U' || line.startsWith('#EXTM3U:')) {
        continue;
      }
      
      // Parse #EXTINF line
      if (line.startsWith('#EXTINF:')) {
        // M3U format: #EXTINF:duration [attributes],Channel Name
        // Remove #EXTINF: prefix
        const content = line.substring(8); // Remove '#EXTINF:'
        
        // Extract attributes and name
        // Attributes are key="value" pairs before the comma
        // Name is everything after the last comma (that's not inside quotes)
        
        const attributes = {};
        let channelName = 'Unknown Channel';
        
        // Extract tvg-id
        const tvgIdMatch = content.match(/tvg-id="([^"]*)"/i);
        if (tvgIdMatch) attributes.tvgId = tvgIdMatch[1];
        
        // Extract tvg-name
        const tvgNameMatch = content.match(/tvg-name="([^"]*)"/i);
        if (tvgNameMatch) attributes.tvgName = tvgNameMatch[1];
        
        // Extract tvg-logo
        const tvgLogoMatch = content.match(/tvg-logo="([^"]*)"/i);
        if (tvgLogoMatch) attributes.tvgLogo = tvgLogoMatch[1];
        
        // Extract group-title
        const groupTitleMatch = content.match(/group-title="([^"]*)"/i);
        if (groupTitleMatch) attributes.group = groupTitleMatch[1];
        
        // Extract channel name - find the pattern ",Name" where Name is after the last quoted section
        // Split by comma and take the LAST part (that doesn't start with a space followed by an attribute)
        const parts = content.split(',');
        
        // The channel name is in the last part, after all attributes
        if (parts.length > 1) {
          // Get the last part
          const lastPart = parts[parts.length - 1].trim();
          
          // Make sure it's not an attribute (doesn't contain '="')
          if (!lastPart.includes('="') && lastPart.length > 0) {
            channelName = lastPart;
          } else if (parts.length > 2) {
            // Try second to last part
            const secondLast = parts[parts.length - 2].trim();
            if (!secondLast.includes('="') && secondLast.length > 0) {
              channelName = secondLast;
            }
          }
        }
        
        // Fallback to tvg-name or tvg-id if channel name is still unknown
        if (channelName === 'Unknown Channel' || channelName.includes('tvg-') || channelName.includes('="')) {
          if (attributes.tvgName && attributes.tvgName.length > 0) {
            channelName = attributes.tvgName;
          } else if (attributes.tvgId && attributes.tvgId.length > 0) {
            channelName = attributes.tvgId;
          }
        }
        
        // Clean up channel name - remove any leftover quotes or weird characters
        channelName = channelName.replace(/^["']+|["']+$/g, '').trim();
        
        // Normalize group name - trim and clean
        const groupName = attributes.group ? attributes.group.trim() : 'Uncategorized';
        
        currentChannel = {
          name: channelName,
          logo: attributes.tvgLogo || null,
          group: groupName,
          tvgId: attributes.tvgId || null
        };
      }
      // Parse stream URL (line after #EXTINF)
      else if (currentChannel && !line.startsWith('#')) {
        // This is the stream URL
        currentChannel.url = line;
        
        // Generate unique ID (hash of URL + index to ensure uniqueness)
        currentChannel.id = generateChannelId(line + channelIndex);
        currentChannel.index = channelIndex;
        channelIndex++;
        
        // Add to channels array
        channels.push(currentChannel);
        
        // Reset for next channel
        currentChannel = null;
      }
    }
    
    return channels;
    
  } catch (error) {
    console.error('Error parsing M3U:', error.message);
    return [];
  }
}

/**
 * Generate a unique ID for a channel based on its URL
 * @param {string} url - Channel stream URL
 * @returns {string} Unique channel ID
 */
function generateChannelId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * Extract unique groups from channels
 * @param {Array} channels - Array of channel objects
 * @returns {Array} Array of unique group names
 */
function extractGroups(channels) {
  const groups = new Set();
  
  channels.forEach(channel => {
    if (channel.group && channel.group.trim().length > 0) {
      // Normalize group name - trim whitespace
      const normalizedGroup = channel.group.trim();
      groups.add(normalizedGroup);
    }
  });
  
  // Return sorted array, filter out empty strings
  return Array.from(groups).filter(g => g && g.length > 0).sort();
}

/**
 * Filter channels by search query
 * @param {Array} channels - Array of channel objects
 * @param {string} query - Search query
 * @returns {Array} Filtered channels
 */
function searchChannels(channels, query) {
  if (!query) return channels;
  
  const lowerQuery = query.toLowerCase();
  
  return channels.filter(channel => 
    channel.name.toLowerCase().includes(lowerQuery) ||
    (channel.group && channel.group.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filter channels by group
 * @param {Array} channels - Array of channel objects
 * @param {string} group - Group name
 * @returns {Array} Filtered channels
 */
function filterByGroup(channels, group) {
  if (!group) return channels;
  
  return channels.filter(channel => channel.group === group);
}

/**
 * Sort channels
 * @param {Array} channels - Array of channel objects
 * @param {string} sortBy - Sort field (name, group)
 * @returns {Array} Sorted channels
 */
function sortChannels(channels, sortBy = 'name') {
  return [...channels].sort((a, b) => {
    if (sortBy === 'group') {
      return (a.group || '').localeCompare(b.group || '');
    }
    return a.name.localeCompare(b.name);
  });
}

module.exports = {
  parseM3U,
  generateChannelId,
  extractGroups,
  searchChannels,
  filterByGroup,
  sortChannels
};
