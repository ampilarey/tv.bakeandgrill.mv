/**
 * Feature Flag Hook
 * Check if features are enabled via the backend feature flags system
 * Phase 1: Foundation
 */
import { useState, useEffect } from 'react';
import api from '../services/api';

// Cache feature flags to avoid repeated API calls
let featureFlagsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if a feature is enabled
 * @param {string} flagName - The feature flag name
 * @returns {boolean} - Whether the feature is enabled
 */
export function useFeatureFlag(flagName) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        // Use cache if available and fresh
        if (featureFlagsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
          setIsEnabled(featureFlagsCache[flagName] || false);
          setIsLoading(false);
          return;
        }

        // Fetch fresh flags
        const response = await api.get('/features');
        if (response.data.success) {
          featureFlagsCache = response.data.flags;
          cacheTimestamp = Date.now();
          setIsEnabled(featureFlagsCache[flagName] || false);
        }
      } catch (error) {
        console.error('Error checking feature flag:', error);
        setIsEnabled(false); // Default to disabled on error
      } finally {
        setIsLoading(false);
      }
    };

    checkFeature();
  }, [flagName]);

  return isEnabled;
}

/**
 * Hook to get all feature flags
 * @returns {object} - { flags, isLoading, refresh }
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/features');
      if (response.data.success) {
        featureFlagsCache = response.data.flags;
        cacheTimestamp = Date.now();
        setFlags(response.data.flags);
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFlags({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Use cache if available and fresh
    if (featureFlagsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      setFlags(featureFlagsCache);
      setIsLoading(false);
      return;
    }

    fetchFlags();
  }, []);

  return { flags, isLoading, refresh: fetchFlags };
}

/**
 * Invalidate the feature flags cache
 * Call this after toggling a feature flag
 */
export function invalidateFeatureFlagsCache() {
  featureFlagsCache = null;
  cacheTimestamp = null;
}

/**
 * Check if a feature is enabled (synchronous, uses cache)
 * @param {string} flagName - The feature flag name
 * @returns {boolean} - Whether the feature is enabled (false if not cached)
 */
export function isFeatureEnabled(flagName) {
  if (!featureFlagsCache) {
    return false;
  }
  return featureFlagsCache[flagName] || false;
}

export default useFeatureFlag;

