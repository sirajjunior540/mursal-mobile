import { Platform, Vibration } from 'react-native';

// Try to import react-native-haptic-feedback, fallback to Vibration API if not available
let ReactNativeHapticFeedback: any = null;
try {
  ReactNativeHapticFeedback = require('react-native-haptic-feedback').default || require('react-native-haptic-feedback');
} catch (e) {
  console.warn('react-native-haptic-feedback not installed, using Vibration API fallback');
}

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Fallback vibration patterns
const VIBRATION_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [0, 10, 30, 10],
  warning: [0, 20, 40, 20],
  error: [0, 30, 40, 30],
  selection: 5,
};

export const haptics = {
  // Light tap feedback for button presses and selections
  light: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('impactLight', options);
        } else {
          ReactNativeHapticFeedback.trigger('soft', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.light);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.light);
    }
  },

  // Medium feedback for important actions
  medium: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('impactMedium', options);
        } else {
          ReactNativeHapticFeedback.trigger('soft', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.medium);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.medium);
    }
  },

  // Heavy feedback for critical actions
  heavy: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('impactHeavy', options);
        } else {
          ReactNativeHapticFeedback.trigger('rigid', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.heavy);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.heavy);
    }
  },

  // Success feedback
  success: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('notificationSuccess', options);
        } else {
          ReactNativeHapticFeedback.trigger('soft', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.success);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.success);
    }
  },

  // Warning feedback
  warning: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('notificationWarning', options);
        } else {
          ReactNativeHapticFeedback.trigger('soft', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.warning);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.warning);
    }
  },

  // Error feedback
  error: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('notificationError', options);
        } else {
          ReactNativeHapticFeedback.trigger('rigid', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.error);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.error);
    }
  },

  // Selection feedback (for toggles, tabs, etc.)
  selection: () => {
    try {
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          ReactNativeHapticFeedback.trigger('selection', options);
        } else {
          ReactNativeHapticFeedback.trigger('soft', options);
        }
      } else {
        Vibration.vibrate(VIBRATION_PATTERNS.selection);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(VIBRATION_PATTERNS.selection);
    }
  },

  // Notification feedback for incoming orders
  notification: () => {
    try {
      // First cancel any existing vibrations
      Vibration.cancel();
      
      if (ReactNativeHapticFeedback) {
        if (Platform.OS === 'ios') {
          // On iOS, use native haptic feedback (doesn't repeat indefinitely)
          ReactNativeHapticFeedback.trigger('notificationSuccess', options);
          // Add a short repeating pattern for iOS
          Vibration.vibrate([0, 200, 100, 200, 100, 200], true);
        } else {
          // On Android, use a repeating vibration pattern
          Vibration.vibrate([0, 200, 100, 200, 100, 200], true);
        }
      } else {
        // Special pattern for notifications with repeat
        Vibration.vibrate([0, 200, 100, 200, 100, 200], true);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      // Fallback to simple repeating pattern
      Vibration.vibrate([0, 200, 100, 200], true);
    }
  },

  // Stop all vibrations
  stop: () => {
    try {
      // Cancel any ongoing vibration patterns
      Vibration.cancel();
    } catch (error) {
      console.warn('Error stopping vibration:', error);
    }
  },
};