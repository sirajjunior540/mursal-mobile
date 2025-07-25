/**
 * Request Deduplication Service
 * Prevents duplicate API requests within a short time window
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicationService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private deduplicationWindow = 2000; // 2 seconds
  private cacheWindow = 5000; // 5 seconds cache

  /**
   * Generate a unique key for the request
   */
  private generateKey(url: string, method: string = 'GET', body?: any): string {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Check if we have a recent cached response
   */
  private getCachedResponse(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheWindow) {
      if (__DEV__) {
        console.log(`[Deduplication] Returning cached response for ${key}`);
      }
      return cached.data;
    }
    return null;
  }

  /**
   * Execute a request with deduplication
   */
  async executeRequest<T>(
    url: string,
    requestFn: () => Promise<T>,
    method: string = 'GET',
    body?: any,
    useCache: boolean = true
  ): Promise<T> {
    const key = this.generateKey(url, method, body);
    const now = Date.now();

    // Check cache first (only for GET requests)
    if (method === 'GET' && useCache) {
      const cached = this.getCachedResponse(key);
      if (cached) {
        return cached;
      }
    }

    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending && (now - pending.timestamp) < this.deduplicationWindow) {
      if (__DEV__) {
        console.log(`[Deduplication] Deduplicating request to ${url}`);
      }
      return pending.promise;
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Cache successful GET responses
        if (method === 'GET' && useCache) {
          this.requestCache.set(key, {
            data: result,
            timestamp: now
          });
        }
        // Clean up pending request
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store as pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    return promise;
  }

  /**
   * Clear cache for specific pattern
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear entries matching pattern
      const keys = Array.from(this.requestCache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.requestCache.delete(key);
        }
      });
    } else {
      // Clear all cache
      this.requestCache.clear();
    }
  }

  /**
   * Clean up old entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up old pending requests
    this.pendingRequests.forEach((request, key) => {
      if (now - request.timestamp > this.deduplicationWindow * 2) {
        this.pendingRequests.delete(key);
      }
    });

    // Clean up old cache entries
    this.requestCache.forEach((cache, key) => {
      if (now - cache.timestamp > this.cacheWindow * 2) {
        this.requestCache.delete(key);
      }
    });
  }
}

// Create singleton instance
export const requestDeduplication = new RequestDeduplicationService();

// Set up periodic cleanup
setInterval(() => {
  requestDeduplication.cleanup();
}, 60000); // Clean up every minute