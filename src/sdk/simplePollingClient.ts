/**
 * Simple Polling Client - Guaranteed to work
 * Minimal implementation that focuses on reliability
 */

import { Order } from '../types';

export interface SimplePollingClientConfig {
  baseUrl: string;
  endpoint: string;
  interval: number;
  authToken?: string;
}

export interface SimplePollingClientCallbacks {
  onData?: (orders: Order[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export class SimplePollingClient {
  private config: SimplePollingClientConfig;
  private callbacks: SimplePollingClientCallbacks = {};
  private pollingTimer: NodeJS.Timeout | null = null;
  private connected: boolean = false;
  
  constructor(config: SimplePollingClientConfig) {
    this.config = config;
    
    // Ensure methods are properly bound
    this.isConnected = this.isConnected.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.setCallbacks = this.setCallbacks.bind(this);
  }
  
  setCallbacks(callbacks: SimplePollingClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  start(): void {
    console.log('[SimplePollingClient] Starting with interval:', this.config.interval);
    
    if (this.pollingTimer) {
      this.stop();
    }
    
    this.pollingTimer = setInterval(() => {
      this.poll();
    }, this.config.interval);
    
    // Initial poll
    this.poll();
  }
  
  stop(): void {
    console.log('[SimplePollingClient] Stopping');
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    if (this.connected) {
      this.connected = false;
      this.callbacks.onConnectionChange?.(false);
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  private async poll(): Promise<void> {
    try {
      console.log('[SimplePollingClient] Polling...');
      
      const orders = await this.fetchOrders();
      
      if (!this.connected) {
        this.connected = true;
        this.callbacks.onConnectionChange?.(true);
      }
      
      if (orders && orders.length > 0) {
        console.log(`[SimplePollingClient] Got ${orders.length} orders`);
        this.callbacks.onData?.(orders);
      }
      
    } catch (error) {
      console.error('[SimplePollingClient] Poll error:', error);
      this.callbacks.onError?.(`Poll error: ${error}`);
      
      if (this.connected) {
        this.connected = false;
        this.callbacks.onConnectionChange?.(false);
      }
    }
  }
  
  private async fetchOrders(): Promise<Order[]> {
    // Import config dynamically to avoid issues
    const { API_CONFIG } = await import('../constants');
    
    const url = this.buildUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Host': API_CONFIG.HOST
    };
    
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    
    console.log(`[SimplePollingClient] Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
  
  private buildUrl(): string {
    let url = this.config.baseUrl;
    if (!url.endsWith('/')) {
      url += '/';
    }
    
    let endpoint = this.config.endpoint;
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
    }
    
    return url + endpoint;
  }
  
  updateAuthToken(token: string): void {
    this.config.authToken = token;
  }
  
  forcePoll(): void {
    this.poll();
  }
}