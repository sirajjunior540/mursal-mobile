/**
 * Comprehensive Cache Service
 * Provides intelligent caching for all data types to prevent UI flickering
 */

import { Order } from '../types';
import { Storage } from '../utils';

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  invalidateOn?: string[]; // Events that invalidate this cache
  keyPrefix: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
  version: number;
}

class ComprehensiveCacheService {
  private static instance: ComprehensiveCacheService;
  private static CACHE_VERSION = 1;
  
  // Cache configurations for different data types
  private configs: Record<string, CacheConfig> = {
    availableOrders: {
      ttl: 30 * 1000, // 30 seconds - short TTL for real-time data
      invalidateOn: ['orderAccepted', 'orderDeclined', 'driverStatusChanged', 'batchAccepted'],
      keyPrefix: 'cache_available_orders'
    },
    driverOrders: {
      ttl: 60 * 1000, // 60 seconds
      invalidateOn: ['orderAccepted', 'orderStatusChanged', 'routeUpdated', 'batchAccepted'],
      keyPrefix: 'cache_driver_orders'
    },
    orderHistory: {
      ttl: 5 * 60 * 1000, // 5 minutes - longer TTL for historical data
      invalidateOn: ['orderCompleted'],
      keyPrefix: 'cache_order_history'
    },
    driverBalance: {
      ttl: 2 * 60 * 1000, // 2 minutes
      invalidateOn: ['orderCompleted', 'earningsUpdated'],
      keyPrefix: 'cache_driver_balance'
    },
    performanceMetrics: {
      ttl: 10 * 60 * 1000, // 10 minutes
      invalidateOn: ['orderCompleted'],
      keyPrefix: 'cache_performance'
    }
  };

  private invalidationListeners: Map<string, Set<() => void>> = new Map();

  static getInstance(): ComprehensiveCacheService {
    if (!ComprehensiveCacheService.instance) {
      ComprehensiveCacheService.instance = new ComprehensiveCacheService();
    }
    return ComprehensiveCacheService.instance;
  }

  /**
   * Get cached data with smart invalidation
   */
  async get<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const config = this.configs[cacheKey];
    if (!config) {
      console.warn(`[Cache] No config found for ${cacheKey}, fetching directly`);
      return fetcher();
    }

    const storageKey = `${config.keyPrefix}_v${ComprehensiveCacheService.CACHE_VERSION}`;

    // If force refresh, skip cache
    if (forceRefresh) {
      console.log(`[Cache] Force refresh for ${cacheKey}`);
      return this.fetchAndCache(storageKey, fetcher, config);
    }

    try {
      // Try to get from cache
      const cached = await Storage.getItem<CacheEntry<T>>(storageKey);
      
      if (cached && this.isValid(cached, config)) {
        console.log(`[Cache] Hit for ${cacheKey} (age: ${Math.floor((Date.now() - cached.timestamp) / 1000)}s)`);
        return cached.data;
      }

      console.log(`[Cache] Miss for ${cacheKey}, fetching...`);
      return this.fetchAndCache(storageKey, fetcher, config);
    } catch (error) {
      console.error(`[Cache] Error reading ${cacheKey}:`, error);
      return fetcher();
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(cacheKey: string, data: T): Promise<void> {
    const config = this.configs[cacheKey];
    if (!config) return;

    const storageKey = `${config.keyPrefix}_v${ComprehensiveCacheService.CACHE_VERSION}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hash: this.generateHash(data),
      version: ComprehensiveCacheService.CACHE_VERSION
    };

    await Storage.setItem(storageKey, entry);
    console.log(`[Cache] Set ${cacheKey}`);
  }

  /**
   * Invalidate specific cache
   */
  async invalidate(cacheKey: string): Promise<void> {
    const config = this.configs[cacheKey];
    if (!config) return;

    const storageKey = `${config.keyPrefix}_v${ComprehensiveCacheService.CACHE_VERSION}`;
    await Storage.removeItem(storageKey);
    console.log(`[Cache] Invalidated ${cacheKey}`);

    // Notify listeners
    this.notifyInvalidation(cacheKey);
  }

  /**
   * Invalidate caches based on event
   */
  async invalidateByEvent(event: string): Promise<void> {
    console.log(`[Cache] Invalidating caches for event: ${event}`);
    
    const promises = Object.entries(this.configs)
      .filter(([_, config]) => config.invalidateOn?.includes(event))
      .map(([cacheKey]) => this.invalidate(cacheKey));

    await Promise.all(promises);
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    console.log('[Cache] Clearing all caches');
    
    const promises = Object.keys(this.configs)
      .map(cacheKey => this.invalidate(cacheKey));

    await Promise.all(promises);
  }

  /**
   * Subscribe to cache invalidation events
   */
  onInvalidation(cacheKey: string, callback: () => void): () => void {
    if (!this.invalidationListeners.has(cacheKey)) {
      this.invalidationListeners.set(cacheKey, new Set());
    }
    
    this.invalidationListeners.get(cacheKey)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.invalidationListeners.get(cacheKey)?.delete(callback);
    };
  }

  /**
   * Check if cached data has changed
   */
  async hasChanged<T>(cacheKey: string, newData: T): Promise<boolean> {
    const config = this.configs[cacheKey];
    if (!config) return true;

    const storageKey = `${config.keyPrefix}_v${ComprehensiveCacheService.CACHE_VERSION}`;
    const cached = await Storage.getItem<CacheEntry<T>>(storageKey);
    
    if (!cached) return true;
    
    const newHash = this.generateHash(newData);
    return cached.hash !== newHash;
  }

  private async fetchAndCache<T>(
    storageKey: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    const data = await fetcher();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hash: this.generateHash(data),
      version: ComprehensiveCacheService.CACHE_VERSION
    };

    await Storage.setItem(storageKey, entry);
    return data;
  }

  private isValid<T>(entry: CacheEntry<T>, config: CacheConfig): boolean {
    // Check version
    if (entry.version !== ComprehensiveCacheService.CACHE_VERSION) {
      return false;
    }

    // Check TTL
    const age = Date.now() - entry.timestamp;
    return age < config.ttl;
  }

  private generateHash(data: any): string {
    // Simple hash based on JSON string
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private notifyInvalidation(cacheKey: string): void {
    const listeners = this.invalidationListeners.get(cacheKey);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  }
}

export const cacheService = ComprehensiveCacheService.getInstance();

// Export specific cache getters for convenience
export const getCachedAvailableOrders = (fetcher: () => Promise<Order[]>, forceRefresh = false) =>
  cacheService.get('availableOrders', fetcher, forceRefresh);

export const getCachedDriverOrders = (fetcher: () => Promise<Order[]>, forceRefresh = false) =>
  cacheService.get('driverOrders', fetcher, forceRefresh);

export const getCachedOrderHistory = (fetcher: () => Promise<Order[]>, forceRefresh = false) =>
  cacheService.get('orderHistory', fetcher, forceRefresh);

export const getCachedDriverBalance = <T>(fetcher: () => Promise<T>, forceRefresh = false) =>
  cacheService.get('driverBalance', fetcher, forceRefresh);

export const getCachedPerformanceMetrics = <T>(fetcher: () => Promise<T>, forceRefresh = false) =>
  cacheService.get('performanceMetrics', fetcher, forceRefresh);