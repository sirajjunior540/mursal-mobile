import { Alert, Platform, Vibration } from 'react-native';

// Conditional import for react-native-sound - will be null if not installed
let Sound: any = null;
try {
  Sound = require('react-native-sound');
} catch (e) {
  console.warn('react-native-sound not available - using vibration only for notifications');
}

export interface SoundConfig {
  enabled: boolean;
  volume: number;
  vibration: boolean;
}

class SoundService {
  private orderSound: any = null;
  private config: SoundConfig = {
    enabled: true,
    volume: 1.0,
    vibration: true,
  };

  constructor() {
    this.initializeSound();
  }

  private initializeSound() {
    try {
      if (Sound) {
        // Enable sound for the app
        Sound.setCategory('Playback');

        // Load the notification sound
        this.orderSound = new Sound('order_notification.mp3', Sound.MAIN_BUNDLE, (error: any) => {
          if (error) {
            console.log('Failed to load the sound', error);
            // Fallback to system sound if custom sound fails to load
            this.orderSound = null;
          } else {
            console.log('Sound loaded successfully');
          }
        });

        console.log('Sound service initialized with audio support');
      } else {
        console.log('Sound service initialized with vibration only (react-native-sound not available)');
        this.orderSound = null;
      }
    } catch (error) {
      console.error('Error initializing sound service:', error);
      this.orderSound = null;
    }
  }

  /**
   * Play order notification sound
   */
  playOrderNotification(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Play the notification sound
      if (this.orderSound) {
        this.orderSound.setVolume(this.config.volume);
        this.orderSound.play((success: boolean) => {
          if (!success) {
            console.log('Failed to play sound');
          } else {
            console.log('Sound played successfully');
          }
        });
      } else {
        console.log('No sound loaded, using fallback');
        // Fallback to system sound if custom sound is not available
        if (Platform.OS === 'ios') {
          // On iOS, we can use the system sound
          Vibration.vibrate();
        }
      }

      // Trigger vibration if enabled
      if (this.config.vibration) {
        this.vibrate();
      }

      console.log('🔊 Playing order notification sound');

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Trigger device vibration
   */
  private vibrate(): void {
    try {
      // Simple vibration pattern for order notifications
      // Pattern: short-long-short
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 200, 100, 300, 100, 200]);
        console.log('📳 Vibrating for order notification');
      } else {
        // iOS vibration
        Vibration.vibrate();
        console.log('📳 Vibrating for order notification (iOS)');
      }
    } catch (error) {
      console.error('Error triggering vibration:', error);
    }
  }

  /**
   * Update sound configuration
   */
  updateConfig(newConfig: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Sound config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * Play success sound for order acceptance
   */
  playSuccessSound(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      console.log('✅ Playing success sound');
      // Simple vibration for success
      if (this.config.vibration) {
        Vibration.vibrate(100);
      }
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  }

  /**
   * Play error sound for order decline or failure
   */
  playErrorSound(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      console.log('❌ Playing error sound');
      // Different vibration pattern for errors
      if (this.config.vibration) {
        Vibration.vibrate([0, 100, 50, 100]);
      }
    } catch (error) {
      console.error('Error playing error sound:', error);
    }
  }

  /**
   * Test notification sound
   */
  testNotificationSound(): void {
    Alert.alert(
      'Testing Notification Sound',
      'You should hear a notification sound and feel vibration if enabled.',
      [
        {
          text: 'Play Sound',
          onPress: () => this.playOrderNotification(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    try {
      if (this.orderSound) {
        this.orderSound.release();
        this.orderSound = null;
      }
    } catch (error) {
      console.error('Error disposing sound service:', error);
    }
  }
}

export const soundService = new SoundService();

// Note: To enable actual sound playback, you would need to:
// 1. Install react-native-sound: npm install react-native-sound
// 2. Add sound files to your project (android/app/src/main/res/raw/ and ios/YourApp/sounds/)
// 3. Uncomment the sound-related code above
// 4. Configure permissions for audio playback in your app
