import { Order } from '../types';
import { apiService } from './api';
import { Storage, SecureStorage } from '../utils';
import { 
  RealtimeSDK, 
  RealtimeSDKConfig, 
  CommunicationMode
} from '../sdk';
import { ENV, realtimeDebug } from '../config/environment';

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
  onNewBatchLeg?: (batchLeg: any) => void;
  onBatchLegUpdate?: (batchLeg: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

// Interface for order data validation
export interface OrderData {
  id: string;
  order?: Order;
  order_number?: string;
  customer_details?: {
    name?: string;
    full_name?: string;
  };
  customer?: {
    name?: string;
  } | string;
  customer_name?: string;
  delivery_address?: string;
  status?: string;
}

// Interface for JWT payload
export interface JWTPayload {
  iat?: number;
  exp?: number;
  user_id?: string;
  username?: string;
}

// Interface for token validation result
export interface TokenValidation {
  issued?: string;
  expires?: string;
  currentTime: string;
  isExpired: boolean;
  needsRefresh: boolean;
}

// Interface for connection status
export interface ConnectionStatus {
  overall: boolean;
  polling?: boolean;
  websocket?: boolean;
  push?: boolean;
}

// Interface for order tracking stats
export interface OrderTrackingStats {
  seen: number;
  notified: number;
  seenIds: string[];
  notifiedIds: string[];
  metrics?: Record<string, unknown>;
}

/**
 * RealtimeService
 * This service uses the RealtimeSDK to provide real-time communication with the backend.
 * It maintains backward compatibility with the old interface while leveraging the new SDK.
 */
class RealtimeService {
  private config: RealtimeConfig = {
    mode: 'polling',
    pollingInterval: 60000, // 60 seconds - increased from 30s to reduce battery usage
    enabled: true, // ✅ Enable by default
  };

  private callbacks: RealtimeCallbacks = {};
  private sdk: RealtimeSDK | null = null;
  private isConnected: boolean = false;
  private initialized: boolean = false;
  private initializationBlocked: boolean = true; // Block all initialization until explicitly enabled
  private seenOrderIds: Set<string> = new Set();
  private notifiedOrderIds: Set<string> = new Set();

  /**
   * Initialize the realtime service
   */
  async initialize(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🚀 Initializing RealtimeService...');
        console.log('🔍 Call stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'));
      }

      // Check if initialization is blocked (safety measure)
      if (this.initializationBlocked) {
        if (__DEV__) console.log('🚫 RealtimeService initialization is blocked - call enableInitialization() first');
        this.callbacks.onError?.('Realtime service initialization blocked - login required');
        return;
      }

      // Check if already initialized
      if (this.initialized) {
        if (__DEV__) console.log('⚠️ RealtimeService already initialized, skipping');
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
        if (__DEV__) console.log('📋 Loaded saved config:', savedConfig);
      }

      // Initialize the SDK
      await this.initializeSDK();

      this.initialized = true;
      if (__DEV__) console.log('✅ RealtimeService initialized successfully');
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
      if (__DEV__) console.log('🔧 Initializing RealtimeSDK...');

      // Check if we're in a valid state for initialization
      if (this.initializationBlocked) {
        console.log('⏸️ Initialization not enabled yet - waiting for enableInitialization()');
        return;
      }

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

      // Validate environment configuration
      if (!ENV.API_BASE_URL || !ENV.WS_BASE_URL) {
        console.error('❌ Missing required environment configuration');
        this.callbacks.onError?.('Missing API configuration');
        return;
      }

      // Extract driver ID from JWT token for WebSocket connection
      let driverId: string | undefined;
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          driverId = payload.driver_id || payload.user_id || payload.sub;
          console.log('🔐 Extracted driver ID from token:', driverId);
        }
      } catch (error) {
        console.warn('⚠️ Could not extract driver ID from token:', error);
      }

      console.log('🌐 Environment configuration:', {
        apiUrl: ENV.API_BASE_URL,
        wsUrl: ENV.WS_BASE_URL,
        driverId,
        hasToken: !!token
      });

      // Create SDK configuration
      // Note: API calls use ENV.API_BASE_URL, WebSocket uses ENV.WS_BASE_URL (Go service on port 8085)
      const sdkConfig: Partial<RealtimeSDKConfig> = {
        baseUrl: ENV.WS_BASE_URL,       // WebSocket service URL (Go websocket-service on port 8085)
        apiBaseUrl: ENV.API_BASE_URL,   // API service URL for polling (delivery-service on port 9000)
        authToken: token,
        tenantId: ENV.TENANT_ID,
        driverId,  // Driver ID for Go websocket-service connection
        enabledModes: this.getSdkEnabledModes(),
        primaryMode: this.getSdkPrimaryMode(),
        pollingInterval: this.config.pollingInterval,
        pollingEndpoint: '/api/v1/delivery/deliveries/available_orders/',
        // Go websocket-service expects /ws with query params user_id and user_type
        websocketEndpoint: '/ws',
        websocketReconnectInterval: 10000, // Start with 10 seconds (exponential backoff in WebSocketClient)
        websocketMaxReconnectAttempts: 5,
        pushEnabled: false,
        logLevel: 'info',
        enableMetrics: true,
        deduplicationEnabled: true,
        deduplicationWindow: 30000
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
  private processValidOrder(orderData: any): void {
    const order = orderData.order || orderData;
    const orderId = order?.id;
    
    if (!orderId) {
      console.error('❌ Unable to process order without valid ID');
      return;
    }

    console.log(`🔔 Processing order: ${orderId}`);
    console.log('📊 Full data structure:', JSON.stringify(orderData, null, 2));

    // Check if we've already seen this order
    if (this.seenOrderIds.has(orderId)) {
      console.log(`📎 Order ${orderId} already seen, ignoring`);
      return;
    }

    // Validate order data using backend field names
    if (!this.validateOrderData(orderData)) {
      console.error(`❌ Order ${orderId} has invalid data, skipping`);
      return;
    }

    // Mark as seen
    this.seenOrderIds.add(orderId);
    this.notifiedOrderIds.add(orderId);

    // Extract the actual order data for the callback
    const normalizedOrder = orderData.order ? orderData.order : orderData;
    
    // Notify callback with the order data
    this.callbacks.onNewOrder?.(normalizedOrder as Order);
  }

  private setupSdkCallbacks(): void {
    if (!this.sdk) return;

    this.sdk.setCallbacks({
      onNewOrder: (data: unknown, source: string) => {
        // Handle both direct order and delivery with nested order structure
        const orderData = data as OrderData;
        const order = orderData.order || orderData;
        const orderId = order?.id;
        
        if (!orderId) {
          console.error('❌ Received order data without valid ID');
          console.error('📊 Debug - Raw data structure:', JSON.stringify(data, null, 2));
          console.error('📊 Debug - Parsed order:', JSON.stringify(order, null, 2));
          console.error('📊 Debug - Available fields:', Object.keys(orderData || {}));
          
          // Try to extract ID from alternative fields for batch orders
          const alternativeId = orderData?.batch_id || orderData?.id || order?.batch_id;
          if (alternativeId) {
            console.log(`🔧 Found alternative ID: ${alternativeId}, treating as batch order`);
            // Handle as batch order with synthetic ID
            const syntheticOrder = {
              ...order,
              id: alternativeId,
              order_number: orderData?.batch_number || `BATCH_${alternativeId}`,
              is_batch: true
            };
            this.processValidOrder({ ...orderData, id: alternativeId, order_number: orderData?.batch_number || `BATCH_${alternativeId}`, is_batch: true });
            return;
          }
          
          return;
        }

        this.processValidOrder(orderData);
      },
      onOrderUpdate: (order) => {
        console.log(`📝 Order update received: ${order.id}`);
        this.callbacks.onOrderUpdate?.(order);
      },
      onNewBatchLeg: (batchLeg, source) => {
        console.log(`📦 New batch leg received from ${source}: ${batchLeg.id}`);
        console.log('📊 Batch leg data:', JSON.stringify(batchLeg, null, 2));
        
        // Check if we've already seen this batch leg
        const legId = `batch_leg_${batchLeg.id}`;
        if (this.seenOrderIds.has(legId)) {
          console.log(`📎 Batch leg ${batchLeg.id} already seen, ignoring`);
          return;
        }
        
        this.seenOrderIds.add(legId);
        this.notifiedOrderIds.add(legId);
        
        // Notify callback
        this.callbacks.onNewBatchLeg?.(batchLeg);
      },
      onBatchLegUpdate: (batchLeg) => {
        console.log(`📝 Batch leg update received: ${batchLeg.id}`);
        this.callbacks.onBatchLegUpdate?.(batchLeg);
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
      onError: (error: unknown, mode: string) => {
        console.error(`❌ Error from ${mode}: ${error}`);
        
        // Enhanced error handling for authentication issues
        const errorStr = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));
        
        // Check for authentication/authorization errors
        if (errorStr.includes('auth') || 
            errorStr.includes('401') || 
            errorStr.includes('403') || 
            errorStr.includes('unauthorized') || 
            errorStr.includes('forbidden') ||
            errorStr.includes('token') ||
            errorStr.includes('jwt')) {
          
          console.warn('🔑 Authentication error detected in realtime service');
          console.log('🔄 Attempting to refresh authentication token...');
          
          // Try to reinitialize with fresh token
          this.handleAuthenticationError();
        } else {
          console.error('❌ Non-authentication error:', errorStr);
          this.callbacks.onError?.(errorStr);
        }
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
  getOrderTrackingStats(): OrderTrackingStats {
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
        metrics: this.sdk.getMetrics() as unknown as Record<string, unknown>
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
  private validateOrderData(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      console.log('❌ Order validation failed: data is null/undefined or not an object');
      return false;
    }
    
    const orderData = data as OrderData;
    
    // Handle both direct order and delivery with nested order structure
    const order = orderData.order || orderData; // If it's a delivery object, use nested order
    const deliveryId = orderData.id && orderData.order ? orderData.id : null; // Delivery ID if this is a delivery object
    
    if (!order.id) {
      console.log('❌ Order validation failed: missing order id');
      console.log('Available top-level fields:', Object.keys(orderData));
      return false;
    }

    console.log(`🔍 Order validation for order ${order.id} ${deliveryId ? `(delivery ${deliveryId})` : ''}:`);
    
    // Use backend field names from DeliveryWithOrderSerializer -> OrderDetailSerializer
    // Be more flexible with customer data - accept either customer_details or customer field
    const orderAny = order as unknown as Record<string, unknown>;
    const hasCustomer = !!(orderAny.customer_details || orderAny.customer);
    const hasDeliveryAddress = !!orderAny.delivery_address;
    const hasOrderNumber = !!orderAny.order_number;
    const hasStatus = !!orderAny.status;

    // Log customer info safely
    const customerDetails = orderAny.customer_details as Record<string, unknown> | undefined;
    const customer = orderAny.customer as Record<string, unknown> | string | undefined;
    
    const customerInfo = customerDetails?.name || 
                        customerDetails?.full_name ||
                        orderAny.customer_name ||
                        (typeof customer === 'object' && customer ? customer.name : `ID: ${customer}`) ||
                        'none';

    console.log(`   customer: ${hasCustomer} (${customerInfo})`);
    console.log(`   delivery_address: ${hasDeliveryAddress} (${orderAny.delivery_address || 'none'})`);
    console.log(`   order_number: ${hasOrderNumber} (${orderAny.order_number || 'none'})`);
    console.log(`   status: ${hasStatus} (${orderAny.status || 'none'})`);

    // More lenient validation - only require essential fields
    const isValid = hasCustomer && hasDeliveryAddress && hasOrderNumber;
    console.log(`   validation result: ${isValid}`);
    
    return isValid;
  }

  /**
   * Manually refresh authentication and reinitialize service
   * This can be called when auth errors are detected from the app
   */
  async refreshAuthentication(): Promise<boolean> {
    console.log('🔄 Manual authentication refresh requested...');
    
    try {
      await this.handleAuthenticationError();
      return this.initialized;
    } catch (error) {
      console.error('❌ Manual authentication refresh failed:', error);
      return false;
    }
  }

  /**
   * Handle authentication errors by attempting to refresh and reinitialize
   */
  private async handleAuthenticationError(): Promise<void> {
    try {
      console.log('🔧 Handling authentication error - stopping current service...');
      
      // Stop current service
      this.stop();
      this.initialized = false;
      
      // Clear any cached tokens that might be invalid
      console.log('🗑️ Clearing potentially invalid cached data...');
      
      // Wait a moment before attempting refresh
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
      
      // Try to get a fresh token
      console.log('🔄 Attempting to get fresh authentication token...');
      const freshToken = await this.getValidAuthToken();
      
      if (freshToken) {
        console.log('✅ Fresh token obtained, reinitializing realtime service...');
        
        // Reinitialize with fresh token
        await this.initializeSDK();
        
        // If we're supposed to be running, restart
        if (this.isRunning()) {
          console.log('🔄 Restarting realtime service with fresh token...');
          this.start();
        }
      } else {
        console.warn('⚠️ Could not obtain fresh token - user may need to login again');
        this.callbacks.onError?.('Authentication failed - please login again');
      }
    } catch (error) {
      console.error('❌ Error handling authentication error:', error);
      this.callbacks.onError?.('Authentication refresh failed - please restart the app');
    }
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
      // Enhanced token validation for mobile
      console.log('🔍 Validating token format...');
      
      // Check token format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ Invalid JWT token format - wrong number of parts');
        return null;
      }
      
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Date.now() / 1000;
      const bufferTime = 300; // Refresh 5 minutes before expiry (more buffer for mobile)

      console.log('🕐 Token validation:', {
        issued: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A',
        expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
        currentTime: new Date(now * 1000).toISOString(),
        isExpired: payload.exp ? payload.exp < now : false,
        needsRefresh: payload.exp ? payload.exp < (now + bufferTime) : false
      });

      if (payload.exp && payload.exp < now) {
        console.log('❌ Token is already expired');
        return null;
      }

      if (payload.exp && payload.exp < (now + bufferTime)) {
        console.log('🔄 Token expiring soon, attempting refresh via API service...');
        
        // Try to refresh token using API service
        try {
          // Make a test API call which will trigger automatic refresh if needed
          const testResponse = await apiService.getDriverProfile();
          if (testResponse.success) {
            // Get the refreshed token
            const newToken = await SecureStorage.getAuthToken();
            if (newToken && newToken !== token) {
              console.log('✅ Token refreshed successfully via API service');
              return newToken;
            } else {
              console.log('⚠️ API call successful but token unchanged');
              return token;
            }
          } else {
            console.log('❌ Token refresh failed, authentication error persists');
            return null;
          }
        } catch (error) {
          console.error('❌ Token refresh via API service failed:', error);
          
          // Check if it's a network error vs auth error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
            console.log('🌐 Network error during refresh, using existing token');
            return token; // Use existing token if it's just a network issue
          }
          
          return null;
        }
      }

      console.log('✅ Token is valid and not expiring soon');
      return token;
    } catch (error) {
      console.error('⚠️ Token validation error:', error);
      
      // For mobile, be more lenient with token parsing errors
      console.log('🔄 Token parsing failed, but returning token for server validation');
      return token; // Return token anyway, let server validate
    }
  }

}

export const realtimeService = new RealtimeService();
