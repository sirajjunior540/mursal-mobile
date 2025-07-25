import { Alert, Platform, Vibration } from 'react-native';

// Conditional import for react-native-sound - will be null if not installed
let Sound: typeof import('react-native-sound') | null = null;
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
  private orderSound: import('react-native-sound') | null = null;
  private ringingInterval: NodeJS.Timeout | null = null;
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

        // Try to load the notification sound, but don't fail if it doesn't exist
        try {
          this.orderSound = new Sound('order_notification.mp3', Sound.MAIN_BUNDLE, (error: Error | null) => {
            if (error) {
              console.log('Custom sound file not found, using vibration only');
              // Fallback to system sound if custom sound fails to load
              this.orderSound = null;
            } else {
              console.log('Sound loaded successfully');
            }
          });
        } catch (soundError) {
          console.log('Sound file not available, using vibration only');
          this.orderSound = null;
        }

        console.log('Sound service initialized with audio support');
      } else {
        console.log('Sound service initialized with vibration only (react-native-sound not available)');
        this.orderSound = null;
      }
    } catch (error) {
      console.log('Sound service initialized with vibration fallback:', error);
      this.orderSound = null;
    }
  }

  /**
   * Play order notification sound
   */
  playOrderNotification = (): void => {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Play the notification sound
      if (this.orderSound && this.orderSound.play) {
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
        this.playSystemBeep();
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
   * Start persistent ringing for incoming orders
   */
  startRinging = async (): Promise<void> => {
    this.stopRinging(); // Stop any existing ringing
    
    // Check notification settings
    let persistenceSeconds = 30; // Default
    try {
      const { Storage } = await import('../utils');
      const settings = await Storage.getItem('notification_settings') as any;
      if (settings?.persistence_seconds) {
        persistenceSeconds = settings.persistence_seconds;
      }
    } catch (error) {
      // Use default if settings not available
    }
    
    // Play immediate sound
    this.playOrderNotification();
    
    // Set up repeating sound every 3 seconds for the configured duration
    let ringCount = 0;
    const maxRings = Math.floor(persistenceSeconds / 3); // Ring every 3 seconds
    
    this.ringingInterval = setInterval(() => {
      ringCount++;
      if (ringCount >= maxRings) {
        this.stopRinging();
        return;
      }
      this.playOrderNotification();
    }, 3000);
    
    console.log(`📞 Started ringing for incoming order (${persistenceSeconds}s persistence)`);
  }
  
  /**
   * Stop persistent ringing
   */
  stopRinging = (): void => {
    if (this.ringingInterval) {
      clearInterval(this.ringingInterval);
      this.ringingInterval = null;
      console.log('🔇 Stopped ringing');
    }
  }
  
  /**
   * Play system beep as fallback
   */
  private playSystemBeep = (): void => {
    try {
      // Create multiple short vibrations to simulate a beep
      if (Platform.OS === 'android') {
        // Android: Use vibration pattern that sounds like beeping
        Vibration.vibrate([0, 100, 50, 100, 50, 100]);
      } else {
        // iOS: Multiple quick vibrations
        Vibration.vibrate();
        setTimeout(() => Vibration.vibrate(), 100);
        setTimeout(() => Vibration.vibrate(), 200);
      }
    } catch (error) {
      console.error('Error playing system beep:', error);
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
      this.stopRinging();
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
