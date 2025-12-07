/**
 * Polling Client for Mursal Realtime SDK
 * Handles HTTP polling for orders
 */

import { Order } from '../types';

export interface PollingClientConfig {
  baseUrl: string;
  endpoint: string;
  interval: number;
  authToken?: string;
}

export interface PollingClientCallbacks {
  onData?: (orders: Order[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export class PollingClient {
  private config: PollingClientConfig;
  private callbacks: PollingClientCallbacks = {};
  private pollingTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastPollTime: number = 0;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;
  private isPollInProgress: boolean = false;
  private lastPollData: Order[] | null = null;
  private lastPollDataTime: number = 0;
  private pollDataCacheDuration: number = 10000; // Cache poll results for 10 seconds

  /**
   * Constructor
   * @param config Polling client configuration
   */
  constructor(config: PollingClientConfig) {
    this.config = config;
  }

  /**
   * Set callbacks
   * @param callbacks Polling client callbacks
   */
  setCallbacks(callbacks: PollingClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.pollingTimer) {
      this.stop();
    }

    console.log(`[PollingClient] Starting polling with interval: ${this.config.interval}ms`);

    // Start polling timer
    this.pollingTimer = setInterval(() => {
      this.poll();
    }, this.config.interval);

    // Initial poll
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.callbacks.onConnectionChange?.(false);
    }

    console.log('[PollingClient] Polling stopped');
  }

  /**
   * Poll for orders
   */
  private async poll(): Promise<void> {
    // Prevent concurrent polls
    if (this.isPollInProgress) {
      if (__DEV__) {
        console.log('[PollingClient] Poll already in progress, skipping');
      }
      return;
    }

    // Check if we have recent cached data
    const now = Date.now();
    if (this.lastPollData && (now - this.lastPollDataTime) < this.pollDataCacheDuration) {
      if (__DEV__) {
        console.log('[PollingClient] Using cached data from', Math.floor((now - this.lastPollDataTime) / 1000), 'seconds ago');
      }
      this.callbacks.onData?.(this.lastPollData);
      return;
    }

    this.isPollInProgress = true;
    
    try {
      // Only log in development
      if (__DEV__) {
        console.log('[PollingClient] Polling for orders...');
      }
      this.lastPollTime = now;

      const orders = await this.fetchOrders();

      // Reset consecutive errors on success
      this.consecutiveErrors = 0;

      // Update connection status if needed
      if (!this.isConnected) {
        this.isConnected = true;
        this.callbacks.onConnectionChange?.(true);
      }

      // Cache the poll data
      this.lastPollData = orders;
      this.lastPollDataTime = now;

      // Notify callback with orders
      if (orders && orders.length > 0) {
        if (__DEV__) {
          console.log(`[PollingClient] Received ${orders.length} orders`);
        }
        this.callbacks.onData?.(orders);
      }
    } catch (error) {
      this.consecutiveErrors++;
      
      // Only log errors in development or if it's a critical error
      if (__DEV__ || this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(`[PollingClient] Polling error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
      }

      // Notify error callback
      this.callbacks.onError?.(`Polling error: ${error}`);

      // Update connection status if too many consecutive errors
      if (this.isConnected && this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.isConnected = false;
        this.callbacks.onConnectionChange?.(false);
      }
    } finally {
      this.isPollInProgress = false;
    }
  }

  /**
   * Fetch orders from API
   */
  private async fetchOrders(): Promise<Order[]> {
    const url = this.getApiUrl();

    // Import API_CONFIG dynamically to avoid circular dependencies
    const { API_CONFIG } = await import('../constants');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Host': API_CONFIG.HOST, // ✅ Fixed: Add tenant host header
    };

    // Add authorization header if token is available
    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }

    if (__DEV__) {
      console.log(`[PollingClient] Fetching from: ${url} with Host: ${API_CONFIG.HOST}`);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[PollingClient] API error: ${response.status} ${response.statusText}`);
      console.error(`[PollingClient] Response: ${await response.text()}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle wrapped response format from delivery-service
    // API returns: { count: N, results: [...] } or { orders: [...], total_count: N, ... }
    let orders: any[];
    if (Array.isArray(data)) {
      orders = data;
    } else if (data.results && Array.isArray(data.results)) {
      orders = data.results;
    } else if (data.orders && Array.isArray(data.orders)) {
      orders = data.orders;
    } else {
      if (__DEV__) {
        console.log('[PollingClient] Unexpected response format:', JSON.stringify(data).slice(0, 500));
      }
      return [];
    }

    // Transform API response format to match Order type expected by the app
    // API returns nested format, app expects flat format
    const transformedOrders: Order[] = orders.map((order: any) => {
      // Extract nested pickup/dropoff to flat format
      const pickupAddress = order.pickup?.address || order.pickup_address || '';
      const pickupLatitude = order.pickup?.lat || order.pickup_latitude;
      const pickupLongitude = order.pickup?.lng || order.pickup_longitude;

      const dropoffAddress = order.dropoff?.address || order.dropoff_address || order.delivery_address || '';
      const dropoffLatitude = order.dropoff?.lat || order.dropoff_latitude || order.delivery_latitude;
      const dropoffLongitude = order.dropoff?.lng || order.dropoff_longitude || order.delivery_longitude;

      // Extract customer info (can be nested or flat)
      const customerName = order.customer?.name || order.customer_name || 'Customer';
      const customerPhone = order.customer?.phone || order.customer_phone || '';

      // Extract amounts
      const total = order.total_amount || order.total || 0;
      const deliveryFee = order.delivery_fee || 0;

      // Calculate distance in meters for the app
      const distanceKm = order.distance_km || order.distance || 0;
      const distanceMeters = typeof distanceKm === 'number' && distanceKm < 1000
        ? distanceKm * 1000 // Convert km to meters
        : distanceKm; // Already in meters or large number

      const transformed: Order = {
        id: order.id,
        order_number: order.order_number,
        status: order.status,

        // Flat pickup fields
        pickup_address: pickupAddress,
        pickup_latitude: pickupLatitude,
        pickup_longitude: pickupLongitude,

        // Flat delivery fields (app uses both dropoff_ and delivery_ prefixes)
        dropoff_address: dropoffAddress,
        delivery_address: dropoffAddress,
        dropoff_latitude: dropoffLatitude,
        delivery_latitude: dropoffLatitude,
        dropoff_longitude: dropoffLongitude,
        delivery_longitude: dropoffLongitude,

        // Customer info in multiple formats for compatibility
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        customer_name: customerName,
        customer_phone: customerPhone,

        // Amounts
        total: total,
        total_amount: total,
        delivery_fee: deliveryFee,

        // Distance and time
        distance: distanceMeters,
        distance_km: distanceKm,
        estimated_delivery_time: order.estimated_duration_minutes
          ? `${order.estimated_duration_minutes} min`
          : order.estimated_delivery_time || '15 min',
        estimated_duration_minutes: order.estimated_duration_minutes,

        // Timestamps
        created_at: order.created_at ? new Date(order.created_at) : new Date(),

        // Pass through any other fields
        ...order,

        // Ensure transformed fields take precedence
        pickup_address: pickupAddress,
        delivery_address: dropoffAddress,
        customer_name: customerName,
        total: total,
      };

      if (__DEV__) {
        console.log('[PollingClient] Transformed order:', order.order_number, {
          pickup_address: transformed.pickup_address,
          delivery_address: transformed.delivery_address,
          customer_name: transformed.customer_name,
          total: transformed.total,
        });
      }

      return transformed;
    });

    return transformedOrders;
  }

  /**
   * Get API URL
   */
  private getApiUrl(): string {
    let apiUrl = this.config.baseUrl;

    // Ensure URL ends with a slash before appending endpoint
    if (!apiUrl.endsWith('/')) {
      apiUrl += '/';
    }

    // Remove leading slash from endpoint if present
    const endpoint = this.config.endpoint.startsWith('/') 
      ? this.config.endpoint.substring(1) 
      : this.config.endpoint;

    return `${apiUrl}${endpoint}`;
  }

  /**
   * Check if client is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get time since last poll
   */
  getTimeSinceLastPoll(): number {
    if (this.lastPollTime === 0) {
      return -1;
    }

    return Date.now() - this.lastPollTime;
  }

  /**
   * Update authentication token
   * @param token New authentication token
   */
  updateAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Update polling interval
   * @param interval New polling interval in milliseconds
   */
  updateInterval(interval: number): void {
    // Enforce minimum interval to prevent excessive polling
    const minInterval = 30000; // 30 seconds minimum
    const safeInterval = Math.max(interval, minInterval);
    
    if (safeInterval === this.config.interval) {
      return;
    }

    this.config.interval = safeInterval;
    
    if (__DEV__ && interval < minInterval) {
      console.log(`[PollingClient] Interval ${interval}ms too low, using minimum ${minInterval}ms`);
    }

    // Restart polling with new interval if currently running
    if (this.pollingTimer) {
      this.stop();
      this.start();
    }
  }

  /**
   * Force immediate poll
   */
  forcePoll(): void {
    this.poll();
  }
}
