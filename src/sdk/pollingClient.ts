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
    try {
      console.log('[PollingClient] Polling for orders...');
      this.lastPollTime = Date.now();

      const orders = await this.fetchOrders();

      // Reset consecutive errors on success
      this.consecutiveErrors = 0;

      // Update connection status if needed
      if (!this.isConnected) {
        this.isConnected = true;
        this.callbacks.onConnectionChange?.(true);
      }

      // Notify callback with orders
      if (orders && orders.length > 0) {
        console.log(`[PollingClient] Received ${orders.length} orders`);
        this.callbacks.onData?.(orders);
      } else {
        console.log('[PollingClient] No orders received');
      }
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`[PollingClient] Polling error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);

      // Notify error callback
      this.callbacks.onError?.(`Polling error: ${error}`);

      // Update connection status if too many consecutive errors
      if (this.isConnected && this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.isConnected = false;
        this.callbacks.onConnectionChange?.(false);
      }
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

    console.log(`[PollingClient] Fetching from: ${url} with Host: ${API_CONFIG.HOST}`);

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
    return data as Order[];
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
    if (interval === this.config.interval) {
      return;
    }

    this.config.interval = interval;

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
