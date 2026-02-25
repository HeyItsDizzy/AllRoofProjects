/**
 * Request Cache Utility
 * Prevents duplicate API calls by caching responses and deduplicating in-flight requests
 */

class RequestCache {
  constructor() {
    this.cache = new Map(); // url -> { data, timestamp }
    this.pendingRequests = new Map(); // url -> Promise
    this.defaultTTL = 5000; // 5 seconds cache TTL
  }

  /**
   * Get cache key from axios config
   */
  getCacheKey(config) {
    const { method, url, params } = config;
    if (method?.toLowerCase() !== 'get') return null;
    
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}${paramString}`;
  }

  /**
   * Check if cached response is still valid
   */
  isValid(cacheKey, ttl = this.defaultTTL) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < ttl;
  }

  /**
   * Get cached response if valid
   */
  get(cacheKey, ttl) {
    if (this.isValid(cacheKey, ttl)) {
      const cached = this.cache.get(cacheKey);
      console.log(`🎯 Cache HIT: ${cacheKey.substring(0, 50)}...`);
      return cached.data;
    }
    return null;
  }

  /**
   * Store response in cache
   */
  set(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get or create a pending request promise
   * This deduplicates simultaneous identical requests
   */
  getPendingRequest(cacheKey) {
    return this.pendingRequests.get(cacheKey);
  }

  /**
   * Store a pending request promise
   */
  setPendingRequest(cacheKey, promise) {
    this.pendingRequests.set(cacheKey, promise);
    
    // Clean up after promise resolves/rejects
    promise.finally(() => {
      this.pendingRequests.delete(cacheKey);
    });
  }

  /**
   * Clear specific cache entry
   */
  invalidate(cacheKey) {
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear expired entries (optional cleanup)
   */
  cleanup(ttl = this.defaultTTL) {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
const requestCache = new RequestCache();

// Auto cleanup every minute
setInterval(() => {
  requestCache.cleanup();
}, 60000);

export default requestCache;
