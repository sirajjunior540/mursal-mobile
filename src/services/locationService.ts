import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { apiService } from './api';

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
  private updateInterval: number = 5000; // 5 seconds

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
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Start tracking location
   */
  async startLocationTracking(): Promise<void> {
    if (this.isTracking) {
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

    this.isTracking = true;

    this.watchId = Geolocation.watchPosition(
      async (position) => {
        const location: LocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        // Throttle location updates to avoid too many API calls
        const now = Date.now();
        if (now - this.lastLocationUpdate >= this.updateInterval) {
          try {
            await this.updateLocationOnServer(location);
            this.lastLocationUpdate = now;
          } catch (error) {
            console.error('Failed to update location on server:', error);
          }
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        // Don't stop tracking for minor errors, but log them
        if (error.code === 1) { // PERMISSION_DENIED
          this.stopLocationTracking();
          Alert.alert(
            'Location Access Denied',
            'Please enable location services to continue tracking.',
            [{ text: 'OK' }]
          );
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: this.updateInterval,
        fastestInterval: 3000, // Fastest update interval
      }
    );
  }

  /**
   * Stop tracking location
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Update location on server
   */
  private async updateLocationOnServer(location: LocationCoords): Promise<void> {
    try {
      const response = await apiService.updateLocation(
        location.latitude,
        location.longitude
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location on server:', error);
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