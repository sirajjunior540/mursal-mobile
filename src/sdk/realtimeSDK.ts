/**
 * Mursal Realtime SDK
 * This SDK provides a unified interface for real-time communication
 * with the Mursal backend, supporting WebSocket, polling, and push notifications.
 */

import { AppState, AppStateStatus } from 'react-native';
import { Order } from '../types';
import { 
  RealtimeSDKConfig, 
  RealtimeSDKCallbacks, 
  CommunicationMode,
  ConnectionStatus,
  RealtimeMetrics,
  WebSocketMessage
} from './types';
import { WebSocketClient } from './websocketClient';
import { PollingClient } from './pollingClient';
import { PushNotificationClient } from './pushNotificationClient';

// Default configuration
const DEFAULT_CONFIG: Partial<RealtimeSDKConfig> = {
  enabledModes: ['polling', 'websocket'],
  primaryMode: 'websocket',
  pollingInterval: 10000,
  pollingEndpoint: '/api/v1/delivery/deliveries/available_orders/',
  // Go websocket-service endpoint - requires user_id and user_type query params
  // The actual URL will be built dynamically: /ws?user_id=<driver_id>&user_type=driver
  websocketEndpoint: '/ws',
  websocketReconnectInterval: 5000,
  websocketMaxReconnectAttempts: 5,
  pushEnabled: false,
  logLevel: 'info',
  enableMetrics: true,
  deduplicationEnabled: true,
  deduplicationWindow: 60000 // 1 minute
};

/**
 * Mursal Realtime SDK
 * Core class that manages communication with the backend
 */
export class RealtimeSDK {
  private config: RealtimeSDKConfig;
  private callbacks: RealtimeSDKCallbacks = {};
  private websocketClient: WebSocketClient | null = null;
  private pollingClient: PollingClient | null = null;
  private pushClient: PushNotificationClient | null = null;
  private isRunning: boolean = false;
  private seenOrderIds: Map<string, number> = new Map(); // Order ID -> timestamp
  private metrics: RealtimeMetrics;
  private appStateSubscription: any = null;
  private lastAppState: AppStateStatus = 'active';
  private backgroundTime: number = 0;
  
  /**
   * Constructor
   * @param config SDK configuration
   */
  constructor(config: Partial<RealtimeSDKConfig>) {
    // Merge provided config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config } as RealtimeSDKConfig;
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    
    // Log initialization
    this.log('debug', 'RealtimeSDK initialized with config:', this.config);
  }
  
  /**
   * Initialize metrics object
   */
  private initializeMetrics(): RealtimeMetrics {
    return {
      connectionAttempts: { polling: 0, websocket: 0, push: 0, all: 0 },
      connectionSuccesses: { polling: 0, websocket: 0, push: 0, all: 0 },
      connectionFailures: { polling: 0, websocket: 0, push: 0, all: 0 },
      messagesReceived: { polling: 0, websocket: 0, push: 0, all: 0 },
      messagesSent: { polling: 0, websocket: 0, push: 0, all: 0 },
      ordersReceived: 0,
      uniqueOrdersReceived: 0,
      duplicateOrdersFiltered: 0,
      averageLatency: { polling: 0, websocket: 0, push: 0, all: 0 },
      lastUpdated: new Date()
    };
  }
  
  /**
   * Set event callbacks
   * @param callbacks Event callbacks
   */
  setCallbacks(callbacks: RealtimeSDKCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  /**
   * Start the SDK
   */
  start(): void {
    if (this.isRunning) {
      this.log('warn', 'SDK is already running');
      return;
    }
    
    this.log('info', 'Starting RealtimeSDK');
    this.isRunning = true;
    
    // Initialize and start clients based on enabled modes
    if (this.config.enabledModes.includes('websocket') || this.config.enabledModes.includes('all')) {
      this.initializeWebSocketClient();
    }
    
    if (this.config.enabledModes.includes('polling') || this.config.enabledModes.includes('all')) {
      this.initializePollingClient();
    }
    
    if (this.config.pushEnabled && (this.config.enabledModes.includes('push') || this.config.enabledModes.includes('all'))) {
      this.initializePushClient();
    }
    
    // Set up app state listener for background/foreground transitions
    this.setupAppStateListener();
  }
  
  /**
   * Stop the SDK
   */
  stop(): void {
    if (!this.isRunning) {
      this.log('warn', 'SDK is not running');
      return;
    }
    
    this.log('info', 'Stopping RealtimeSDK');
    this.isRunning = false;
    
    // Stop all clients
    if (this.websocketClient) {
      this.websocketClient.stop();
      this.websocketClient = null;
    }
    
    if (this.pollingClient) {
      this.pollingClient.stop();
      this.pollingClient = null;
    }
    
    if (this.pushClient) {
      this.pushClient.stop();
      this.pushClient = null;
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
  
  /**
   * Initialize WebSocket client
   */
  private initializeWebSocketClient(): void {
    try {
      console.log('[RealtimeSDK] Initializing WebSocket client with config:', {
        baseUrl: this.config.baseUrl,
        endpoint: this.config.websocketEndpoint,
        hasAuthToken: !!this.config.authToken,
        tenantId: this.config.tenantId
      });
      
      this.websocketClient = new WebSocketClient({
        baseUrl: this.config.baseUrl,
        endpoint: this.config.websocketEndpoint,
        authToken: this.config.authToken,
        tenantId: this.config.tenantId,
        driverId: this.config.driverId,  // Pass driver ID for Go websocket-service
        reconnectInterval: this.config.websocketReconnectInterval,
        maxReconnectAttempts: this.config.websocketMaxReconnectAttempts
      });
      
      // Verify the client was created correctly
      if (!this.websocketClient) {
        console.error('[RealtimeSDK] WebSocket client creation failed - client is null/undefined');
        throw new Error('WebSocket client is null/undefined');
      }
      
      if (typeof this.websocketClient.isConnected !== 'function') {
        console.error('❌ WebSocketClient.isConnected is not a function:', this.websocketClient.isConnected);
        // Create a fallback isConnected method
        console.log('🔧 Creating fallback WebSocket isConnected method...');
        this.websocketClient.isConnected = () => false;
      }
      
      // Set up callbacks
      this.websocketClient.setCallbacks({
        onMessage: (message: WebSocketMessage) => this.handleWebSocketMessage(message),
        onConnectionChange: (connected: boolean) => {
          this.updateMetrics('connectionSuccesses', 'websocket', connected ? 1 : 0);
          this.callbacks.onConnectionChange?.(connected, 'websocket');
        },
        onError: (error: string) => {
          this.updateMetrics('connectionFailures', 'websocket', 1);
          this.callbacks.onError?.(error, 'websocket');
        }
      });
      
      // Start the client
      this.websocketClient.start();
      this.updateMetrics('connectionAttempts', 'websocket', 1);
      this.log('info', 'WebSocket client initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize WebSocket client:', error);
      this.websocketClient = null;
      this.callbacks.onError?.(`WebSocket initialization failed: ${error}`, 'websocket');
    }
  }
  
  /**
   * Initialize polling client
   */
  private initializePollingClient(): void {
    try {
      // Use apiBaseUrl for polling (defaults to baseUrl if not set)
      const pollingBaseUrl = this.config.apiBaseUrl || this.config.baseUrl;
      console.log('🔧 Creating PollingClient with config:', {
        baseUrl: pollingBaseUrl,
        endpoint: this.config.pollingEndpoint,
        interval: this.config.pollingInterval,
        hasAuthToken: !!this.config.authToken
      });

      // Create PollingClient
      this.pollingClient = new PollingClient({
        baseUrl: pollingBaseUrl,
        endpoint: this.config.pollingEndpoint,
        interval: this.config.pollingInterval,
        authToken: this.config.authToken
      });
      
      // Verify it works
      if (!this.pollingClient || typeof this.pollingClient.getConnectionStatus !== 'function') {
        throw new Error('PollingClient validation failed');
      }
      
      console.log('✅ PollingClient created successfully');
      
      // Set up callbacks
      this.pollingClient.setCallbacks({
        onData: (orders: Order[]) => this.handlePollingData(orders),
        onConnectionChange: (connected: boolean) => {
          this.updateMetrics('connectionSuccesses', 'polling', connected ? 1 : 0);
          this.callbacks.onConnectionChange?.(connected, 'polling');
        },
        onError: (error: string) => {
          this.updateMetrics('connectionFailures', 'polling', 1);
          this.callbacks.onError?.(error, 'polling');
        }
      });
      
      // Start the client
      this.pollingClient.start();
      this.updateMetrics('connectionAttempts', 'polling', 1);
      this.log('info', 'Polling client initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize polling client:', error);
      this.pollingClient = null;
      this.callbacks.onError?.(`Polling initialization failed: ${error}`, 'polling');
    }
  }
  
  /**
   * Initialize push notification client
   */
  private initializePushClient(): void {
    this.pushClient = new PushNotificationClient({
      fcmToken: this.config.fcmToken,
      apnsToken: this.config.apnsToken
    });
    
    // Set up callbacks
    this.pushClient.setCallbacks({
      onNotification: (data: any) => this.handlePushNotification(data),
      onRegistration: (token: string) => {
        this.log('info', 'Push notification token registered:', token);
      },
      onRegistrationError: (error: string) => {
        this.callbacks.onError?.(error, 'push');
      }
    });
    
    // Start the client
    this.pushClient.start();
  }
  
  /**
   * Handle WebSocket message
   * @param message WebSocket message
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    this.updateMetrics('messagesReceived', 'websocket', 1);
    
    switch (message.type) {
      case 'new_order':
        if (message.order) {
          this.handleNewOrder(message.order, 'websocket');
        }
        break;
        
      case 'new_batch_order':
        // Handle batch orders the same as regular orders
        if (message.batch) {
          // Extract order data from batch and treat as new order
          this.handleNewBatchOrder(message.batch, 'websocket');
        }
        break;
        
      case 'order_update':
        if (message.order) {
          this.handleOrderUpdate(message.order, 'websocket');
        }
        break;
        
      case 'new_batch_leg':
        if (message.batch_leg) {
          this.handleNewBatchLeg(message.batch_leg, 'websocket');
        }
        break;
        
      case 'batch_leg_update':
        if (message.batch_leg) {
          this.handleBatchLegUpdate(message.batch_leg, 'websocket');
        }
        break;
        
      case 'auth_success':
        this.log('info', 'WebSocket authentication successful');
        break;
        
      case 'auth_error':
        this.log('error', 'WebSocket authentication failed:', message.message);
        this.callbacks.onError?.(`Authentication failed: ${  message.message}`, 'websocket');
        break;
        
      case 'error':
        this.log('error', 'WebSocket error:', message.message);
        this.callbacks.onError?.(message.message, 'websocket');
        break;
        
      default:
        this.log('debug', 'Unknown WebSocket message type:', message.type);
    }
  }
  
  /**
   * Handle polling data
   * @param orders Orders from polling
   */
  private handlePollingData(orders: Order[]): void {
    this.updateMetrics('messagesReceived', 'polling', 1);
    
    if (!orders || !orders.length) {
      return;
    }
    
    // Process each order
    orders.forEach(order => {
      this.handleNewOrder(order, 'polling');
    });
  }
  
  /**
   * Handle push notification
   * @param data Push notification data
   */
  private handlePushNotification(data: any): void {
    this.updateMetrics('messagesReceived', 'push', 1);
    
    // Extract order from notification data
    if (data && data.order) {
      this.handleNewOrder(data.order, 'push');
    }
  }
  
  /**
   * Handle new batch order from any source
   * @param batch Batch data
   * @param source Source of the batch
   */
  private handleNewBatchOrder(batch: any, source: CommunicationMode): void {
    this.log('info', `New batch order ${batch.batch_id || batch.id} received from ${source}`);
    
    // Convert batch data to individual orders and process them
    if (batch.orders && Array.isArray(batch.orders)) {
      // Process each order in the batch
      batch.orders.forEach((order: Order) => {
        this.handleNewOrder(order, source);
      });
    } else {
      // If no orders array, treat the batch as a single order
      // Create a synthetic order from batch data
      const syntheticOrder: Order = {
        id: batch.batch_id || batch.id,
        order_number: batch.batch_number || `BATCH_${batch.batch_id}`,
        customer: batch.customer || { name: 'Batch Customer' },
        pickup_address: batch.pickup_address || '',
        pickup_latitude: batch.pickup_latitude,
        pickup_longitude: batch.pickup_longitude,
        delivery_address: batch.delivery_address || batch.pickup_address || '',
        delivery_latitude: batch.delivery_latitude || batch.pickup_latitude,
        delivery_longitude: batch.delivery_longitude || batch.pickup_longitude,
        status: 'pending',
        total: batch.total_value || 0,
        created_at: new Date(batch.created_at || Date.now()),
        current_batch: batch,
        // Add batch-specific properties
        is_batch: true,
        batch_id: batch.batch_id || batch.id,
        batch_number: batch.batch_number,
        order_count: batch.order_count || 1
      } as Order;
      
      this.handleNewOrder(syntheticOrder, source);
    }
  }

  /**
   * Handle new order from any source
   * @param order Order data
   * @param source Source of the order
   */
  private handleNewOrder(order: Order, source: CommunicationMode): void {
    this.updateMetrics('ordersReceived', 'all', 1);
    
    // Check for duplicates if deduplication is enabled
    if (this.config.deduplicationEnabled) {
      const now = Date.now();
      const lastSeen = this.seenOrderIds.get(order.id);
      
      if (lastSeen && (now - lastSeen) < this.config.deduplicationWindow) {
        // This is a duplicate within the deduplication window
        this.updateMetrics('duplicateOrdersFiltered', 'all', 1);
        this.log('debug', `Filtered duplicate order ${order.id} from ${source}`);
        return;
      }
      
      // Update seen timestamp
      this.seenOrderIds.set(order.id, now);
    }
    
    // This is a new or sufficiently old order
    this.updateMetrics('uniqueOrdersReceived', 'all', 1);
    this.log('info', `New order ${order.id} received from ${source}`);
    
    // Notify callback
    this.callbacks.onNewOrder?.(order, source);
  }
  
  /**
   * Handle order update from any source
   * @param order Updated order data
   * @param source Source of the update
   */
  private handleOrderUpdate(order: Order, source: CommunicationMode): void {
    this.log('info', `Order update for ${order.id} received from ${source}`);
    this.callbacks.onOrderUpdate?.(order, source);
  }
  
  /**
   * Handle new batch leg from any source
   * @param batchLeg New batch leg data
   * @param source Source of the batch leg
   */
  private handleNewBatchLeg(batchLeg: any, source: CommunicationMode): void {
    this.log('info', `New batch leg ${batchLeg.id} received from ${source}`);
    this.updateMetrics('ordersReceived', 'all', 1);
    
    // Apply deduplication if needed
    if (this.config.deduplicationEnabled && batchLeg.id) {
      const now = Date.now();
      const lastSeen = this.seenOrderIds.get(`batch_leg_${batchLeg.id}`);
      
      if (lastSeen && (now - lastSeen) < this.config.deduplicationWindow) {
        this.updateMetrics('duplicateOrdersFiltered', 'all', 1);
        this.log('debug', `Filtered duplicate batch leg ${batchLeg.id} from ${source}`);
        return;
      }
      
      this.seenOrderIds.set(`batch_leg_${batchLeg.id}`, now);
    }
    
    this.updateMetrics('uniqueOrdersReceived', 'all', 1);
    this.callbacks.onNewBatchLeg?.(batchLeg, source);
  }
  
  /**
   * Handle batch leg update from any source
   * @param batchLeg Updated batch leg data
   * @param source Source of the update
   */
  private handleBatchLegUpdate(batchLeg: any, source: CommunicationMode): void {
    this.log('info', `Batch leg update for ${batchLeg.id} received from ${source}`);
    this.callbacks.onBatchLegUpdate?.(batchLeg, source);
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    // Add defensive checks to prevent "isConnected is not a function" errors
    const websocketConnected = (this.websocketClient && typeof this.websocketClient.isConnected === 'function') 
      ? this.websocketClient.isConnected() 
      : false;
    
    const pollingConnected = (this.pollingClient && typeof this.pollingClient.getConnectionStatus === 'function') 
      ? this.pollingClient.getConnectionStatus() 
      : false;
    
    const pushConnected = (this.pushClient && typeof this.pushClient.isConnected === 'function') 
      ? this.pushClient.isConnected() 
      : false;
    
    // Debug logging to help identify the issue
    if (this.config.logLevel === 'debug') {
      console.debug('[RealtimeSDK] Connection status check:', {
        websocketClient: typeof this.websocketClient,
        pollingClient: typeof this.pollingClient,
        pushClient: typeof this.pushClient,
        websocketConnected,
        pollingConnected,
        pushConnected
      });
    }
    
    return {
      websocket: websocketConnected,
      polling: pollingConnected,
      push: pushConnected,
      overall: websocketConnected || pollingConnected || pushConnected
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): RealtimeSDKConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   * @param config New configuration
   */
  async updateConfig(config: Partial<RealtimeSDKConfig>): Promise<void> {
    const wasRunning = this.isRunning;
    
    // Stop if running
    if (wasRunning) {
      this.stop();
    }
    
    // Update config
    this.config = { ...this.config, ...config };
    
    // Restart if it was running
    if (wasRunning) {
      this.start();
    }
  }
  
  /**
   * Mark an order as handled
   * @param orderId Order ID
   */
  markOrderAsHandled(orderId: string): void {
    // Remove from seen orders to prevent further notifications
    this.seenOrderIds.delete(orderId);
    this.log('debug', `Order ${orderId} marked as handled`);
  }
  
  /**
   * Get metrics
   */
  getMetrics(): RealtimeMetrics {
    // Update timestamp
    this.metrics.lastUpdated = new Date();
    return { ...this.metrics };
  }
  
  /**
   * Update metrics
   * @param category Metric category
   * @param mode Communication mode
   * @param value Value to add
   */
  private updateMetrics(category: keyof RealtimeMetrics, mode: CommunicationMode, value: number): void {
    if (!this.config.enableMetrics) {
      return;
    }
    
    if (typeof this.metrics[category] === 'number') {
      (this.metrics[category] as number) += value;
    } else if (typeof this.metrics[category] === 'object') {
      const metricObj = this.metrics[category] as Record<CommunicationMode, number>;
      metricObj[mode] += value;
      metricObj.all += value;
    }
    
    // Notify metrics callback if provided
    this.callbacks.onMetrics?.(this.getMetrics());
  }
  
  /**
   * Set up app state listener for background/foreground transitions
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    this.lastAppState = AppState.currentState;
  }
  
  /**
   * Handle app state changes
   * @param nextAppState The next app state
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    this.log('info', `App state changed: ${this.lastAppState} -> ${nextAppState}`);
    
    if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      const backgroundDuration = Date.now() - this.backgroundTime;
      this.log('info', `App came to foreground after ${Math.round(backgroundDuration / 1000)}s`);
      
      // Reconnect WebSocket if it was disconnected
      if (this.websocketClient && !this.websocketClient.isConnected()) {
        this.log('info', 'Reconnecting WebSocket after background...');
        this.websocketClient.start();
      }
      
      // Force a polling refresh if polling is enabled
      if (this.pollingClient) {
        this.log('info', 'Forcing polling refresh after background...');
        this.pollingClient.forcePoll();
      }
      
      // Notify callbacks about reconnection
      this.callbacks.onConnectionChange?.(true, 'websocket');
      
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      this.backgroundTime = Date.now();
      this.log('info', 'App went to background');
      
      // Note: We don't disconnect WebSocket here, as the OS will handle it
      // and our reconnection logic will kick in when needed
    }
    
    this.lastAppState = nextAppState;
  }
  
  /**
   * Log message based on configured log level
   * @param level Log level
   * @param message Message
   * @param args Additional arguments
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
    
    if (logLevels[level] >= logLevels[this.config.logLevel]) {
      const prefix = `[MursalSDK:${level.toUpperCase()}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'error':
          console.error(prefix, message, ...args);
          break;
      }
    }
  }
}