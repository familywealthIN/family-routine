/**
 * Dashboard Cache Utility
 *
 * Caches Description and Next Steps from Area/Project dashboards
 * in localStorage with a 24-hour TTL. Used by the AI Search Modal
 * "Build on Next Steps" feature to inject cached context as a system prompt.
 *
 * Cache key format: DASHBOARD_CACHE:<tag>
 * Cache value: { description, nextSteps, timestamp }
 */

export const CACHE_KEY_PREFIX = 'DASHBOARD_CACHE:';
export const CACHE_TTL = 86400000; // 24 hours in milliseconds

/**
 * Check if a cache entry exists and is still valid (within TTL)
 * @param {string} tag - The area/project tag (e.g., "area:health")
 * @returns {boolean}
 */
export function isCacheValid(tag) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + tag);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return entry && entry.timestamp && (Date.now() - entry.timestamp < CACHE_TTL);
  } catch {
    return false;
  }
}

/**
 * Get cached dashboard data for a tag
 * @param {string} tag - The area/project tag
 * @returns {{ description: string, nextSteps: string } | null}
 */
export function getCachedDashboard(tag) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + tag);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.timestamp || (Date.now() - entry.timestamp >= CACHE_TTL)) {
      // Expired — remove it
      localStorage.removeItem(CACHE_KEY_PREFIX + tag);
      return null;
    }
    return {
      description: entry.description || '',
      nextSteps: entry.nextSteps || '',
    };
  } catch {
    return null;
  }
}

/**
 * Store dashboard data in cache
 * @param {string} tag - The area/project tag
 * @param {string} description - AI-generated description text
 * @param {string} nextSteps - AI-generated next steps markdown
 */
export function setCachedDashboard(tag, description, nextSteps) {
  try {
    const entry = {
      description: description || '',
      nextSteps: nextSteps || '',
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_PREFIX + tag, JSON.stringify(entry));
  } catch (err) {
    console.error('Failed to cache dashboard data for', tag, err);
  }
}

/**
 * Get combined cached dashboard data for multiple area/project tags.
 * Concatenates description and next steps from all matched tags with headers.
 * @param {string[]} tags - Array of area/project tag strings
 * @returns {{ description: string, nextSteps: string } | null}
 */
export function getAllCachedDashboards(tags) {
  const descriptions = [];
  const nextStepsList = [];

  tags.forEach((tag) => {
    const cached = getCachedDashboard(tag);
    if (cached) {
      if (cached.description) {
        descriptions.push(`[${tag}]\n${cached.description}`);
      }
      if (cached.nextSteps) {
        nextStepsList.push(`[${tag}]\n${cached.nextSteps}`);
      }
    }
  });

  if (descriptions.length === 0 && nextStepsList.length === 0) {
    return null;
  }

  return {
    description: descriptions.join('\n\n'),
    nextSteps: nextStepsList.join('\n\n'),
  };
}

/**
 * Get tags from the provided array that have a valid cache
 * @param {string[]} tags - Array of area/project tag strings
 * @returns {string[]} Tags that have valid cached data
 */
export function getTagsWithValidCache(tags) {
  return tags.filter((tag) => isCacheValid(tag));
}

/**
 * Get tags from the provided array that are missing from cache
 * @param {string[]} tags - Array of area/project tag strings
 * @returns {string[]} Tags that need to be cached
 */
export function getTagsMissingCache(tags) {
  return tags.filter((tag) => !isCacheValid(tag));
}

/**
 * Remove all expired cache entries from localStorage
 */
export function clearExpiredCache() {
  try {
    const keysToRemove = [];
    const len = localStorage.length;
    Array.from({ length: len }).forEach((_, i) => {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        try {
          const entry = JSON.parse(raw);
          if (!entry || !entry.timestamp || (Date.now() - entry.timestamp >= CACHE_TTL)) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    });
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Failed to clear expired dashboard cache:', err);
  }
}

/**
 * Check if any area/project tags exist in a tags array
 * @param {string[]} tags - Array of tag strings
 * @returns {string[]} Filtered array of area/project tags only
 */
export function filterAreaProjectTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter(
    (t) => t && (t.startsWith('area:') || t.startsWith('project:')),
  );
}
