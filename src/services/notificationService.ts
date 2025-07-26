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
      
      // Check if this is a new order notification
      if (data.type === 'new_order' && data.order) {
        // Only trigger popup/sound if app is in foreground or this is a high-priority notification
        const appState = AppState.currentState;
        
        if (appState === 'active') {
          // App is in foreground - show popup immediately
          this.notificationCallbacks.onNewOrder?.(data.order);
        } else {
          // App is in background - the push notification will wake up the phone
          // When user opens the app, we'll handle it through normal channels
        }
        
        // Always play sound and vibrate for new orders (this will wake the phone)
        this.playOrderSound();
        this.vibrateForOrder();
      }
    } catch (error) {
      console.error('[NotificationService] Error handling push notification:', error);
    }
  }
  
  private async getCurrentTenantId(): Promise<string | null> {
    try {
      const { Storage, STORAGE_KEYS } = await import('../utils');
      const tenantId = await Storage.getItem(STORAGE_KEYS.TENANT_ID);
      return tenantId as string | null;
    } catch (error) {
      console.error('[NotificationService] Error getting tenant ID:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      // Import API service to send FCM token to backend
      const { apiService } = await import('./api');
      await apiService.updateFcmToken(token);
    } catch (error) {
      // Failed to send token
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
}

export const notificationService = new NotificationService();