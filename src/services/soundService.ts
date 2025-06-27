import { Alert, Platform } from 'react-native';
// import Sound from 'react-native-sound';

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
      // Enable sound for the app
      // Sound.setCategory('Playback');
      
      // For now, we'll use a simple alert sound
      // In a real app, you would load a custom sound file:
      // this.orderSound = new Sound('order_notification.mp3', Sound.MAIN_BUNDLE, (error) => {
      //   if (error) {
      //     console.log('Failed to load the sound', error);
      //   }
      // });
      
      console.log('Sound service initialized');
    } catch (error) {
      console.error('Error initializing sound service:', error);
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
      // For now, we'll use the system notification sound
      // In a real implementation, you would:
      // if (this.orderSound) {
      //   this.orderSound.setVolume(this.config.volume);
      //   this.orderSound.play((success) => {
      //     if (!success) {
      //       console.log('Failed to play sound');
      //     }
      //   });
      // }

      // Trigger vibration if enabled
      if (this.config.vibration) {
        this.vibrate();
      }

      // For demo purposes, we'll just log
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
        // const { Vibration } = require('react-native');
        // Vibration.vibrate([0, 200, 100, 300, 100, 200]);
        console.log('📳 Vibrating for order notification');
      } else {
        // iOS vibration
        // const { Vibration } = require('react-native');
        // Vibration.vibrate();
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
      if (this.config.vibration && Platform.OS === 'android') {
        // const { Vibration } = require('react-native');
        // Vibration.vibrate(100);
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
      if (this.config.vibration && Platform.OS === 'android') {
        // const { Vibration } = require('react-native');
        // Vibration.vibrate([0, 100, 50, 100]);
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
        // this.orderSound.release();
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