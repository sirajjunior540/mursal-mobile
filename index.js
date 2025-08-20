/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Import Firebase messaging for background handler
import messaging from '@react-native-firebase/messaging';

// Register background handler before app registration
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Background] Message received:', remoteMessage);
  
  // Store FCM token globally for use after app starts
  if (remoteMessage.from) {
    try {
      const token = await messaging().getToken();
      if (token) {
        global.fcmToken = token;
      }
    } catch (error) {
      console.error('[Background] Error getting FCM token:', error);
    }
  }
  
  // Process the notification data
  if (remoteMessage.data) {
    const { type, order, orderId } = remoteMessage.data;
    
    if (type === 'new_order' || orderId) {
      // Store the notification data to be processed when app opens
      global.pendingNotification = {
        type: type || 'new_order',
        order: typeof order === 'string' ? JSON.parse(order) : order,
        orderId,
        receivedAt: new Date().toISOString()
      };
    }
  }
  
  // Return a promise to acknowledge message processing
  return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
