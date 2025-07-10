import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert, AppState, AppStateStatus } from 'react-native';
import { apiService } from './api';
import { checkLocationPermissions } from '../utils/permissions';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private lastLocationUpdate: number = 0;
  private updateInterval: number = 10000; // 10 seconds (more conservative)
  private backgroundUpdateInterval: number = 30000; // 30 seconds in background
  private forceUpdateInterval: number = 60000; // Force update every minute regardless of movement
  private isInBackground: boolean = false;
  private appStateSubscription: any = null;
  private permissionCheckInterval: any = null;
  private forceUpdateTimer: any = null;

  /**
   * Request location permissions
   */
  async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to track deliveries.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // Also request background location if available
          if (PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: 'Background Location Permission',
                message: 'Allow location access while app is in background for continuous tracking.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );
          }
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  /**
   * Get current location
   */
  getCurrentLocation(): Promise<LocationCoords> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject({
            code: error.code,
            message: error.message,
          });
        },
        {
          enableHighAccuracy: false, // Try without high accuracy first
          timeout: 30000, // Increase timeout to 30 seconds
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Initialize location service with app state monitoring
   */
  async initialize(): Promise<void> {
    console.log('🏁 Initializing LocationService...');
    
    // Set up app state monitoring
    this.setupAppStateMonitoring();
    
    // Check permissions periodically
    this.setupPermissionMonitoring();
    
    console.log('✅ LocationService initialized');
  }

  /**
   * Set up app state monitoring for background/foreground transitions
   */
  private setupAppStateMonitoring(): void {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed: ${AppState.currentState} -> ${nextAppState}`);
      
      if (nextAppState === 'background') {
        this.isInBackground = true;
        this.adjustTrackingForBackground();
      } else if (nextAppState === 'active') {
        this.isInBackground = false;
        this.adjustTrackingForForeground();
      }
    };

    this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }

  /**
   * Set up periodic permission checking
   */
  private setupPermissionMonitoring(): void {
    // Check permissions every 5 minutes
    this.permissionCheckInterval = setInterval(async () => {
      const permissions = await checkLocationPermissions();
      
      if (!permissions.fineLocation && this.isTracking) {
        console.log('⚠️ Location permission lost, stopping tracking');
        this.stopLocationTracking();
        
        Alert.alert(
          'Location Permission Lost',
          'Location tracking has been disabled. Please re-enable location permissions to continue tracking.',
          [{ text: 'OK' }]
        );
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Adjust tracking settings for background mode
   */
  private adjustTrackingForBackground(): void {
    if (this.isTracking) {
      console.log('🔄 Adjusting location tracking for background mode');
      // Restart tracking with longer intervals for battery optimization
      this.stopLocationTracking();
      this.startLocationTrackingInternal(this.backgroundUpdateInterval);
    }
  }

  /**
   * Adjust tracking settings for foreground mode
   */
  private adjustTrackingForForeground(): void {
    if (this.isTracking) {
      console.log('🔄 Adjusting location tracking for foreground mode');
      // Restart tracking with normal intervals
      this.stopLocationTracking();
      this.startLocationTrackingInternal(this.updateInterval);
    }
  }

  /**
   * Start tracking location
   */
  async startLocationTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('📍 Location tracking already active');
      return;
    }

    const hasPermission = await this.requestLocationPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Location permission is required for delivery tracking.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('🎯 Starting location tracking...');
    this.isTracking = true;
    
    const interval = this.isInBackground ? this.backgroundUpdateInterval : this.updateInterval;
    await this.startLocationTrackingInternal(interval);
    
    // Start forced update timer as backup
    this.startForceUpdateTimer();
  }

  /**
   * Internal method to start location tracking with specific interval
   */
  private async startLocationTrackingInternal(updateInterval: number): Promise<void> {

    // Get initial location immediately
    try {
      console.log('📍 Getting initial location...');
      const initialLocation = await this.getCurrentLocation();
      await this.updateLocationOnServer(initialLocation);
      this.lastLocationUpdate = Date.now();
      console.log(`✅ Initial location: ${initialLocation.latitude}, ${initialLocation.longitude}`);
    } catch (error) {
      console.warn('⚠️ Failed to get initial location:', error);
    }

    this.watchId = Geolocation.watchPosition(
      async (position) => {
        const location: LocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        console.log(`📍 Location update: ${location.latitude}, ${location.longitude} (accuracy: ${location.accuracy}m)`);

        // Always try to update location, with both time and distance checks
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastLocationUpdate;
        
        // Update if enough time has passed OR if this is a forced update
        const shouldUpdate = (
          timeSinceLastUpdate >= updateInterval || 
          timeSinceLastUpdate >= this.forceUpdateInterval
        );
        
        if (shouldUpdate) {
          try {
            console.log(`🚀 Attempting location update (${timeSinceLastUpdate}ms since last)`);
            await this.updateLocationOnServer(location);
            this.lastLocationUpdate = now;
            console.log(`✅ Location sent to server at ${new Date().toLocaleTimeString()}`);
          } catch (error) {
            console.error('❌ Failed to update location on server:', error);
            // Still update lastLocationUpdate to avoid spam retries
            this.lastLocationUpdate = now;
          }
        } else {
          console.log(`⏱️ Skipping location update (${timeSinceLastUpdate}ms < ${updateInterval}ms)`);
        }
      },
      (error) => {
        console.error('❌ Location tracking error:', error);
        
        // Handle different error codes
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            this.stopLocationTracking();
            Alert.alert(
              'Location Access Denied',
              'Please enable location services to continue tracking.',
              [{ text: 'OK' }]
            );
            break;
          case 2: // POSITION_UNAVAILABLE
            console.warn('⚠️ Location unavailable, continuing to try...');
            break;
          case 3: // TIMEOUT
            console.warn('⚠️ Location timeout, continuing to try...');
            break;
          default:
            console.warn('⚠️ Unknown location error, continuing to try...');
        }
      },
      {
        enableHighAccuracy: false, // Start with low accuracy for faster fix
        distanceFilter: this.isInBackground ? 50 : 10, // Less frequent updates in background
        interval: updateInterval,
        fastestInterval: Math.min(updateInterval / 2, 3000),
        timeout: 30000, // Increase timeout to 30 seconds
        maximumAge: 10000,
      }
    );
    
    console.log(`🎯 Location tracking started with ${updateInterval}ms interval`);
  }

  /**
   * Stop tracking location
   */
  stopLocationTracking(): void {
    console.log('🛑 Stopping location tracking...');
    
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.stopForceUpdateTimer();
    this.isTracking = false;
    
    console.log('✅ Location tracking stopped');
  }
  
  /**
   * Start the forced update timer (backup to ensure regular updates)
   */
  private startForceUpdateTimer(): void {
    console.log('🕒 Starting forced update timer (every 2 minutes)');
    
    this.forceUpdateTimer = setInterval(async () => {
      if (this.isTracking) {
        console.log('🔄 Forced update timer triggered');
        try {
          await this.forceLocationUpdate();
        } catch (error) {
          console.error('⚠️ Forced update timer error:', error);
        }
      }
    }, 120000); // Every 2 minutes
  }
  
  /**
   * Stop the forced update timer
   */
  private stopForceUpdateTimer(): void {
    if (this.forceUpdateTimer) {
      console.log('🛑 Stopping forced update timer');
      clearInterval(this.forceUpdateTimer);
      this.forceUpdateTimer = null;
    }
  }
  
  /**
   * Cleanup method to call when app is being destroyed
   */
  cleanup(): void {
    console.log('🧹 Cleaning up LocationService...');
    
    this.stopLocationTracking();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.permissionCheckInterval) {
      clearInterval(this.permissionCheckInterval);
      this.permissionCheckInterval = null;
    }
    
    this.stopForceUpdateTimer();
    
    console.log('✅ LocationService cleanup complete');
  }

  /**
   * Update location on server
   */
  private async updateLocationOnServer(location: LocationCoords): Promise<void> {
    try {
      console.log(`🌍 Sending location to server: ${location.latitude}, ${location.longitude}`);
      
      const response = await apiService.updateLocation(
        location.latitude,
        location.longitude
      );

      if (response.success) {
        console.log('✅ Location successfully sent to server');
        
        // Log successful location update with timestamp
        console.log(`📍 Location update successful at ${new Date().toLocaleTimeString()}`);
        
      } else {
        console.error('❌ Server rejected location update:', response.error);
        
        // If location update fails due to auth, try to refresh
        if (response.error?.includes('auth') || response.error?.includes('token')) {
          console.log('🔄 Location update failed due to auth - may need token refresh');
        }
        
        throw new Error(response.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('💥 Error updating location on server:', error);
      
      // Don't throw for network errors to avoid stopping location tracking
      if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          console.log('🔄 Network error, will retry on next update');
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get tracking status
   */
  isLocationTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Set update interval
   */
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = Math.max(intervalMs, 1000); // Minimum 1 second
  }
  
  /**
   * Force an immediate location update (for testing)
   */
  async forceLocationUpdate(): Promise<boolean> {
    console.log('⚡ Forcing immediate location update...');
    
    try {
      const location = await this.getCurrentLocation();
      console.log(`📍 Got location: ${location.latitude}, ${location.longitude}`);
      
      await this.updateLocationOnServer(location);
      this.lastLocationUpdate = Date.now();
      
      console.log('✅ Force location update successful');
      return true;
    } catch (error) {
      console.error('❌ Force location update failed:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

export const locationService = new LocationService();