/**
 * Smart Order Cache Service
 * Caches order data intelligently based on status changes and other triggers
 */

import { Order } from '../types';
import { Storage } from '../utils';

interface CacheEntry {
  data: Order[];
  timestamp: number;
  hash: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface CacheInvalidationRules {
  statusChange: boolean;
  newOrderAccepted: boolean;
  orderDeclined: boolean;
  timeExpired: boolean;
  locationChanged: boolean;
}

export class SmartOrderCache {
  private static CACHE_KEY = 'smart_order_cache';
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL
  private static LOCATION_THRESHOLD = 100; // 100 meters

  /**
   * Store orders in cache with smart invalidation metadata
   */
  static async cacheOrders(
    orders: Order[],
    driverLocation?: { latitude: number; longitude: number }
  ): Promise<void> {
    const hash = this.generateOrdersHash(orders);
    const cacheEntry: CacheEntry = {
      data: orders,
      timestamp: Date.now(),
      hash,
      driverLocation
    };

    await Storage.setItem(this.CACHE_KEY, cacheEntry);
    console.log(`[SmartCache] Cached ${orders.length} orders with hash: ${hash}`);
  }

  /**
   * Get cached orders if still valid
   */
  static async getCachedOrders(): Promise<Order[] | null> {
    try {
      const cacheEntry = await Storage.getItem<CacheEntry>(this.CACHE_KEY);
      if (!cacheEntry) {
        console.log('[SmartCache] No cached data found');
        return null;
      }

      // Check if cache is still valid
      const invalidationReasons = await this.checkCacheValidity(cacheEntry);
      
      if (this.isCacheInvalid(invalidationReasons)) {
        console.log('[SmartCache] Cache invalidated due to:', 
          Object.entries(invalidationReasons)
            .filter(([_, value]) => value)
            .map(([key]) => key)
            .join(', ')
        );
        await this.clearCache();
        return null;
      }

      const age = Date.now() - cacheEntry.timestamp;
      console.log(`[SmartCache] Returning ${cacheEntry.data.length} cached orders (age: ${Math.floor(age / 1000)}s)`);
      return cacheEntry.data;
    } catch (error) {
      console.error('[SmartCache] Error reading cache:', error);
      return null;
    }
  }

  /**
   * Invalidate cache when order status changes
   */
  static async invalidateOnStatusChange(orderId: string, newStatus: string): Promise<void> {
    console.log(`[SmartCache] Invalidating cache due to status change: ${orderId} -> ${newStatus}`);
    await this.clearCache();
  }

  /**
   * Invalidate cache when new order is accepted
   */
  static async invalidateOnOrderAccepted(orderId: string): Promise<void> {
    console.log(`[SmartCache] Invalidating cache due to order accepted: ${orderId}`);
    await this.clearCache();
  }

  /**
   * Invalidate cache when order is declined
   */
  static async invalidateOnOrderDeclined(orderId: string): Promise<void> {
    console.log(`[SmartCache] Invalidating cache due to order declined: ${orderId}`);
    await this.clearCache();
  }

  /**
   * Check if driver location has changed significantly
   */
  static async hasLocationChangedSignificantly(
    currentLocation: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const cacheEntry = await Storage.getItem<CacheEntry>(this.CACHE_KEY);
    if (!cacheEntry || !cacheEntry.driverLocation) {
      return false;
    }

    const distance = this.calculateDistance(
      cacheEntry.driverLocation,
      currentLocation
    );

    return distance > this.LOCATION_THRESHOLD;
  }

  /**
   * Clear the cache
   */
  static async clearCache(): Promise<void> {
    await Storage.removeItem(this.CACHE_KEY);
    console.log('[SmartCache] Cache cleared');
  }

  /**
   * Generate a hash of orders to detect changes
   */
  private static generateOrdersHash(orders: Order[]): string {
    // Create a simple hash based on order IDs and statuses
    const hashData = orders
      .map(order => `${order.id}:${order.status}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  /**
   * Check cache validity based on various rules
   */
  private static async checkCacheValidity(cacheEntry: CacheEntry): Promise<CacheInvalidationRules> {
    const now = Date.now();
    const age = now - cacheEntry.timestamp;

    return {
      statusChange: false, // This is checked externally
      newOrderAccepted: false, // This is checked externally
      orderDeclined: false, // This is checked externally
      timeExpired: age > this.DEFAULT_TTL,
      locationChanged: false // This is checked when location is provided
    };
  }

  /**
   * Check if cache should be invalidated based on rules
   */
  private static isCacheInvalid(rules: CacheInvalidationRules): boolean {
    return Object.values(rules).some(rule => rule);
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  private static calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(): Promise<{
    hasCache: boolean;
    orderCount: number;
    ageSeconds: number;
    hash: string;
    location?: { latitude: number; longitude: number };
  } | null> {
    const cacheEntry = await Storage.getItem<CacheEntry>(this.CACHE_KEY);
    if (!cacheEntry) {
      return null;
    }

    return {
      hasCache: true,
      orderCount: cacheEntry.data.length,
      ageSeconds: Math.floor((Date.now() - cacheEntry.timestamp) / 1000),
      hash: cacheEntry.hash,
      location: cacheEntry.driverLocation
    };
  }
}