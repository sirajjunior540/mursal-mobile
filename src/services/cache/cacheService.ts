/**
 * Cache Service with TTL Support for Driver App
 *
 * Industry-standard caching for mobile apps:
 * - Stale-while-revalidate pattern
 * - TTL (Time To Live) support
 * - In-memory + persistent storage
 * - Cache invalidation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache entry with metadata
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

// Cache options
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  forceRefresh?: boolean; // Force fetch from server
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh (default: true)
}

// Default TTL values (in milliseconds)
export const CacheTTL = {
  SHORT: 30 * 1000, // 30 seconds - real-time data (active orders)
  MEDIUM: 2 * 60 * 1000, // 2 minutes - moderately changing data
  LONG: 15 * 60 * 1000, // 15 minutes - profile, earnings
  VERY_LONG: 60 * 60 * 1000, // 1 hour - settings, static data
};

// Cache keys enum for type safety
export const CacheKeys = {
  DRIVER_PROFILE: 'cache_driver_profile',
  DRIVER_BALANCE: 'cache_driver_balance',
  ACTIVE_ORDERS: 'cache_active_orders',
  AVAILABLE_ORDERS: 'cache_available_orders',
  ORDER_HISTORY: 'cache_order_history',
  EARNINGS_TODAY: 'cache_earnings_today',
  EARNINGS_WEEKLY: 'cache_earnings_weekly',
  NOTIFICATIONS: 'cache_notifications',
  VEHICLE_INFO: 'cache_vehicle_info',
  SETTINGS: 'cache_settings',
} as const;

class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * Fetch data with caching (stale-while-revalidate pattern)
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = CacheTTL.MEDIUM,
      forceRefresh = false,
      staleWhileRevalidate = true,
    } = options;

    const cached = await this.get<T>(key);
    const isStale = cached ? this.isStale(key) : true;

    if (forceRefresh || !cached) {
      return this.fetchAndCache(key, fetcher, ttl);
    }

    if (!isStale) {
      return cached;
    }

    if (staleWhileRevalidate && cached) {
      this.fetchAndCache(key, fetcher, ttl).catch((error) => {
        console.warn(`[Cache] Background refresh failed for ${key}:`, error);
      });
      return cached;
    }

    return this.fetchAndCache(key, fetcher, ttl);
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const request = (async () => {
      try {
        const data = await fetcher();
        await this.set(key, data, ttl);
        return data;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, request);
    return request;
  }

  async get<T>(key: string): Promise<T | null> {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      return memEntry.data as T;
    }

    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        this.memoryCache.set(key, entry);
        return entry.data;
      }
    } catch (error) {
      console.warn(`[Cache] Error reading ${key}:`, error);
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.memoryCache.set(key, entry);

    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`[Cache] Error writing ${key}:`, error);
    }
  }

  isStale(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Cache] Error removing ${key}:`, error);
    }
  }

  async invalidateMany(keys: string[]): Promise<void> {
    keys.forEach((key) => this.memoryCache.delete(key));
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.warn('[Cache] Error removing multiple keys:', error);
    }
  }

  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith('cache_'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('[Cache] Error clearing all:', error);
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;