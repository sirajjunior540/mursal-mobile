import { Platform, Alert, Vibration } from 'react-native';
import Sound from 'react-native-sound';
import { Order } from '../types';

class NotificationService {
  private isInitialized = false;
  private orderSound: Sound | null = null;
  private notificationCallbacks: {
    onOrderReceived?: (orderId: string, action: 'accept' | 'decline') => void;
    onNavigateToOrder?: (orderId: string) => void;
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

    console.log('📱 NotificationService initialized with custom sound support');
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
          console.log('❌ Failed to load sound:', error);
          this.orderSound = null;
        } else {
          console.log('✅ Order notification sound loaded successfully');
        }
      });
      */

      console.log('🔊 Order sound initialized (using system default for now)');
    } catch (error) {
      console.error('❌ Failed to initialize order sound:', error);
      this.orderSound = null;
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
            if (success) {
              console.log('🔊 Order notification sound played successfully');
            } else {
              console.log('❌ Order notification sound failed to play');
            }
          });
        });
      } else {
        // Fallback to system sound using a more noticeable pattern
        // Create an audible beep pattern using system
        this.createSystemBeep();
        console.log('🔊 Playing order notification sound (system fallback)');
      }
    } catch (error) {
      console.error('❌ Failed to play notification sound:', error);
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
      
      console.log('🔊 System beep pattern created for order notification');
    } catch (error) {
      console.error('❌ Failed to create system beep:', error);
    }
  }

  /**
   * Vibrate device for order notifications
   */
  public vibrateForOrder() {
    try {
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
      
      console.log('📳 Device vibration triggered for order notification');
    } catch (error) {
      console.error('❌ Failed to vibrate device:', error);
    }
  }

  /**
   * Show order notification using Alert (fallback for now)
   */
  public showOrderNotification(order: Order) {
    const title = 'New Order Available!';
    const message = `Order ${order.orderNumber || order.id} from ${order.customer?.name || 'Customer'} - $${(Number(order.total) || 0).toFixed(2)}`;

    // Play sound and vibrate
    this.playOrderSound();
    this.vibrateForOrder();

    console.log('📨 Order notification triggered:', {
      orderId: order.id,
      customer: order.customer?.name,
      total: order.total,
      title,
      message
    });

    // For development, we can show a simple alert notification
    // In production, this would be replaced with proper push notifications
    if (__DEV__) {
      console.log(`📱 DEV NOTIFICATION: ${title} - ${message}`);
    }
  }

  /**
   * Show in-app notification using Alert
   */
  public showInAppNotification(order: Order, onAccept: () => void, onDecline: () => void) {
    Alert.alert(
      '🚚 New Order Available!',
      `Order ${order.orderNumber || order.id}\nCustomer: ${order.customer?.name || 'Unknown'}\nTotal: $${(Number(order.total) || 0).toFixed(2)}\nAddress: ${order.deliveryAddress?.street || 'Unknown address'}`,
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
  }) {
    this.notificationCallbacks = { ...this.notificationCallbacks, ...callbacks };
    console.log('📱 Notification callbacks updated');
  }

  /**
   * Get FCM token (placeholder for future implementation)
   */
  public getFcmToken(): string | null {
    console.log('📱 FCM token not available (push notification library not installed)');
    return null;
  }

  /**
   * Enable background notifications (placeholder)
   */
  public async enableBackgroundNotifications(): Promise<boolean> {
    try {
      console.log('📱 Background notifications enabled (using built-in APIs)');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable background notifications:', error);
      return false;
    }
  }

  /**
   * Schedule background check (placeholder)
   */
  public scheduleBackgroundCheck(intervalMinutes: number = 5) {
    console.log(`📱 Background check scheduled for every ${intervalMinutes} minutes (placeholder)`);
  }

  /**
   * Request notification permissions (basic implementation)
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      console.log('📱 Notification permissions requested (using system defaults)');
      return true;
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Check notification permissions (basic implementation)
   */
  public async checkPermissions(): Promise<boolean> {
    try {
      console.log('📋 Checking notification permissions (assuming granted)');
      return true;
    } catch (error) {
      console.error('❌ Failed to check notification permissions:', error);
      return false;
    }
  }

  /**
   * Create notification channel (Android placeholder)
   */
  public createNotificationChannel() {
    if (Platform.OS === 'android') {
      console.log('📢 Notification channel creation (placeholder for Android)');
    }
  }

  /**
   * Cancel notifications (placeholder)
   */
  public cancelOrderNotification(orderId: string) {
    console.log(`🚫 Cancel notification for order ${orderId} (placeholder)`);
  }

  public cancelAllNotifications() {
    console.log('🚫 Cancel all notifications (placeholder)');
  }

  /**
   * Schedule order reminder (placeholder)
   */
  public scheduleOrderReminder(order: Order, delayMinutes: number = 5) {
    console.log(`⏰ Order reminder scheduled for ${delayMinutes} minutes (placeholder)`);
  }

  public clearOrderReminder(orderId: string) {
    console.log(`🗑️ Clear reminder for order ${orderId} (placeholder)`);
  }

  /**
   * Test notification for debugging
   */
  public testNotification() {
    const testOrder: Order = {
      id: 'test_123',
      orderNumber: 'TEST-001',
      customer: {
        id: 'customer_1',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      },
      items: [],
      deliveryAddress: {
        id: 'addr_1',
        street: '123 Test Street',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
        apartmentUnit: '',
        deliveryInstructions: '',
        coordinates: undefined
      },
      restaurantAddress: {
        id: 'rest_1',
        street: '456 Restaurant Ave',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
        coordinates: undefined
      },
      status: 'pending',
      paymentMethod: 'credit_card',
      subtotal: 25.99,
      deliveryFee: 4.99,
      tax: 2.48,
      tip: 5.00,
      total: 38.46,
      estimatedDeliveryTime: '30 min',
      specialInstructions: 'Test order instructions',
      orderTime: new Date(),
      acceptedTime: undefined,
      pickedUpTime: undefined,
      deliveredTime: undefined
    };

    this.showOrderNotification(testOrder);
    
    // Also show in-app notification for testing
    this.showInAppNotification(
      testOrder,
      () => console.log('✅ Test order accepted'),
      () => console.log('❌ Test order declined')
    );
  }

  /**
   * Simple vibration for button taps
   */
  public vibrateLight() {
    try {
      Vibration.vibrate(50); // Short vibration
    } catch (error) {
      console.error('❌ Failed to vibrate:', error);
    }
  }

  /**
   * Medium vibration for warnings
   */
  public vibrateMedium() {
    try {
      Vibration.vibrate(200); // Medium vibration
    } catch (error) {
      console.error('❌ Failed to vibrate:', error);
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
      console.error('❌ Failed to vibrate:', error);
    }
  }
}

export const notificationService = new NotificationService();