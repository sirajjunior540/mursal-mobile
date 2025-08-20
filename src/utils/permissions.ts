
/* eslint-disable no-console */
// eslint-disable-next-line react-native/split-platform-components
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Extend global to include fcmToken
declare global {
  // eslint-disable-next-line no-var
  var fcmToken: string | undefined;
}

// Conditional Firebase messaging import with fallback
let messaging: typeof import('@react-native-firebase/messaging').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('Firebase messaging not available - notification permissions will be limited');
}

/**
 * Request notification permissions for both Android and iOS
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // Note: VIBRATE permission is automatically granted in Android and doesn't need to be requested
      console.log('📱 Vibration permission is automatically granted on Android');
      
      // Android 13+ requires explicit notification permission
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'This app needs permission to show notifications for new orders and updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Android notification permission denied');
          return false;
        }
      }
    }

    // Request Firebase messaging permission (iOS and newer Android)
    if (messaging) {
      try {
        const authStatus = await messaging().requestPermission();
        // Check authStatus directly as a number
        const enabled = authStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL

        if (!enabled) {
          console.log('❌ Firebase messaging permission denied, authStatus:', authStatus);
          // Don't show alert for Firebase permissions, as Android native permissions are more important
          // The app can still work with polling/WebSocket
        } else {
          console.log('✅ Firebase notification permissions granted, authStatus:', authStatus);
          
          // Get FCM token for push notifications
          try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
              console.log('🔑 FCM Token obtained:', `${fcmToken.substring(0, 20)  }...`);
              
              // Store FCM token for later use
              // This will be used to enable push notifications in realtime service
              global.fcmToken = fcmToken;
            } else {
              console.warn('⚠️ FCM token is null');
            }
          } catch (error) {
            console.error('❌ Error getting FCM token:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error requesting Firebase messaging permission:', error);
        // Don't fail the whole permission request if Firebase fails
        // The app can still work with polling/WebSocket
      }
    } else {
      console.warn('⚠️ Firebase messaging not available - push notifications will be disabled');
      // Continue without Firebase - app will use polling/WebSocket for notifications
    }
    
    console.log('✅ All notification permissions granted successfully');

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Check if notification permissions are granted
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // Note: VIBRATE permission is automatically granted on Android
      console.log('📱 Vibration permission is automatically available on Android');
      
      // Check notification permission for Android 13+
      if (Platform.Version >= 33) {
        const notificationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!notificationGranted) {
          return false;
        }
      }
      
      return true; // Vibration is always available, notification checked above
    }

    // Check Firebase messaging permission
    if (messaging) {
      try {
        const authStatus = await messaging().hasPermission();
        return authStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL
      } catch (error) {
        console.error('Error checking Firebase messaging permission:', error);
        // Return true if we at least have Android permissions
        return true;
      }
    } else {
      console.warn('Firebase messaging not available - cannot check push notification permissions');
      // Return true if we at least have Android permissions
      return true;
    }
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

/**
 * Request location permissions with detailed error handling
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      // Request fine location permission
      const fineLocationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Mursal Driver needs precise location access to track your position and provide accurate delivery updates.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }

      // Request background location permission (Android 10+)
      if (Platform.Version >= 29) {
        const backgroundLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Permission',
            message: 'Allow Mursal Driver to access location even when the app is in the background? This ensures continuous delivery tracking.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (backgroundLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Limited Location Access',
            'Background location access was not granted. Location tracking may be limited when the app is in the background.',
            [{ text: 'OK' }]
          );
        }
      }

      return true;
    } catch (err) {
      console.error('Android location permission error:', err);
      return false;
    }
  }

  // iOS permissions are handled through Info.plist
  return true;
};

/**
 * Check current location permission status
 */
export const checkLocationPermissions = async (): Promise<{
  fineLocation: boolean;
  backgroundLocation: boolean;
}> => {
  if (Platform.OS === 'android') {
    try {
      const fineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      let backgroundLocation = true; // Default for older Android versions
      if (Platform.Version >= 29) {
        backgroundLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
      }

      return { fineLocation, backgroundLocation };
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return { fineLocation: false, backgroundLocation: false };
    }
  }

  // For iOS, assume permissions are granted if app is not asking
  return { fineLocation: true, backgroundLocation: true };
};

/**
 * Request camera permissions for QR code scanning
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Mursal Driver needs camera access to scan QR codes for order verification and package tracking.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Camera permission denied');
        return false;
      }
    }
    // iOS camera permissions are handled through Info.plist and runtime prompts
    
    console.log('✅ Camera permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
};

/**
 * Check camera permission status
 */
export const checkCameraPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      return granted;
    }
    
    // For iOS, camera permission is checked when accessing camera
    return true;
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return false;
  }
};

/**
 * Show camera permission settings guide
 */
export const showCameraPermissionGuide = () => {
  Alert.alert(
    'Camera Permission Required',
    `To scan QR codes for order verification, please enable camera access:\n\n${
      Platform.OS === 'ios' 
        ? '1. Go to Settings > Privacy & Security > Camera\n2. Find Mursal Driver and toggle ON'
        : '1. Go to Settings > Apps > Mursal Driver\n2. Tap Permissions\n3. Enable Camera access'
    }`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => {
        // Platform-specific settings navigation would go here
        console.log('Opening device settings for camera permissions');
      }}
    ]
  );
};
