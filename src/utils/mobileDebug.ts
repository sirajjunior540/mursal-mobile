/**
 * Mobile Debug Utilities
 * Provides debugging tools for mobile app troubleshooting
 */

import { apiService } from '../services/api';
import { locationService } from '../services/locationService';

// Global debug object for easy access in React Native debugger
(global as any).MobileDebug = {
  
  /**
   * Run comprehensive diagnostic for mobile order issues
   */
  async diagnoseMobileOrderIssue() {
    console.log('🔍 Starting mobile order diagnostic...');
    await apiService.diagnoseMobileOrderIssue();
  },

  /**
   * Quick status check for immediate debugging
   */
  async quickStatusCheck() {
    console.log('⚡ === QUICK STATUS CHECK ===');
    
    try {
      // Check driver profile
      const driverProfile = await apiService.getDriverProfile();
      console.log('👤 Driver Status:', {
        online: driverProfile.data?.isOnline,
        available: driverProfile.data?.isAvailable,
        name: driverProfile.data?.name,
        id: driverProfile.data?.id,
        current_latitude: driverProfile.data?.current_latitude,
        current_longitude: driverProfile.data?.current_longitude,
        last_location_update: driverProfile.data?.last_location_update
      });

      // Check location
      const location = await locationService.getCurrentLocation();
      console.log('📍 Current Location:', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      // Test location update
      const locationUpdate = await apiService.updateLocation(location.latitude, location.longitude);
      console.log('✅ Location update response:', locationUpdate);

      // Check available orders with full response
      const orders = await apiService.getAvailableOrdersWithDistance();
      console.log('📦 Available Orders Response:', {
        success: orders.success,
        dataLength: orders.data?.length || 0,
        error: orders.error,
        fullResponse: orders
      });

      if (orders.data?.length === 0) {
        console.log('❌ No orders found - debugging steps:');
        console.log('  1. Check if driver is online/available:', driverProfile.data?.isOnline, driverProfile.data?.isAvailable);
        console.log('  2. Check if location was updated:', locationUpdate.success ? '✅' : '❌');
        console.log('  3. Check backend location vs mobile location:');
        console.log('     Backend:', driverProfile.data?.current_latitude, driverProfile.data?.current_longitude);
        console.log('     Mobile:', location.latitude, location.longitude);
        console.log('  4. Check if orders exist in backend for this area');
        console.log('  5. Check backend filtering logic');
        
        // Additional debug info
        console.log('\n🔍 ADDITIONAL DEBUG INFO:');
        console.log('Location tracking active:', locationService.isLocationTracking());
        console.log('Driver context status:', driverProfile.data);
      }

    } catch (error) {
      console.error('❌ Quick status check failed:', error);
    }
    
    console.log('⚡ === END QUICK CHECK ===');
  },

  /**
   * Force location update
   */
  async forceLocationUpdate() {
    console.log('⚡ Forcing location update...');
    const result = await locationService.forceLocationUpdate();
    console.log('Location update result:', result);
    return result;
  },

  /**
   * Check location service status
   */
  getLocationStatus() {
    const status = {
      isTracking: locationService.isLocationTracking(),
    };
    console.log('📍 Location service status:', status);
    return status;
  },

  /**
   * Test API endpoints
   */
  async testApiEndpoints() {
    console.log('🧪 Testing API endpoints...');
    
    try {
      // Test driver profile
      const driverProfile = await apiService.getDriverProfile();
      console.log('Driver profile:', driverProfile);
      
      // Test available orders
      const availableOrders = await apiService.getAvailableOrdersWithDistance();
      console.log('Available orders:', availableOrders);
      
      // Test polling endpoint
      const pollingResult = await apiService.testPollingEndpoint();
      console.log('Polling test:', pollingResult);
      
    } catch (error) {
      console.error('API test error:', error);
    }
  },

  /**
   * Start location tracking
   */
  async startLocationTracking() {
    console.log('🚀 Starting location tracking...');
    await locationService.startLocationTracking();
  },

  /**
   * Stop location tracking
   */
  stopLocationTracking() {
    console.log('🛑 Stopping location tracking...');
    locationService.stopLocationTracking();
  },

  /**
   * Get current location
   */
  async getCurrentLocation() {
    console.log('📍 Getting current location...');
    try {
      const location = await locationService.getCurrentLocation();
      console.log('Current location:', location);
      return location;
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  },

  /**
   * Check backend order queue and filtering logic
   */
  async checkOrderQueueStatus() {
    console.log('🔍 === ORDER QUEUE STATUS CHECK ===');
    
    try {
      // 1. Check driver profile with detailed location info
      const driverProfile = await apiService.getDriverProfile();
      console.log('👤 Driver Profile:', {
        id: driverProfile.data?.id,
        name: driverProfile.data?.name,
        isOnline: driverProfile.data?.isOnline,
        isAvailable: driverProfile.data?.isAvailable,
        current_latitude: driverProfile.data?.current_latitude,
        current_longitude: driverProfile.data?.current_longitude,
        last_location_update: driverProfile.data?.last_location_update
      });

      // 2. Get current mobile location
      const mobileLocation = await locationService.getCurrentLocation();
      console.log('📱 Mobile Location:', {
        latitude: mobileLocation.latitude,
        longitude: mobileLocation.longitude,
        accuracy: mobileLocation.accuracy
      });

      // 3. Force location update and check response
      console.log('⚡ Forcing location update...');
      const locationUpdateResult = await apiService.updateLocation(
        mobileLocation.latitude, 
        mobileLocation.longitude
      );
      console.log('📍 Location Update Result:', locationUpdateResult);

      // 4. Check available orders endpoint with detailed logging
      console.log('🔍 Checking available orders...');
      const ordersResponse = await apiService.getAvailableOrdersWithDistance();
      console.log('📦 Orders Response:', {
        success: ordersResponse.success,
        dataLength: ordersResponse.data?.length || 0,
        error: ordersResponse.error,
        statusCode: ordersResponse.statusCode,
        fullData: ordersResponse.data
      });

      // 5. Analysis and recommendations
      if (ordersResponse.data?.length === 0) {
        console.log('\n❌ ANALYSIS: No orders returned');
        console.log('Possible causes:');
        
        // Check driver status
        if (!driverProfile.data?.isOnline) {
          console.log('  ❌ Driver is OFFLINE - this is likely the issue!');
        } else {
          console.log('  ✅ Driver is online');
        }
        
        if (!driverProfile.data?.isAvailable) {
          console.log('  ❌ Driver is NOT AVAILABLE - this could be the issue!');
        } else {
          console.log('  ✅ Driver is available');
        }

        // Check location sync
        const backendLat = parseFloat(driverProfile.data?.current_latitude || '0');
        const backendLng = parseFloat(driverProfile.data?.current_longitude || '0');
        const mobileLat = mobileLocation.latitude;
        const mobileLng = mobileLocation.longitude;
        
        const locationMismatch = Math.abs(backendLat - mobileLat) > 0.001 || 
                                Math.abs(backendLng - mobileLng) > 0.001;
        
        if (locationMismatch) {
          console.log('  ⚠️ Location mismatch between backend and mobile:');
          console.log(`     Backend: ${backendLat}, ${backendLng}`);
          console.log(`     Mobile: ${mobileLat}, ${mobileLng}`);
        } else {
          console.log('  ✅ Location sync appears correct');
        }

        console.log('\n🔧 NEXT STEPS:');
        console.log('  1. Check if orders exist in backend admin panel');
        console.log('  2. Check backend filtering logic in available_orders view');
        console.log('  3. Check backend logs for order filtering decisions');
        console.log('  4. Verify delivery area/radius settings');
        console.log('  5. Check if orders are assigned to specific drivers');
      } else {
        console.log(`✅ Found ${ordersResponse.data.length} orders`);
      }

    } catch (error) {
      console.error('❌ Order queue check failed:', error);
    }
    
    console.log('🔍 === END ORDER QUEUE CHECK ===');
  },

  /**
   * Helper to show instructions
   */
  /**
   * Test location-based order fetching
   */
  async testLocationOrderFetch() {
    console.log('🧪 === TESTING LOCATION-BASED ORDER FETCH ===');
    
    try {
      // 1. Get current location
      const location = await locationService.getCurrentLocation();
      console.log('📍 Current Location:', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });
      
      // 2. Test direct API call with location
      console.log('🔗 Testing direct API with location...');
      const url = `/api/v1/delivery/deliveries/available_orders/?latitude=${location.latitude}&longitude=${location.longitude}`;
      console.log('URL:', url);
      
      // Direct API call (need to use full URL with base)
      const baseUrl = 'http://192.168.1.153:8000'; // TODO: Use ENV.API_BASE_URL
      const fullUrl = `${baseUrl}${url}`;
      console.log('Full URL:', fullUrl);
      
      // Use fetch directly to test
      try {
        const token = await apiService.getAuthToken();
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        console.log('📦 Direct Fetch Response:', {
          status: response.status,
          ok: response.ok,
          dataLength: data?.length || 0,
          data: data
        });
      } catch (fetchError) {
        console.error('Direct fetch error:', fetchError);
      }
      
      // 3. Test through service method
      console.log('🔄 Testing through service method...');
      const serviceResponse = await apiService.getAvailableOrdersWithDistance();
      console.log('📦 Service Method Response:', {
        success: serviceResponse.success,
        dataLength: serviceResponse.data?.length || 0,
        error: serviceResponse.error
      });
      
      if (serviceResponse.data && serviceResponse.data.length > 0) {
        console.log('✅ Orders received with location!');
        serviceResponse.data.forEach((order, index) => {
          console.log(`  Order ${index + 1}:`, {
            id: order.id,
            customer: order.customer?.name,
            address: order.deliveryAddress,
            status: order.status
          });
        });
      } else {
        console.log('❌ No orders returned - check backend logs');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
    
    console.log('🧪 === END LOCATION ORDER FETCH TEST ===');
  },

  showInstructions() {
    console.log(`
🔍 Mobile Debug Instructions:
==========================================

In React Native Debugger console, use:

• MobileDebug.diagnoseMobileOrderIssue() - Run full diagnostic
• MobileDebug.quickStatusCheck() - Quick status check
• MobileDebug.checkOrderQueueStatus() - Check order queue and filtering
• MobileDebug.testLocationOrderFetch() - Test location-based order fetching
• MobileDebug.forceLocationUpdate() - Force location update
• MobileDebug.getLocationStatus() - Check location service
• MobileDebug.testApiEndpoints() - Test API calls
• MobileDebug.startLocationTracking() - Start location tracking
• MobileDebug.stopLocationTracking() - Stop location tracking
• MobileDebug.getCurrentLocation() - Get current location

==========================================
    `);
  }
};

// Show instructions on load
console.log('🔧 Mobile Debug utilities loaded! Use MobileDebug.showInstructions() for help');

export default (global as any).MobileDebug;