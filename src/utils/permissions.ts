import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Conditional Firebase messaging import with fallback
let messaging: any = null;
try {
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
      // Note: VIBRATE is a normal permission declared in AndroidManifest.xml
      // It does not need to be requested at runtime via PermissionsAndroid

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
          // For iOS, return false if Firebase permissions are denied
          if (Platform.OS === 'ios') {
            return false;
          }
          // For Android, continue as native permissions are more important
        } else {
          console.log('✅ Firebase notification permissions granted, authStatus:', authStatus);

          // Get FCM token for push notifications
          try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
              console.log('🔑 FCM Token obtained:', fcmToken.substring(0, 20) + '...');

              // Store FCM token for later use
              // This will be used to enable push notifications in realtime service
              (global as any).fcmToken = fcmToken;
            } else {
              console.warn('⚠️ FCM token is null');
            }
          } catch (error) {
            console.error('❌ Error getting FCM token:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error requesting Firebase messaging permission:', error);
        // Don't fail the whole permission request if Firebase fails on Android
        // The app can still work with polling/WebSocket
        if (Platform.OS === 'ios') {
          return false;
        }
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
      // Note: VIBRATE is a normal permission declared in AndroidManifest.xml
      // It does not need to be checked at runtime via PermissionsAndroid

      // Check notification permission for Android 13+
      if (Platform.Version >= 33) {
        const notificationGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!notificationGranted) {
          return false;
        }
      }

      // For Android, also check Firebase permissions if available
      if (messaging) {
        try {
          const authStatus = await messaging().hasPermission();
          const firebaseEnabled = authStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL
          return firebaseEnabled;
        } catch (error) {
          console.error('Error checking Firebase messaging permission:', error);
          // Return true if Firebase check fails since we don't need to check vibration
          return true;
        }
      }

      return true; // Vibration permission is always available as it's declared in AndroidManifest.xml
    }

    // For iOS, check Firebase messaging permission
    if (messaging) {
      try {
        const authStatus = await messaging().hasPermission();
        return authStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL
      } catch (error) {
        console.error('Error checking Firebase messaging permission:', error);
        return false;
      }
    } else {
      console.warn('Firebase messaging not available - cannot check push notification permissions');
      return false;
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

  // For iOS, check if we can request location permissions
  // iOS permissions are handled through Info.plist and system prompts
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

  // For iOS, we can't directly check permission status without requesting
  // Return true as default - the system will handle permission prompts
  return { fineLocation: true, backgroundLocation: true };
};
