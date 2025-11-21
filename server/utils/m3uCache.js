/**
 * Simple in-memory cache for M3U playlist data
 * Reduces external HTTP requests and improves response times
 */

class M3UCache {
  constructor(ttl = 5 * 60 * 1000) { // Default 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate cache key from playlist ID and URL
   */
  generateKey(playlistId, m3uUrl) {
    return `${playlistId}-${m3uUrl}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get(playlistId, m3uUrl) {
    const key = this.generateKey(playlistId, m3uUrl);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store data in cache
   */
  set(playlistId, m3uUrl, data) {
    const key = this.generateKey(playlistId, m3uUrl);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(playlistId, m3uUrl) {
    const key = this.generateKey(playlistId, m3uUrl);
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance with 5-minute TTL
const m3uCache = new M3UCache(5 * 60 * 1000);

// Run cleanup every 10 minutes
setInterval(() => {
  m3uCache.cleanup();
}, 10 * 60 * 1000);

module.exports = m3uCache;

