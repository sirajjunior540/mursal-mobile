import { Platform, Alert, Vibration, AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Order } from '../types';
import { PushNotificationClient } from '../sdk/pushNotificationClient';

class NotificationService {
  private isInitialized = false;
  private orderSound: Sound | null = null;
  private pushClient: PushNotificationClient | null = null;
  private notificationCallbacks: {
    onOrderReceived?: (orderId: string, action: 'accept' | 'decline') => void;
    onNavigateToOrder?: (orderId: string) => void;
    onNewOrder?: (order: Order) => void;
  } = {};

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Enable playback in background and silence mode
    Sound.setCategory('Playback');

    // Initialize the order notification sound
    this.initializeOrderSound();

    // Initialize push notifications for background wake-up
    this.initializePushNotifications();

    this.isInitialized = true;
  }

  private initializeOrderSound() {
    try {
      // Use a built-in system sound as fallback
      // You can replace 'notification.mp3' with your custom sound file
      const soundFile = Platform.select({
        ios: 'notification.wav', // Place in ios/sounds/ folder
        android: 'notification.mp3' // Place in android/app/src/main/res/raw/ folder
      });

      // For now, use system default sound since we don't have custom sound files
      // When you add custom sound files, uncomment the following:
      /*
      this.orderSound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          // Failed to load sound
          this.orderSound = null;
        } else {
          // Order notification sound loaded successfully
        }
      });
      */

    } catch (error) {
      this.orderSound = null;
    }
  }

  private initializePushNotifications() {
    try {
      // Initialize push notification client
      this.pushClient = new PushNotificationClient({});
      
      // Set up callbacks
      this.pushClient.setCallbacks({
        onNotification: (data) => {
          this.handlePushNotification(data);
        },
        onRegistration: (token) => {
          // TODO: Send token to backend for this driver
          this.sendTokenToBackend(token);
        },
        onRegistrationError: (error) => {
          // Handle registration error silently
        }
      });

      // Start push notifications
      this.pushClient.start();
    } catch (error) {
    }
  }

  private async handlePushNotification(data: any) {
    try {
      // Check if notification is for current tenant
      const currentTenantId = await this.getCurrentTenantId();
      const notificationTenantId = data.tenant_id || data.tenantId || data.tenant;
      
      // Only process notifications for the current tenant
      if (notificationTenantId && currentTenantId && notificationTenantId !== currentTenantId) {
        console.log(`[NotificationService] Ignoring notification for different tenant: ${notificationTenantId}`);
        return;
      }
      
      // Check if this is a high priority notification that should wake the screen
      const isHighPriority = data.priority === 'high' || data.wake_screen === 'true' || data.show_when_locked === 'true';
      
      if (isHighPriority) {
        console.log('[NotificationService] High priority notification detected - attempting wake-up');
        
        // Enhanced wake-up sequence for high priority notifications
        this.performWakeUpSequence();
      }
      
      // Check if this is a new order notification
      if (data.type === 'new_order' || data.type === 'new_batch' || data.order || data.orderId || data.batch_id) {
        // Parse order data if it's a string
        let orderData = data.order;
        if (typeof orderData === 'string') {
          try {
            orderData = JSON.parse(orderData);
          } catch (e) {
            console.error('[NotificationService] Error parsing order data:', e);
          }
        }
        
        // For batch notifications, create a pseudo-order object if needed
        if (data.type === 'new_batch' && !orderData && data.batch_id) {
          orderData = {
            id: data.batch_id,
            order_number: data.batch_number || `BATCH_${data.batch_id}`,
            is_batch: true,
            batch_id: data.batch_id,
            order_count: data.order_count || 1,
            total: parseFloat(data.total_value || data.total || '0') || 0,
            pickup_address: data.pickup_address || '',
            customer_details: {
              name: `Batch Order (${data.order_count || 1} orders)`
            },
            currency: data.currency || 'SAR' // Default to SAR if not provided
          };
        }
        
        // If no order data but we have essential fields, create a minimal order object
        if (!orderData && (data.order_id || data.delivery_id)) {
          console.log('[NotificationService] Creating order from notification data:', data);
          orderData = {
            id: data.delivery_id || data.order_id || data.id,
            order_number: data.order_number || `#${data.order_id || data.id}`,
            customer: data.customer || {
              name: data.customer_name || 'Customer',
              phone: data.customer_phone || '',
            },
            customer_details: {
              name: data.customer_name || 'Customer',
              phone: data.customer_phone || ''
            },
            pickup_address: data.pickup_address || 'Pickup Location',
            delivery_address: data.delivery_address || 'Delivery Location',
            total: parseFloat(data.total || data.total_amount || '0') || 0,
            subtotal: parseFloat(data.subtotal || '0') || 0,
            delivery_fee: parseFloat(data.delivery_fee || '0') || 0,
            items: data.items || [],
            status: 'pending',
            created_at: new Date().toISOString(),
            currency: data.currency || 'SAR' // Default to SAR if not provided
          };
        }
        
        const appState = AppState.currentState;
        
        // Always trigger callback for new orders regardless of app state
        // The callback will handle the appropriate UI based on app state
        if (orderData) {
          console.log(`[NotificationService] Processing ${data.type || 'new_order'} notification, app state: ${appState}`);
          console.log('[NotificationService] Order data:', JSON.stringify(orderData, null, 2));
          console.log('[NotificationService] Has callback:', !!this.notificationCallbacks.onNewOrder);
          
          if (this.notificationCallbacks.onNewOrder) {
            console.log('[NotificationService] Calling onNewOrder callback...');
            this.notificationCallbacks.onNewOrder(orderData);
          } else {
            console.error('[NotificationService] No onNewOrder callback registered!');
          }
        } else {
          console.error('[NotificationService] No order data available from notification:', data);
        }
        
        // Always play sound and vibrate for new orders (this will wake the phone)
        this.playOrderSound();
        this.vibrateForOrder();
      }
    } catch (error) {
      console.error('[NotificationService] Error handling push notification');
    }
  }
  
  private async getCurrentTenantId(): Promise<string | null> {
    try {
      // First try to get from storage
      let tenantId: string | null = null;
      try {
        const { Storage, STORAGE_KEYS } = await import('../utils');
        if (Storage && STORAGE_KEYS && STORAGE_KEYS.TENANT_ID) {
          tenantId = await Storage.getItem(STORAGE_KEYS.TENANT_ID);
        }
      } catch (storageError) {
        console.warn('[NotificationService] Could not access storage');
      }
      
      if (tenantId) {
        return tenantId as string;
      }
      
      // Fallback to environment config
      try {
        const { ENV } = await import('../config/environment');
        if (ENV) {
          const fallbackTenantId = ENV.TENANT_ID || ENV.DEFAULT_TENANT_ID || 'sirajjunior';
          console.log('[NotificationService] Using fallback tenant ID:', fallbackTenantId);
          return fallbackTenantId;
        }
      } catch (envError) {
        console.warn('[NotificationService] Could not load environment config');
      }
      
      // If all else fails, return default
      console.log('[NotificationService] Using hardcoded fallback tenant ID: sirajjunior');
      return 'sirajjunior';
      
    } catch (error) {
      console.error('[NotificationService] Error getting tenant ID');
      // Ultimate fallback
      return 'sirajjunior';
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      // Import API service to send FCM token to backend
      const { apiService } = await import('./api');
      
      console.log('[NotificationService] Attempting to send FCM token to backend...');
      
      // Add timeout to prevent hanging on localhost:8081 connections
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FCM token update timeout')), 10000); // 10 second timeout
      });
      
      const updatePromise = apiService.updateFCMToken(token);
      
      const result = await Promise.race([updatePromise, timeoutPromise]) as any;
      
      if (result.success) {
        console.log('[NotificationService] FCM token sent to backend successfully');
      } else {
        console.warn('[NotificationService] FCM token update failed:', result.error);
        // Don't throw error - this is not critical for notification functionality
      }
    } catch (error) {
      // Log but don't throw - FCM token sending failure shouldn't break notifications
      console.warn('[NotificationService] Warning: Could not send FCM token to backend:', error);
      console.log('[NotificationService] Continuing with local notification functionality...');
    }
  }

  /**
   * Play notification sound
   */
  public playOrderSound() {
    try {
      if (this.orderSound) {
        // Play custom sound
        this.orderSound.stop(() => {
          this.orderSound?.play((success) => {
            // Sound played
          });
        });
      } else {
        // Fallback to system sound using a more noticeable pattern
        // Create an audible beep pattern using system
        this.createSystemBeep();
      }
    } catch (error) {
      // Fallback to system beep
      this.createSystemBeep();
    }
  }

  /**
   * Create a system beep pattern for notifications
   */
  private createSystemBeep() {
    try {
      // Create multiple short vibrations to simulate a ringtone
      const beepPattern = () => {
        Vibration.vibrate(100);
        setTimeout(() => Vibration.vibrate(100), 200);
        setTimeout(() => Vibration.vibrate(100), 400);
        setTimeout(() => Vibration.vibrate(100), 600);
      };
      
      // Repeat the pattern 3 times
      beepPattern();
      setTimeout(beepPattern, 1000);
      setTimeout(beepPattern, 2000);
    } catch (error) {
    }
  }

  /**
   * Vibrate device for order notifications
   */
  public vibrateForOrder() {
    try {
      // Cancel any existing vibration first
      Vibration.cancel();
      
      // Vibration pattern: [duration, pause, duration, pause...] in milliseconds
      const pattern = [0, 200, 100, 200, 100, 400]; // Short-short-long pattern
      
      if (Platform.OS === 'android') {
        Vibration.vibrate(pattern);
      } else {
        // iOS doesn't support custom patterns, so we do multiple vibrations
        Vibration.vibrate();
        setTimeout(() => Vibration.vibrate(), 300);
        setTimeout(() => Vibration.vibrate(), 600);
      }
    } catch (error) {
    }
  }
  
  /**
   * Stop all vibrations
   */
  public stopVibration() {
    try {
      Vibration.cancel();
    } catch (error) {
    }
  }

  /**
   * Show order notification using Alert (fallback for now)
   */
  public showOrderNotification(order: Order) {
    const title = 'New Order Available!';
    const message = `Order ${order.order_number || order.id} from ${order.customer_details?.name || 'Customer'} - $${(Number(order.total) || 0).toFixed(2)}`;

    // Play sound and vibrate
    this.playOrderSound();
    this.vibrateForOrder();


    // For development, we can show a simple alert notification
  }

  /**
   * Show in-app notification using Alert
   */
  public showInAppNotification(order: Order, onAccept: () => void, onDecline: () => void) {
    Alert.alert(
      '🚚 New Order Available!',
      `Order ${order.order_number || order.id}\nCustomer: ${order.customer_details?.name || 'Unknown'}\nTotal: $${(Number(order.total) || 0).toFixed(2)}\nAddress: ${order.delivery_address || 'Unknown address'}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: onDecline
        },
        {
          text: 'Accept',
          style: 'default',
          onPress: onAccept
        }
      ],
      { cancelable: false }
    );

    // Play sound and vibrate
    this.playOrderSound();
    this.vibrateForOrder();
  }

  /**
   * Background notification support methods
   */
  public setNotificationCallbacks(callbacks: {
    onOrderReceived?: (orderId: string, action: 'accept' | 'decline') => void;
    onNavigateToOrder?: (orderId: string) => void;
    onNewOrder?: (order: Order) => void;
  }) {
    this.notificationCallbacks = { ...this.notificationCallbacks, ...callbacks };
  }

  /**
   * Get FCM token
   */
  public getFcmToken(): string | null {
    if (this.pushClient) {
      return this.pushClient.getToken() || null;
    }
    return null;
  }

  /**
   * Enable background notifications
   */
  public async enableBackgroundNotifications(): Promise<boolean> {
    try {
      if (this.pushClient) {
        // Subscribe to driver-specific topic for targeted notifications
        await this.pushClient.subscribeToTopic('new-orders');
        return true;
      } else {
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Schedule background check (placeholder)
   */
  public scheduleBackgroundCheck(intervalMinutes: number = 5) {
  }

  /**
   * Request notification permissions (basic implementation)
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check notification permissions (basic implementation)
   */
  public async checkPermissions(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create notification channel (Android placeholder)
   */
  public createNotificationChannel() {
    if (Platform.OS === 'android') {
    }
  }

  /**
   * Cancel notifications (placeholder)
   */
  public cancelOrderNotification(orderId: string) {
  }

  public cancelAllNotifications() {
  }

  /**
   * Schedule order reminder (placeholder)
   */
  public scheduleOrderReminder(order: Order, delayMinutes: number = 5) {
  }

  public clearOrderReminder(orderId: string) {
  }


  /**
   * Simple vibration for button taps
   */
  public vibrateLight() {
    try {
      Vibration.vibrate(50); // Short vibration
    } catch (error) {
    }
  }

  /**
   * Medium vibration for warnings
   */
  public vibrateMedium() {
    try {
      Vibration.vibrate(200); // Medium vibration
    } catch (error) {
    }
  }

  /**
   * Strong vibration for important notifications
   */
  public vibrateStrong() {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 500]); // Strong vibration
      } else {
        Vibration.vibrate();
        setTimeout(() => Vibration.vibrate(), 100);
      }
    } catch (error) {
    }
  }

  /**
   * Enhanced wake-up sequence for high priority notifications
   */
  private performWakeUpSequence() {
    try {
      console.log('[NotificationService] Performing wake-up sequence');
      
      // Cancel any existing vibrations first
      Vibration.cancel();
      
      // Create an enhanced vibration pattern for wake-up
      // Pattern: [wait, vibrate, wait, vibrate...] in milliseconds
      const wakeUpPattern = [
        0,    // Start immediately
        300,  // Long vibration
        200,  // Pause
        100,  // Short vibration
        200,  // Pause
        100,  // Short vibration
        500,  // Longer pause
        400,  // Long vibration
        200,  // Pause
        200,  // Medium vibration
      ];
      
      if (Platform.OS === 'android') {
        // Android supports vibration patterns
        Vibration.vibrate(wakeUpPattern, false); // Don't repeat
      } else {
        // iOS doesn't support patterns, so simulate with multiple calls
        const simulatePattern = () => {
          Vibration.vibrate(); // Long vibration (system default)
          setTimeout(() => Vibration.vibrate(), 500);  // Short vibration
          setTimeout(() => Vibration.vibrate(), 800);  // Short vibration
          setTimeout(() => Vibration.vibrate(), 1500); // Final long vibration
        };
        
        simulatePattern();
      }
      
      // Enhanced sound sequence
      this.playWakeUpSound();
      
    } catch (error) {
      console.error('[NotificationService] Error in wake-up sequence');
      // Fallback to basic vibration
      this.vibrateStrong();
    }
  }

  /**
   * Enhanced sound for wake-up notifications
   */
  private playWakeUpSound() {
    try {
      if (this.orderSound) {
        // Play custom sound multiple times for wake-up
        this.orderSound.stop(() => {
          this.orderSound?.play(() => {
            // Play again after short delay
            setTimeout(() => {
              this.orderSound?.play();
            }, 500);
          });
        });
      } else {
        // Enhanced system beep pattern for wake-up
        this.createWakeUpBeepPattern();
      }
    } catch (error) {
      // Fallback to basic beep
      this.createWakeUpBeepPattern();
    }
  }

  /**
   * Create an enhanced beep pattern specifically for wake-up
   */
  private createWakeUpBeepPattern() {
    try {
      // Create a more aggressive beep pattern to wake up the phone
      const beepSequence = () => {
        // First set of beeps
        Vibration.vibrate(150);
        setTimeout(() => Vibration.vibrate(150), 300);
        setTimeout(() => Vibration.vibrate(150), 600);
        
        // Brief pause
        setTimeout(() => {
          // Second set of beeps (longer)
          Vibration.vibrate(300);
          setTimeout(() => Vibration.vibrate(150), 500);
          setTimeout(() => Vibration.vibrate(300), 800);
        }, 1200);
      };
      
      // Execute the sequence
      beepSequence();
      
      // Repeat once more after 2 seconds to ensure wake-up
      setTimeout(beepSequence, 2000);
      
    } catch (error) {
      // Final fallback - basic vibration
      Vibration.vibrate(1000);
    }
  }
}

export const notificationService = new NotificationService();