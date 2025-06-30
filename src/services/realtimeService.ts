import { Order } from '../types';
import { apiService } from './api';
import { Storage, SecureStorage } from '../utils';
import { 
  RealtimeSDK, 
  RealtimeSDKConfig, 
  CommunicationMode
} from '../sdk';
import { ENV, getApiUrl, getWebSocketUrl, realtimeDebug } from '../config/environment';

// For backward compatibility
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

/**
 * RealtimeService
 * This service uses the RealtimeSDK to provide real-time communication with the backend.
 * It maintains backward compatibility with the old interface while leveraging the new SDK.
 */
class RealtimeService {
  private config: RealtimeConfig = {
    mode: 'polling',
    pollingInterval: 10000, // 10 seconds
    enabled: true, // ✅ Enable by default
  };

  private callbacks: RealtimeCallbacks = {};
  private sdk: RealtimeSDK | null = null;
  private isConnected: boolean = false;
  private initialized: boolean = false;
  private initializationBlocked: boolean = true; // Block all initialization until explicitly enabled
  private lastPollTime: number = 0;
  private seenOrderIds: Set<string> = new Set();
  private notifiedOrderIds: Set<string> = new Set();

  /**
   * Initialize the realtime service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing RealtimeService...');
      console.log('🔍 Call stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'));

      // Check if initialization is blocked (safety measure)
      if (this.initializationBlocked) {
        console.log('🚫 RealtimeService initialization is blocked - call enableInitialization() first');
        this.callbacks.onError?.('Realtime service initialization blocked - login required');
        return;
      }

      // Check if already initialized
      if (this.initialized) {
        console.log('⚠️ RealtimeService already initialized, skipping');
        // Still set up callbacks if needed
        if (this.sdk && Object.keys(this.callbacks).length > 0) {
          this.setupSdkCallbacks();
        }
        return;
      }

      // Load saved configuration
      const savedConfig = await Storage.getItem<RealtimeConfig>('realtime_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
        console.log('📋 Loaded saved config:', savedConfig);
      }

      // Initialize the SDK
      await this.initializeSDK();

      this.initialized = true;
      console.log('✅ RealtimeService initialized successfully');
    } catch (error) {
      console.error('❌ RealtimeService initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Initialize the SDK
   */
  private async initializeSDK(): Promise<void> {
    try {
      console.log('🔧 Initializing RealtimeSDK...');

      // Get auth token with automatic refresh handling
      console.log('🔑 Attempting to get valid auth token...');
      const token = await this.getValidAuthToken();
      if (!token) {
        console.log('⚠️ No valid authentication token available - cannot initialize realtime service');
        console.log('🔐 Realtime service will be initialized after successful login or token refresh');
        this.initialized = false;
        this.callbacks.onError?.('Authentication failed - please check your login status');
        return;
      }
      
      // Additional validation for token format
      if (!token || token.split('.').length !== 3) {
        console.error('❌ Invalid JWT token format');
        this.callbacks.onError?.('Invalid authentication token format');
        return;
      }
      
      console.log('✅ Valid auth token obtained, length:', token.length);
      console.log('🔐 Valid authentication token found, proceeding with initialization');
      realtimeDebug('Auth token retrieved:', `${token.substring(0, 20)}...`);

      // Create SDK configuration
      const sdkConfig: Partial<RealtimeSDKConfig> = {
        baseUrl: ENV.API_BASE_URL,
        websocketUrl: ENV.WS_BASE_URL,
        authToken: token,
        enabledModes: this.getSdkEnabledModes(),
        primaryMode: this.getSdkPrimaryMode(),
        pollingInterval: this.config.pollingInterval,
        pollingEndpoint: '/api/v1/delivery/deliveries/available_orders/',
        websocketEndpoint: '/ws/driver/orders/',
        pushEnabled: ENV.ENABLE_PUSH_NOTIFICATIONS,
        logLevel: ENV.DEBUG_REALTIME ? 'debug' : 'info',
        deduplicationEnabled: true
      };

      // Create SDK instance
      this.sdk = new RealtimeSDK(sdkConfig);

      // Set up SDK callbacks
      this.setupSdkCallbacks();

      this.initialized = true;
      console.log('🚀 RealtimeSDK initialized successfully');
      console.log('📋 SDK Config:', {
        ...sdkConfig,
        authToken: sdkConfig.authToken ? '***' : undefined // Hide token in logs
      });

      // Don't auto-start - let OrderContext control when to start
      console.log('📝 RealtimeSDK initialized but not started - waiting for explicit start command');
    } catch (error) {
      console.error('❌ Error initializing RealtimeSDK:', error);
      // Don't throw - just log the error
      // This prevents the entire app from crashing if realtime fails
      this.initialized = false;
      
      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        realtimeDebug('Authentication error detected, will retry after login');
        this.callbacks.onError?.('Authentication failed - please login again');
      } else {
        this.callbacks.onError?.(`Failed to initialize realtime service: ${errorMessage}`);
      }
    }
  }

  /**
   * Enable initialization (must be called after successful login)
   */
  enableInitialization(): void {
    console.log('🔓 Enabling realtime service initialization');
    this.initializationBlocked = false;
  }

  /**
   * Disable initialization (called on logout)
   */
  disableInitialization(): void {
    console.log('🔒 Disabling realtime service initialization');
    this.initializationBlocked = true;
    this.initialized = false;
  }

  /**
   * Retry initialization (useful after login)
   */
  async retryInitialization(): Promise<void> {
    realtimeDebug('Retrying realtime service initialization...');
    this.initialized = false;
    this.enableInitialization(); // Allow initialization
    await this.initializeSDK();
  }

  /**
   * Set up SDK callbacks
   */
  private setupSdkCallbacks(): void {
    if (!this.sdk) return;

    this.sdk.setCallbacks({
      onNewOrder: (data, source) => {
        // Handle both direct order and delivery with nested order structure
        const order = data.order || data;
        const orderId = order.id;
        
        console.log(`🔔 New order received from ${source}: ${orderId}`);
        console.log('📊 Full data structure:', JSON.stringify(data, null, 2));

        // Check if we've already seen this order
        if (this.seenOrderIds.has(orderId)) {
          console.log(`📎 Order ${orderId} already seen, ignoring`);
          return;
        }

        // Validate order data using backend field names
        if (!this.validateOrderData(data)) {
          console.error(`❌ Order ${orderId} has invalid data, skipping`);
          return;
        }

        // Mark as seen
        this.seenOrderIds.add(orderId);
        this.notifiedOrderIds.add(orderId);

        // Extract the actual order data for the callback
        const normalizedOrder = data.order ? data.order : data;
        
        // Notify callback with the order data
        this.callbacks.onNewOrder?.(normalizedOrder);
      },
      onOrderUpdate: (order) => {
        console.log(`📝 Order update received: ${order.id}`);
        this.callbacks.onOrderUpdate?.(order);
      },
      onConnectionChange: (connected, mode) => {
        console.log(`🔌 Connection status changed for ${mode}: ${connected}`);

        // Update overall connection status
        const status = this.sdk?.getConnectionStatus();
        const wasConnected = this.isConnected;
        this.isConnected = status?.overall || false;

        // Only notify if overall status changed
        if (wasConnected !== this.isConnected) {
          console.log(`🔌 Overall connection status changed: ${this.isConnected}`);
          this.callbacks.onConnectionChange?.(this.isConnected);
        }
      },
      onError: (error, mode) => {
        console.error(`❌ Error from ${mode}: ${error}`);
        this.callbacks.onError?.(error);
      },
      onMetrics: (metrics) => {
        // Log metrics in debug mode
        if (__DEV__) {
          console.log('📊 RealtimeSDK metrics:', metrics);
        }
      }
    });
  }

  /**
   * Set configuration
   */
  async setConfig(config: Partial<RealtimeConfig>): Promise<void> {
    const prevConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    await Storage.setItem('realtime_config', this.config);

    // Update SDK configuration if needed
    if (this.sdk) {
      const needsUpdate = 
        prevConfig.mode !== this.config.mode || 
        prevConfig.pollingInterval !== this.config.pollingInterval ||
        prevConfig.enabled !== this.config.enabled;

      if (needsUpdate) {
        await this.sdk.updateConfig({
          enabledModes: this.getSdkEnabledModes(),
          primaryMode: this.getSdkPrimaryMode(),
          pollingInterval: this.config.pollingInterval
        });
      }
    }

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

    // If SDK is initialized, update its callbacks
    if (this.sdk) {
      this.setupSdkCallbacks();
    }
  }

  /**
   * Start realtime service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('🚫 Realtime service is disabled, not starting');
      return;
    }

    console.log('🚀 Starting realtime service');
    console.log('📋 Current config:', this.config);

    // Clear any existing state
    this.stop();

    // Start the SDK
    if (this.sdk) {
      this.sdk.start();
      console.log('✅ RealtimeSDK started successfully');
    } else {
      console.log('⚠️ SDK not initialized yet, attempting to initialize...');
      // Try to initialize SDK if not already done
      this.initializeSDK().then(() => {
        if (this.sdk) {
          this.sdk.start();
          console.log('✅ RealtimeSDK initialized and started');
        }
      }).catch(error => {
        console.error('❌ Failed to initialize SDK:', error);
      });
    }
  }

  /**
   * Stop realtime service
   */
  stop(): void {
    console.log('🛑 Stopping realtime service');

    // Stop the SDK
    if (this.sdk) {
      this.sdk.stop();
    }

    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);

    // Clear tracking sets when stopping
    this.seenOrderIds.clear();
    this.notifiedOrderIds.clear();
    console.log('🧹 Cleared order tracking on service stop');
  }

  /**
   * Convert RealtimeMode to CommunicationMode
   */
  private getSdkPrimaryMode(): CommunicationMode {
    switch (this.config.mode) {
      case 'polling':
        return 'polling';
      case 'websocket':
        return 'websocket';
      default:
        return 'polling';
    }
  }

  /**
   * Get enabled modes for SDK
   */
  private getSdkEnabledModes(): CommunicationMode[] {
    // Always include both modes for fallback, but prioritize the selected one
    return ['polling', 'websocket'];
  }

  // The following methods are no longer needed as they are handled by the SDK
  // They are kept as empty methods for backward compatibility

  /**
   * Start polling for new orders (deprecated - handled by SDK)
   */
  private startPolling(): void {
    console.log('🔄 Polling is now handled by the SDK');
  }

  /**
   * Stop polling (deprecated - handled by SDK)
   */
  private stopPolling(): void {
    // No-op - handled by SDK
  }

  /**
   * Poll for new orders (deprecated - handled by SDK)
   */
  private async pollForNewOrders(): Promise<void> {
    console.log('🔄 Polling is now handled by the SDK');
  }

  /**
   * Clean up old order IDs (deprecated - handled by SDK)
   */
  private cleanupOldOrders(_currentOrderIds: Set<string>): void {
    // No-op - handled by SDK
  }

  /**
   * Start WebSocket connection (deprecated - handled by SDK)
   */
  private startWebSocket(): void {
    console.log('🔌 WebSocket is now handled by the SDK');
  }

  /**
   * Stop WebSocket connection (deprecated - handled by SDK)
   */
  private stopWebSocket(): void {
    // No-op - handled by SDK
  }

  /**
   * Get WebSocket URL (deprecated - handled by SDK)
   */
  private getWebSocketUrl(): string {
    return '';
  }

  /**
   * Send WebSocket authentication (deprecated - handled by SDK)
   */
  private async sendWebSocketAuth(): Promise<void> {
    // No-op - handled by SDK
  }

  /**
   * Handle WebSocket messages (deprecated - handled by SDK)
   */
  private handleWebSocketMessage(_data: any): void {
    // No-op - handled by SDK
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
    return this.initialized && this.config.enabled && this.sdk !== null;
  }

  /**
   * Check connection status
   */
  isConnectedToServer(): boolean {
    if (!this.initialized || !this.sdk) {
      return false;
    }
    const status = this.sdk.getConnectionStatus();
    return status.overall;
  }

  /**
   * Toggle service on/off
   */
  async toggle(): Promise<void> {
    await this.setConfig({ enabled: !this.config.enabled });

    // SDK start/stop is handled in setConfig
  }

  /**
   * Switch between polling and WebSocket
   */
  async switchMode(mode: RealtimeMode): Promise<void> {
    await this.setConfig({ mode });

    // SDK mode update is handled in setConfig
  }

  /**
   * Mark an order as handled (accepted/declined) to stop notifications
   */
  markOrderAsHandled(orderId: string): void {
    // Update local tracking
    this.seenOrderIds.delete(orderId);
    this.notifiedOrderIds.delete(orderId);

    // Update SDK tracking
    if (this.sdk) {
      this.sdk.markOrderAsHandled(orderId);
    }

    console.log(`✅ Order ${orderId} marked as handled - will no longer trigger notifications`);
  }

  /**
   * Clear all order tracking (useful for testing)
   */
  clearOrderTracking(): void {
    const seenCount = this.seenOrderIds.size;
    const notifiedCount = this.notifiedOrderIds.size;

    // Clear local tracking
    this.seenOrderIds.clear();
    this.notifiedOrderIds.clear();

    console.log(`🧹 Cleared ${seenCount} seen orders and ${notifiedCount} notified orders`);
  }

  /**
   * Get order tracking stats (for debugging)
   */
  getOrderTrackingStats(): { seen: number; notified: number; seenIds: string[]; notifiedIds: string[]; metrics?: any } {
    const stats = {
      seen: this.seenOrderIds.size,
      notified: this.notifiedOrderIds.size,
      seenIds: Array.from(this.seenOrderIds),
      notifiedIds: Array.from(this.notifiedOrderIds)
    };

    // Add SDK metrics if available
    if (this.sdk && this.config.enabled) {
      return {
        ...stats,
        metrics: this.sdk.getMetrics()
      };
    }

    return stats;
  }

  /**
   * Enable push notifications
   * @param fcmToken FCM token for push notifications
   */
  async enablePushNotifications(fcmToken: string): Promise<void> {
    if (!this.sdk) {
      console.error('❌ Cannot enable push notifications: SDK not initialized');
      return;
    }

    console.log('🔔 Enabling push notifications with token:', fcmToken);

    await this.sdk.updateConfig({
      pushEnabled: true,
      fcmToken,
      enabledModes: ['polling', 'websocket', 'push']
    });

    // Restart if running
    if (this.config.enabled) {
      this.stop();
      this.start();
    }
  }

  /**
   * Disable push notifications
   */
  async disablePushNotifications(): Promise<void> {
    if (!this.sdk) {
      return;
    }

    console.log('🔕 Disabling push notifications');

    await this.sdk.updateConfig({
      pushEnabled: false,
      enabledModes: this.getSdkEnabledModes()
    });

    // Restart if running
    if (this.config.enabled) {
      this.stop();
      this.start();
    }
  }

  /**
   * Update FCM token
   * @param fcmToken New FCM token
   */
  async updateFcmToken(fcmToken: string): Promise<void> {
    if (!this.sdk) {
      return;
    }

    console.log('🔄 Updating FCM token');

    await this.sdk.updateConfig({
      fcmToken
    });
  }

  /**
   * Validate order data to ensure it has all required fields
   * @param data Order data to validate (could be Order or Delivery with nested order)
   * @returns True if order data is valid, false otherwise
   */
  private validateOrderData(data: any): boolean {
    if (!data) {
      console.log('❌ Order validation failed: data is null/undefined');
      return false;
    }
    
    // Handle both direct order and delivery with nested order structure
    const order = data.order || data; // If it's a delivery object, use nested order
    const deliveryId = data.id && data.order ? data.id : null; // Delivery ID if this is a delivery object
    
    if (!order.id) {
      console.log('❌ Order validation failed: missing order id');
      console.log('Available top-level fields:', Object.keys(data));
      return false;
    }

    console.log(`🔍 Order validation for order ${order.id} ${deliveryId ? `(delivery ${deliveryId})` : ''}:`);
    
    // Use backend field names from DeliveryWithOrderSerializer -> OrderDetailSerializer
    // Be more flexible with customer data - accept either customer_details or customer field
    const hasCustomer = !!(order.customer_details || order.customer);
    const hasDeliveryAddress = !!order.delivery_address;
    const hasOrderNumber = !!order.order_number;
    const hasStatus = !!order.status;

    // Log customer info safely
    const customerInfo = order.customer_details?.name || 
                        order.customer_details?.full_name ||
                        order.customer_name ||
                        (typeof order.customer === 'object' ? order.customer?.name : 'ID: ' + order.customer) ||
                        'none';

    console.log(`   customer: ${hasCustomer} (${customerInfo})`);
    console.log(`   delivery_address: ${hasDeliveryAddress} (${order.delivery_address || 'none'})`);
    console.log(`   order_number: ${hasOrderNumber} (${order.order_number || 'none'})`);
    console.log(`   status: ${hasStatus} (${order.status || 'none'})`);

    // More lenient validation - only require essential fields
    const isValid = hasCustomer && hasDeliveryAddress && hasOrderNumber;
    console.log(`   validation result: ${isValid}`);
    
    return isValid;
  }

  /**
   * Get a valid authentication token, attempting refresh if needed
   */
  private async getValidAuthToken(): Promise<string | null> {
    const token = await SecureStorage.getAuthToken();
    if (!token) {
      console.log('🚫 No auth token available');
      return null;
    }

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const bufferTime = 60; // Refresh 1 minute before expiry

      if (payload.exp && payload.exp < (now + bufferTime)) {
        console.log('🔄 Token expiring soon, attempting refresh via API service...');
        
        // Try to refresh token using API service
        try {
          // Make a test API call which will trigger automatic refresh if needed
          const testResponse = await apiService.getDriverProfile();
          if (testResponse.success) {
            // Get the refreshed token
            const newToken = await SecureStorage.getAuthToken();
            console.log('✅ Token refreshed successfully via API service');
            return newToken;
          } else {
            console.log('❌ Token refresh failed, authentication error persists');
            return null;
          }
        } catch (error) {
          console.error('❌ Token refresh via API service failed:', error);
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('⚠️ Token validation error:', error);
      return token; // Return token anyway, let server validate
    }
  }

}

export const realtimeService = new RealtimeService();
