import { Order } from '../types';
import { apiService } from './api';
import { Storage, SecureStorage } from '../utils';

export type RealtimeMode = 'polling' | 'websocket';

export interface RealtimeConfig {
  mode: RealtimeMode;
  pollingInterval: number; // in milliseconds
  enabled: boolean;
}

export interface RealtimeCallbacks {
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (order: Order) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

class RealtimeService {
  private config: RealtimeConfig = {
    mode: 'polling',
    pollingInterval: 5000, // 5 seconds
    enabled: false,
  };

  private callbacks: RealtimeCallbacks = {};
  private pollingTimer: NodeJS.Timeout | null = null;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private lastPollTime: number = 0;

  /**
   * Initialize the realtime service
   */
  async initialize(): Promise<void> {
    // Load saved configuration
    const savedConfig = await Storage.getItem<RealtimeConfig>('realtime_config');
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }
  }

  /**
   * Set configuration
   */
  async setConfig(config: Partial<RealtimeConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await Storage.setItem('realtime_config', this.config);
    
    // Restart service with new config if currently running
    if (this.config.enabled) {
      this.stop();
      this.start();
    }
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start realtime service
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.stop(); // Stop any existing service

    if (this.config.mode === 'polling') {
      this.startPolling();
    } else if (this.config.mode === 'websocket') {
      this.startWebSocket();
    }
  }

  /**
   * Stop realtime service
   */
  stop(): void {
    this.stopPolling();
    this.stopWebSocket();
    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
  }

  /**
   * Start polling for new orders
   */
  private startPolling(): void {
    console.log('Starting order polling with interval:', this.config.pollingInterval);
    
    this.pollingTimer = setInterval(async () => {
      try {
        await this.pollForNewOrders();
        if (!this.isConnected) {
          this.isConnected = true;
          this.callbacks.onConnectionChange?.(true);
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.callbacks.onError?.(`Polling failed: ${error}`);
        if (this.isConnected) {
          this.isConnected = false;
          this.callbacks.onConnectionChange?.(false);
        }
      }
    }, this.config.pollingInterval);

    // Initial poll
    this.pollForNewOrders().catch(error => {
      console.error('Initial poll error:', error);
      this.callbacks.onError?.(`Initial poll failed: ${error}`);
    });
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Poll for new orders
   */
  private async pollForNewOrders(): Promise<void> {
    try {
      const response = await apiService.pollNewOrders();
      
      if (response.success && response.data) {
        const newOrders = response.data;
        
        // Call callback for each new order
        newOrders.forEach(order => {
          this.callbacks.onNewOrder?.(order);
        });
      }
    } catch (error) {
      console.error('Error polling for new orders:', error);
      throw error;
    }
  }

  /**
   * Start WebSocket connection
   */
  private startWebSocket(): void {
    const wsUrl = this.getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.callbacks.onConnectionChange?.(true);
        
        // Send authentication
        this.sendWebSocketAuth();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.callbacks.onConnectionChange?.(false);
        
        // Attempt to reconnect after 5 seconds
        if (this.config.enabled && this.config.mode === 'websocket') {
          setTimeout(() => {
            if (this.config.enabled && this.config.mode === 'websocket') {
              this.startWebSocket();
            }
          }, 5000);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.('WebSocket connection error');
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.callbacks.onError?.(`WebSocket creation failed: ${error}`);
    }
  }

  /**
   * Stop WebSocket connection
   */
  private stopWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    // Convert HTTP URL to WebSocket URL (same port for Daphne)
    const baseUrl = apiService.getBaseUrl();
    const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/ws/driver/orders/`;
  }

  /**
   * Send WebSocket authentication
   */
  private async sendWebSocketAuth(): Promise<void> {
    if (!this.websocket) return;

    try {
      const token = await SecureStorage.getAuthToken();
      if (token && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'authenticate',
          token: token
        }));
      }
    } catch (error) {
      console.error('Error sending WebSocket auth:', error);
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'new_order':
        if (data.order) {
          this.callbacks.onNewOrder?.(data.order);
        }
        break;
        
      case 'order_update':
        if (data.order) {
          this.callbacks.onOrderUpdate?.(data.order);
        }
        break;
        
      case 'auth_success':
        console.log('WebSocket authentication successful');
        break;
        
      case 'auth_error':
        console.error('WebSocket authentication failed:', data.message);
        this.callbacks.onError?.('Authentication failed');
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        this.callbacks.onError?.(data.message);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RealtimeConfig {
    return { ...this.config };
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.config.enabled && (
      (this.config.mode === 'polling' && this.pollingTimer !== null) ||
      (this.config.mode === 'websocket' && this.websocket !== null)
    );
  }

  /**
   * Check connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Toggle service on/off
   */
  async toggle(): Promise<void> {
    await this.setConfig({ enabled: !this.config.enabled });
  }

  /**
   * Switch between polling and WebSocket
   */
  async switchMode(mode: RealtimeMode): Promise<void> {
    await this.setConfig({ mode });
  }
}

export const realtimeService = new RealtimeService();