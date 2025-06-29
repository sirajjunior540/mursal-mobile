import { Order } from '../types';
import { apiService } from './api';
import { Storage, SecureStorage } from '../utils';
import { 
  RealtimeSDK, 
  RealtimeSDKConfig, 
  CommunicationMode
} from '../sdk';

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
  private lastPollTime: number = 0;
  private seenOrderIds: Set<string> = new Set();
  private notifiedOrderIds: Set<string> = new Set();

  /**
   * Initialize the realtime service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing RealtimeService...');

      // Load saved configuration
      const savedConfig = await Storage.getItem<RealtimeConfig>('realtime_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
        console.log('📋 Loaded saved config:', savedConfig);
      }

      // Initialize the SDK
      await this.initializeSDK();

      console.log('✅ RealtimeService initialized successfully');
    } catch (error) {
      console.error('❌ RealtimeService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize the SDK
   */
  private async initializeSDK(): Promise<void> {
    try {
      console.log('🔧 Initializing RealtimeSDK...');

      // Get auth token
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        console.warn('⚠️ No authentication token available, skipping SDK initialization');
        // Don't throw - just skip initialization
        // The service will retry when a token becomes available
        return;
      }
      console.log('🔑 Auth token retrieved:', `${token.substring(0, 20)  }...`);

      // Create SDK configuration
      const sdkConfig: Partial<RealtimeSDKConfig> = {
        baseUrl: apiService.getBaseUrl(),
        authToken: token,
        enabledModes: this.getSdkEnabledModes(),
        primaryMode: this.getSdkPrimaryMode(),
        pollingInterval: this.config.pollingInterval,
        pollingEndpoint: '/api/v1/delivery/deliveries/available_orders/',
        websocketEndpoint: '/ws/driver/orders/',
        pushEnabled: false, // Will be enabled later when FCM is set up
        logLevel: __DEV__ ? 'debug' : 'info',
        deduplicationEnabled: true
      };

      // Create SDK instance
      this.sdk = new RealtimeSDK(sdkConfig);

      // Set up SDK callbacks
      this.setupSdkCallbacks();

      console.log('🚀 RealtimeSDK initialized successfully');
      console.log('📋 SDK Config:', {
        ...sdkConfig,
        authToken: sdkConfig.authToken ? '***' : undefined // Hide token in logs
      });

      // Auto-start if enabled
      if (this.config.enabled) {
        console.log('🔄 Auto-starting realtime service after initialization');
        this.start();
      }
    } catch (error) {
      console.error('❌ Error initializing RealtimeSDK:', error);
      // Don't throw - just log the error
      // This prevents the entire app from crashing if realtime fails
      this.callbacks.onError?.(`Failed to initialize realtime service: ${error}`);
    }
  }

  /**
   * Set up SDK callbacks
   */
  private setupSdkCallbacks(): void {
    if (!this.sdk) return;

    this.sdk.setCallbacks({
      onNewOrder: (order, source) => {
        console.log(`🔔 New order received from ${source}: ${order.id}`);

        // Check if we've already seen this order
        if (this.seenOrderIds.has(order.id)) {
          console.log(`📎 Order ${order.id} already seen, ignoring`);
          return;
        }

        // Validate and normalize order data
        if (!this.validateOrderData(order)) {
          console.error(`❌ Order ${order.id} has invalid data, attempting to fix`);
          order = this.normalizeOrderData(order);
        }

        // Mark as seen
        this.seenOrderIds.add(order.id);
        this.notifiedOrderIds.add(order.id);

        // Notify callback
        this.callbacks.onNewOrder?.(order);
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
    if (this.sdk) {
      return this.config.enabled;
    }
    return false;
  }

  /**
   * Check connection status
   */
  isConnectedToServer(): boolean {
    if (this.sdk) {
      const status = this.sdk.getConnectionStatus();
      return status.overall;
    }
    return this.isConnected;
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
   * @param order Order to validate
   * @returns True if order data is valid, false otherwise
   */
  private validateOrderData(order: Order): boolean {
    if (!order) return false;
    if (!order.id) return false;

    // Check for required fields
    const hasCustomer = !!order.customer;
    const hasDeliveryAddress = !!order.deliveryAddress;
    const hasOrderNumber = !!order.orderNumber;
    const hasStatus = !!order.status;

    // Log validation results
    console.log(`🔍 Order validation: customer=${hasCustomer}, address=${hasDeliveryAddress}, orderNumber=${hasOrderNumber}, status=${hasStatus}`);

    return hasCustomer && hasDeliveryAddress && hasOrderNumber && hasStatus;
  }

  /**
   * Normalize order data to ensure it has all required fields with fallback values
   * @param order Order to normalize
   * @returns Normalized order data
   */
  private normalizeOrderData(order: Order): Order {
    if (!order) return {} as Order;

    console.log('🔧 Normalizing order data:', order.id);

    // Create a deep copy to avoid modifying the original
    const normalizedOrder: Order = { ...order };

    // Ensure order has an ID
    normalizedOrder.id = order.id || `order_${Date.now()}`;

    // Ensure order has a number
    normalizedOrder.orderNumber = order.orderNumber || `#${normalizedOrder.id}`;

    // Ensure order has a status
    normalizedOrder.status = order.status || 'pending';

    // Ensure order has a customer
    if (!normalizedOrder.customer) {
      normalizedOrder.customer = {
        id: `customer_${normalizedOrder.id}`,
        name: 'Unknown Customer',
        phone: '',
        email: ''
      };
      console.log('⚠️ Created fallback customer data');
    }

    // Ensure customer has required fields
    if (normalizedOrder.customer) {
      normalizedOrder.customer.id = normalizedOrder.customer.id || `customer_${normalizedOrder.id}`;
      normalizedOrder.customer.name = normalizedOrder.customer.name || 
                                      normalizedOrder.customer.full_name || 
                                      'Unknown Customer';
      normalizedOrder.customer.phone = normalizedOrder.customer.phone || 
                                       normalizedOrder.customer.phone_number || 
                                       '';
      normalizedOrder.customer.email = normalizedOrder.customer.email || '';
    }

    // Ensure order has a delivery address
    if (!normalizedOrder.deliveryAddress) {
      normalizedOrder.deliveryAddress = {
        street: 'Address not available',
        coordinates: null
      };
      console.log('⚠️ Created fallback delivery address');
    }

    // Ensure order has a total
    if (typeof normalizedOrder.total !== 'number') {
      normalizedOrder.total = 0;
      console.log('⚠️ Set fallback total amount');
    }

    // Ensure order has an estimated delivery time
    normalizedOrder.estimatedDeliveryTime = normalizedOrder.estimatedDeliveryTime || '30 min';

    console.log('✅ Order data normalized successfully');

    return normalizedOrder;
  }
}

export const realtimeService = new RealtimeService();
