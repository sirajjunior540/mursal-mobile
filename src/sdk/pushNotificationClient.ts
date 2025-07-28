/**
 * Push Notification Client for Mursal Realtime SDK
 * Handles push notifications for orders using Firebase Cloud Messaging (FCM)
 * and Apple Push Notification Service (APNs)
 */

import { Platform } from 'react-native';

// Conditional imports with fallbacks
let messaging: any = null;
let PushNotification: any = null;
let PushNotificationIOS: any = null;

try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('Firebase messaging not available - push notifications will be disabled');
}

try {
  PushNotification = require('react-native-push-notification').default;
} catch (e) {
  console.warn('react-native-push-notification not available - local notifications will be disabled');
}

try {
  PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
} catch (e) {
  console.warn('Push notification iOS not available - iOS push notifications will be disabled');
}

export interface PushNotificationClientConfig {
  fcmToken?: string;
  apnsToken?: string;
}

export interface PushNotificationClientCallbacks {
  onNotification?: (data: any) => void;
  onRegistration?: (token: string) => void;
  onRegistrationError?: (error: string) => void;
}

export class PushNotificationClient {
  private config: PushNotificationClientConfig;
  private callbacks: PushNotificationClientCallbacks = {};
  private isInitialized: boolean = false;
  private onTokenRefreshListener: (() => void) | undefined;
  private onMessageListener: (() => void) | undefined;
  
  /**
   * Constructor
   * @param config Push notification client configuration
   */
  constructor(config: PushNotificationClientConfig) {
    this.config = config;
  }
  
  /**
   * Set callbacks
   * @param callbacks Push notification client callbacks
   */
  setCallbacks(callbacks: PushNotificationClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  /**
   * Subscribe to tenant-specific topics
   * @param tenantId Current tenant ID
   */
  async subscribeToTenantTopics(tenantId: string): Promise<void> {
    if (!messaging) {
      console.warn('[PushNotificationClient] Firebase messaging not available');
      return;
    }
    
    try {
      // Subscribe to tenant-specific topics
      await messaging().subscribeToTopic(`tenant_${tenantId}`);
      await messaging().subscribeToTopic(`tenant_${tenantId}_drivers`);
      console.log(`[PushNotificationClient] Subscribed to tenant topics for ${tenantId}`);
    } catch (error) {
      console.error('[PushNotificationClient] Error subscribing to topics:', error);
    }
  }
  
  /**
   * Unsubscribe from tenant-specific topics
   * @param tenantId Tenant ID to unsubscribe from
   */
  async unsubscribeFromTenantTopics(tenantId: string): Promise<void> {
    if (!messaging) {
      console.warn('[PushNotificationClient] Firebase messaging not available');
      return;
    }
    
    try {
      await messaging().unsubscribeFromTopic(`tenant_${tenantId}`);
      await messaging().unsubscribeFromTopic(`tenant_${tenantId}_drivers`);
      console.log(`[PushNotificationClient] Unsubscribed from tenant topics for ${tenantId}`);
    } catch (error) {
      console.error('[PushNotificationClient] Error unsubscribing from topics:', error);
    }
  }
  
  /**
   * Start push notification client
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      console.log('[PushNotificationClient] Already initialized');
      return;
    }
    
    console.log('[PushNotificationClient] Initializing push notifications');
    
    try {
      // Configure push notifications
      this.configurePushNotifications();
      
      // Request permissions
      const granted = await this.requestPermissions();
      
      if (granted) {
        // Get token
        await this.requestToken();
        
        // Set up listeners
        this.setupListeners();
        
        this.isInitialized = true;
        console.log('[PushNotificationClient] Push notifications initialized successfully');
      } else {
        console.warn('[PushNotificationClient] Push notification permissions denied');
        this.callbacks.onRegistrationError?.('Push notification permissions denied');
      }
    } catch (error) {
      console.error('[PushNotificationClient] Error initializing push notifications:', error);
      this.callbacks.onRegistrationError?.(`Error initializing push notifications: ${error}`);
    }
  }
  
  /**
   * Stop push notification client
   */
  stop(): void {
    if (!this.isInitialized) {
      return;
    }
    
    console.log('[PushNotificationClient] Stopping push notifications');
    
    // Remove listeners
    this.removeListeners();
    
    this.isInitialized = false;
  }
  
  /**
   * Configure push notifications
   */
  private configurePushNotifications(): void {
    if (!PushNotification) {
      console.warn('[PushNotificationClient] PushNotification library not available');
      return;
    }
    
    // Create high priority notification channel for Android
    this.createHighPriorityChannel();
    
    PushNotification.configure({
      // (optional) Called when Token is generated
      onRegister: (token) => {
        console.log('[PushNotificationClient] Token received:', token);
        this.callbacks.onRegistration?.(token.token);
      },
      
      // (required) Called when a remote or local notification is opened or received
      onNotification: (notification) => {
        console.log('[PushNotificationClient] Notification received:', notification);
        
        // Extract data from notification
        const data = Platform.OS === 'ios'
          ? notification.data
          : notification.data || {};
        
        // Handle high priority notifications (wake screen)
        if (data.wake_screen === 'true' || data.priority === 'high') {
          console.log('[PushNotificationClient] High priority notification - attempting to wake screen');
          
          // For Android, create a local notification to ensure it wakes the screen
          if (Platform.OS === 'android') {
            this.createWakeUpNotification(notification.title || 'New Order', notification.message || notification.body || '');
          }
        }
        
        // Process notification data
        this.processNotification(data);
        
        // Required on iOS only
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
      
      // (optional) Called when the user fails to register for remote notifications
      onRegistrationError: (error) => {
        console.error('[PushNotificationClient] Registration error:', error);
        this.callbacks.onRegistrationError?.(error.message || 'Registration error');
      },
      
      // Should the initial notification be popped automatically
      popInitialNotification: true,
      
      // Request permissions on iOS
      requestPermissions: false,
      
      // Android specific settings for wake-up capability
      senderID: '1234567890', // Replace with your actual sender ID from Firebase project
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      // iOS specific settings for wake-up
      ...(Platform.OS === 'ios' && {
        requestPermissions: true,
      }),
    });
  }
  
  /**
   * Request permissions for push notifications
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (!messaging) {
        console.warn('[PushNotificationClient] Firebase messaging not available');
        return false;
      }
      
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      } else {
        // Android doesn't need explicit permission for FCM
        return true;
      }
    } catch (error) {
      console.error('[PushNotificationClient] Error requesting permissions:', error);
      return false;
    }
  }
  
  /**
   * Get FCM token
   */
  private async requestToken(): Promise<void> {
    try {
      if (!messaging) {
        console.warn('[PushNotificationClient] Firebase messaging not available');
        return;
      }
      
      // Get FCM token
      const token = await messaging().getToken();
      console.log('[PushNotificationClient] FCM Token:', token);
      
      // Save token
      this.config.fcmToken = token;
      
      // Notify callback
      this.callbacks.onRegistration?.(token);
    } catch (error) {
      console.error('[PushNotificationClient] Error getting token:', error);
      this.callbacks.onRegistrationError?.(`Error getting token: ${error}`);
    }
  }
  
  /**
   * Set up listeners for push notifications
   */
  private setupListeners(): void {
    if (!messaging) {
      console.warn('[PushNotificationClient] Firebase messaging not available - skipping listeners');
      return;
    }
    
    // Listen for FCM token refresh
    this.onTokenRefreshListener = messaging().onTokenRefresh((token) => {
      console.log('[PushNotificationClient] FCM Token refreshed:', token);
      this.config.fcmToken = token;
      this.callbacks.onRegistration?.(token);
    });
    
    // Listen for messages in foreground
    this.onMessageListener = messaging().onMessage(async (remoteMessage) => {
      console.log('[PushNotificationClient] Foreground message received:', remoteMessage);
      this.processNotification(remoteMessage.data || {});
    });
    
    // Note: Background message handler is set up in index.js to ensure it works correctly
    // Check if there's a pending notification from background
    if (global.pendingNotification) {
      console.log('[PushNotificationClient] Processing pending background notification');
      this.processNotification(global.pendingNotification);
      // Clear the pending notification
      global.pendingNotification = null;
    }
  }
  
  /**
   * Remove listeners
   */
  private removeListeners(): void {
    if (this.onTokenRefreshListener) {
      this.onTokenRefreshListener();
      this.onTokenRefreshListener = undefined;
    }
    
    if (this.onMessageListener) {
      this.onMessageListener();
      this.onMessageListener = undefined;
    }
  }
  
  /**
   * Process notification data
   * @param data Notification data
   */
  private processNotification(data: any): void {
    try {
      console.log('[PushNotificationClient] Processing notification data:', data);
      
      // Check if this is an order notification
      if (data.type === 'new_order' || data.orderId) {
        // Parse order data if it's a string
        let orderData = data.order;
        if (typeof orderData === 'string') {
          try {
            orderData = JSON.parse(orderData);
          } catch (e) {
            console.error('[PushNotificationClient] Error parsing order data:', e);
          }
        }
        
        // Prepare notification data with all available fields
        const notificationData = {
          type: data.type || 'new_order',
          order: orderData,
          orderId: data.orderId || data.order_id || data.id,
          order_id: data.order_id || data.orderId || data.id,
          delivery_id: data.delivery_id || data.id,
          order_number: data.order_number,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          pickup_address: data.pickup_address,
          delivery_address: data.delivery_address,
          total: data.total || data.total_amount,
          total_amount: data.total_amount || data.total,
          subtotal: data.subtotal,
          delivery_fee: data.delivery_fee,
          items: data.items,
          ...data
        };
        
        console.log('[PushNotificationClient] Notifying callback with data:', notificationData);
        
        // Notify callback
        this.callbacks.onNotification?.(notificationData);
      } else {
        // Pass through other notification types
        this.callbacks.onNotification?.(data);
      }
    } catch (error) {
      console.error('[PushNotificationClient] Error processing notification:', error);
    }
  }
  
  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.isInitialized && !!this.config.fcmToken;
  }
  
  /**
   * Get current FCM token
   */
  getToken(): string | undefined {
    return this.config.fcmToken;
  }
  
  /**
   * Register for topic (for targeted notifications)
   * @param topic Topic to subscribe to
   */
  async subscribeToTopic(topic: string): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[PushNotificationClient] Not initialized');
      return;
    }
    
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`[PushNotificationClient] Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`[PushNotificationClient] Error subscribing to topic ${topic}:`, error);
    }
  }
  
  /**
   * Unregister from topic
   * @param topic Topic to unsubscribe from
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`[PushNotificationClient] Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`[PushNotificationClient] Error unsubscribing from topic ${topic}:`, error);
    }
  }
  
  /**
   * Create high priority notification channel for Android
   */
  private createHighPriorityChannel(): void {
    if (!PushNotification || Platform.OS !== 'android') {
      return;
    }
    
    try {
      PushNotification.createChannel(
        {
          channelId: 'delivery_orders',
          channelName: 'Delivery Orders',
          channelDescription: 'High priority notifications for new delivery orders',
          playSound: true,
          soundName: 'default',
          importance: 4, // IMPORTANCE_HIGH
          vibrate: true,
          vibration: 1000,
          led: true,
          ledColor: '#FF6B35',
          showBadge: true,
          bypassDnd: true, // Bypass Do Not Disturb
          enableLights: true,
          enableVibration: true,
          lockscreenVisibility: 1, // VISIBILITY_PUBLIC
          groupKey: 'delivery-orders-group'
        },
        (created) => {
          console.log(`[PushNotificationClient] High priority channel created: ${created}`);
        }
      );
    } catch (error) {
      console.error('[PushNotificationClient] Error creating notification channel:', error);
    }
  }
  
  /**
   * Create a wake-up notification for high priority orders
   */
  private createWakeUpNotification(title: string, message: string): void {
    if (!PushNotification || Platform.OS !== 'android') {
      return;
    }
    
    try {
      PushNotification.localNotification({
        title,
        message,
        channelId: 'delivery_orders',
        priority: 'high',
        importance: 'high',
        vibrate: true,
        vibration: 1000,
        playSound: true,
        soundName: 'default',
        ongoing: false,
        invokeApp: true,
        when: null,
        usesChronometer: false,
        timeoutAfter: 30000, // Auto dismiss after 30 seconds
        ignoreInForeground: false,
        showWhen: true,
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        bigText: message,
        subText: '📱 Tap to view order details',
        bigPictureUrl: 'https://via.placeholder.com/400x200/FF6B35/FFFFFF?text=New+Order',
        bigLargeIcon: 'https://via.placeholder.com/128x128/FF6B35/FFFFFF?text=🚚',
        color: '#FF6B35',
        id: Math.floor(Math.random() * 1000000), // Random notification ID
        tag: 'delivery_order',
        group: 'delivery_orders',
        groupSummary: false,
        category: 'DELIVERY_ORDER',
        actions: [
          {
            identifier: 'ACCEPT_ACTION',
            title: '✅ Accept',
            activationMode: 'foreground',
            destructive: false,
            authenticationRequired: false
          },
          {
            identifier: 'VIEW_ACTION', 
            title: '👁️ View Details',
            activationMode: 'foreground',
            destructive: false,
            authenticationRequired: false
          }
        ],
        userInfo: {
          wake_screen: 'true',
          priority: 'high',
          style: 'big_picture'
        },
      });
      
      console.log('[PushNotificationClient] Wake-up notification created');
    } catch (error) {
      console.error('[PushNotificationClient] Error creating wake-up notification:', error);
    }
  }
  
}