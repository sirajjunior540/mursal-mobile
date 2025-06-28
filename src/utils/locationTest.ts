import { locationService } from '../services/locationService';
import { apiService } from '../services/api';
import { realtimeService } from '../services/realtimeService';
import { soundService } from '../services/soundService';
import { Vibration, Platform } from 'react-native';

/**
 * Manual test function to debug location tracking
 * Call this from the mobile app console to test location functionality
 */
export const testLocationTracking = async () => {
  console.log('🧪 Starting location tracking test...');
  
  try {
    // Test 1: Check if location service is tracking
    const isTracking = locationService.isLocationTracking();
    console.log(`📍 Location service tracking: ${isTracking}`);
    
    // Test 2: Request permissions
    console.log('🔐 Testing location permissions...');
    const hasPermissions = await locationService.requestLocationPermissions();
    console.log(`✅ Location permissions: ${hasPermissions}`);
    
    if (!hasPermissions) {
      console.error('❌ Location permissions not granted');
      return;
    }
    
    // Test 3: Get current location
    console.log('📍 Getting current location...');
    try {
      const currentLocation = await locationService.getCurrentLocation();
      console.log(`📍 Current location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
      
      // Test 4: Update location on server
      console.log('🌐 Testing server location update...');
      const updateResult = await apiService.updateLocation(
        currentLocation.latitude, 
        currentLocation.longitude
      );
      
      if (updateResult.success) {
        console.log('✅ Location update successful');
      } else {
        console.error('❌ Location update failed:', updateResult.error);
      }
      
    } catch (locationError) {
      console.error('❌ Failed to get current location:', locationError);
    }
    
    // Test 5: Start tracking if not already started
    if (!isTracking) {
      console.log('🚀 Starting location tracking...');
      await locationService.startLocationTracking();
      console.log('✅ Location tracking started');
    }
    
    console.log('✅ Location tracking test completed');
    
  } catch (error) {
    console.error('💥 Location tracking test failed:', error);
  }
};

/**
 * Force a location update right now
 */
export const forceLocationUpdate = async () => {
  console.log('⚡ Forcing immediate location update...');
  
  try {
    const location = await locationService.getCurrentLocation();
    console.log(`📍 Got location: ${location.latitude}, ${location.longitude}`);
    
    const result = await apiService.updateLocation(location.latitude, location.longitude);
    
    if (result.success) {
      console.log('✅ Force update successful');
    } else {
      console.error('❌ Force update failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Force update error:', error);
  }
};

/**
 * Test order polling functionality
 */
export const testOrderPolling = async () => {
  console.log('📎 Testing order polling...');
  
  try {
    // Test direct API call
    console.log('🔄 Testing direct API call to available_orders...');
    const ordersResponse = await apiService.pollNewOrders();
    
    if (ordersResponse.success) {
      console.log(`✅ API call successful: ${ordersResponse.data.length} orders found`);
      ordersResponse.data.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.customer.name} - $${order.total}`);
      });
    } else {
      console.error('❌ API call failed:', ordersResponse.error);
    }
    
    // Test realtime service status
    console.log('🔗 Checking realtime service status...');
    const isRunning = realtimeService.isRunning();
    const isConnected = realtimeService.isConnectedToServer();
    const config = realtimeService.getConfig();
    
    console.log(`  - Service running: ${isRunning}`);
    console.log(`  - Connected: ${isConnected}`);
    console.log(`  - Mode: ${config.mode}`);
    console.log(`  - Enabled: ${config.enabled}`);
    console.log(`  - Polling interval: ${config.pollingInterval}ms`);
    
  } catch (error) {
    console.error('💥 Order polling test failed:', error);
  }
};

/**
 * Test notification and vibration
 */
export const testNotifications = async () => {
  console.log('🔔 Testing notifications and vibration...');
  
  try {
    // Test vibration directly
    console.log('📳 Testing direct vibration...');
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 200, 100, 300, 100, 200]);
    } else {
      Vibration.vibrate();
    }
    console.log('✅ Direct vibration triggered');
    
    // Test sound service
    console.log('🔊 Testing sound service...');
    soundService.playOrderNotification();
    console.log('✅ Sound service notification triggered');
    
    // Test different sound types
    setTimeout(() => {
      console.log('🔊 Testing success sound...');
      soundService.playSuccessSound();
    }, 2000);
    
    setTimeout(() => {
      console.log('🔊 Testing error sound...');
      soundService.playErrorSound();
    }, 4000);
    
  } catch (error) {
    console.error('💥 Notification test failed:', error);
  }
};

/**
 * Debug order tracking in realtime service
 */
export const debugOrderTracking = () => {
  console.log('🔍 Debugging order tracking...');
  
  const stats = realtimeService.getOrderTrackingStats();
  console.log(`📊 Order tracking stats:`);
  console.log(`  - Seen orders: ${stats.seen}`);
  console.log(`  - Notified orders: ${stats.notified}`);
  console.log(`  - Seen IDs: ${stats.seenIds.join(', ')}`);
  console.log(`  - Notified IDs: ${stats.notifiedIds.join(', ')}`);
};

/**
 * Clear order tracking (useful for testing)
 */
export const clearOrderTracking = () => {
  console.log('🧹 Clearing order tracking...');
  realtimeService.clearOrderTracking();
  console.log('✅ Order tracking cleared');
};

/**
 * Disable vibration for testing
 */
export const disableVibration = () => {
  console.log('🔇 Disabling vibration...');
  soundService.updateConfig({ vibration: false });
  console.log('✅ Vibration disabled');
};

/**
 * Enable vibration
 */
export const enableVibration = () => {
  console.log('📳 Enabling vibration...');
  soundService.updateConfig({ vibration: true });
  console.log('✅ Vibration enabled');
};

// Make functions available globally for debugging
if (__DEV__) {
  // @ts-ignore
  global.testLocationTracking = testLocationTracking;
  // @ts-ignore
  global.forceLocationUpdate = forceLocationUpdate;
  // @ts-ignore
  global.testOrderPolling = testOrderPolling;
  // @ts-ignore
  global.testNotifications = testNotifications;
  // @ts-ignore
  global.debugOrderTracking = debugOrderTracking;
  // @ts-ignore
  global.clearOrderTracking = clearOrderTracking;
  // @ts-ignore
  global.disableVibration = disableVibration;
  // @ts-ignore
  global.enableVibration = enableVibration;
  
  console.log('🔧 Debug functions available:');
  console.log('  - testLocationTracking()');
  console.log('  - forceLocationUpdate()');
  console.log('  - testOrderPolling()');
  console.log('  - testNotifications()');
  console.log('  - debugOrderTracking()');
  console.log('  - clearOrderTracking()');
  console.log('  - disableVibration()');
  console.log('  - enableVibration()');
}