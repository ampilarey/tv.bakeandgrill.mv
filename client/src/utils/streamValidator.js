/**
 * Stream Validator Utility
 * Lazy validation - check streams in background
 * Phase Enhancement: Live Channel Detection
 */

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = 'stream_status_cache';
const CHECK_TIMEOUT = 10000; // 10 seconds per stream

/**
 * Check if a stream URL is live
 * @param {string} url - Stream URL
 * @returns {Promise<object>} - { live: boolean, checkedAt: timestamp }
 */
export async function checkStreamStatus(url) {
  try {
    // Check cache first
    const cached = getCachedStatus(url);
    if (cached) {
      return cached;
    }

    // For HLS streams (.m3u8), try to fetch the playlist
    if (url.includes('.m3u8')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

      try {
        const response = await fetch(url, {
          method: 'HEAD', // Use HEAD for lighter request
          signal: controller.signal,
          mode: 'no-cors' // Bypass CORS for checking
        });
        
        clearTimeout(timeoutId);

        // Note: With no-cors, we can't read the response
        // But if the fetch succeeds without error, stream likely exists
        const result = {
          live: true,
          checkedAt: Date.now(),
          method: 'HEAD'
        };

        cacheStatus(url, result);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // If HEAD fails, try GET with timeout
        try {
          const getController = new AbortController();
          const getTimeoutId = setTimeout(() => getController.abort(), CHECK_TIMEOUT);
          
          const getResponse = await fetch(url, {
            method: 'GET',
            signal: getController.signal,
            mode: 'no-cors'
          });
          
          clearTimeout(getTimeoutId);
          
          const result = {
            live: true,
            checkedAt: Date.now(),
            method: 'GET'
          };
          
          cacheStatus(url, result);
          return result;
        } catch (getError) {
          // Both HEAD and GET failed
          const result = {
            live: false,
            checkedAt: Date.now(),
            error: getError.message
          };
          
          cacheStatus(url, result);
          return result;
        }
      }
    }

    // For non-HLS URLs, assume live (can't reliably check)
    const result = {
      live: true,
      checkedAt: Date.now(),
      method: 'assumed'
    };
    
    return result;
  } catch (error) {
    console.error('Stream check error:', error);
    return {
      live: false,
      checkedAt: Date.now(),
      error: error.message
    };
  }
}

/**
 * Check multiple streams with rate limiting
 * @param {Array} channels - Array of channel objects
 * @param {Function} onProgress - Callback(channelId, status)
 * @param {number} batchSize - How many to check at once
 */
export async function checkChannelsBatch(channels, onProgress, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (channel) => {
      const status = await checkStreamStatus(channel.url);
      
      if (onProgress) {
        onProgress(channel.id, status);
      }
      
      return {
        channelId: channel.id,
        ...status
      };
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the browser
    if (i + batchSize < channels.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Get cached stream status
 */
function getCachedStatus(url) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const cached = cache[url];
    
    if (cached && (Date.now() - cached.checkedAt < CACHE_DURATION)) {
      return cached;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Cache stream status
 */
function cacheStatus(url, status) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[url] = status;
    
    // Cleanup old entries (keep only last 500)
    const entries = Object.entries(cache);
    if (entries.length > 500) {
      const sorted = entries.sort((a, b) => b[1].checkedAt - a[1].checkedAt);
      const trimmed = Object.fromEntries(sorted.slice(0, 500));
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    console.error('Failed to cache status:', e);
  }
}

/**
 * Clear stream status cache
 */
export function clearStreamCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entries = Object.entries(cache);
    
    return {
      total: entries.length,
      live: entries.filter(([, v]) => v.live).length,
      offline: entries.filter(([, v]) => !v.live).length,
      oldestCheck: entries.length > 0 
        ? new Date(Math.min(...entries.map(([, v]) => v.checkedAt)))
        : null
    };
  } catch (e) {
    return { total: 0, live: 0, offline: 0 };
  }
}

