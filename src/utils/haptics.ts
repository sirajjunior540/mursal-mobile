import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const haptics = {
  // Light tap feedback for button presses and selections
  light: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight', options);
    } else {
      ReactNativeHapticFeedback.trigger('soft', options);
    }
  },

  // Medium feedback for important actions
  medium: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactMedium', options);
    } else {
      ReactNativeHapticFeedback.trigger('soft', options);
    }
  },

  // Heavy feedback for critical actions
  heavy: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactHeavy', options);
    } else {
      ReactNativeHapticFeedback.trigger('rigid', options);
    }
  },

  // Success feedback
  success: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess', options);
    } else {
      ReactNativeHapticFeedback.trigger('soft', options);
    }
  },

  // Warning feedback
  warning: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationWarning', options);
    } else {
      ReactNativeHapticFeedback.trigger('soft', options);
    }
  },

  // Error feedback
  error: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationError', options);
    } else {
      ReactNativeHapticFeedback.trigger('rigid', options);
    }
  },

  // Selection feedback (for toggles, tabs, etc.)
  selection: () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection', options);
    } else {
      ReactNativeHapticFeedback.trigger('soft', options);
    }
  },
};