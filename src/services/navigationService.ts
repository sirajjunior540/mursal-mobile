/**
 * Centralized Navigation Service
 * Handles all map navigation, route calculation, and location-based operations
 */

import { Alert, Linking, Platform } from 'react-native';

export interface NavigationDestination {
  latitude?: number;
  longitude?: number;
  address?: string;
  name?: string;
}

export interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
  coordinates: Array<{ latitude: number; longitude: number }>; // coordinate pairs for React Native Maps
}

export interface NavigationOptions {
  preferredApp?: 'system' | 'google' | 'waze' | 'apple';
  showConfirmation?: boolean;
  fallbackToAddress?: boolean;
}

class NavigationService {
  /**
   * Navigate to a destination using the best available method
   */
  async navigateToDestination(
    destination: NavigationDestination,
    options: NavigationOptions = {}
  ): Promise<boolean> {
    const {
      preferredApp = 'system',
      showConfirmation = false,
      fallbackToAddress = true,
    } = options;

    try {
      console.log('🧭 Navigating to destination:', destination);

      // Validate destination
      if (!this.isValidDestination(destination)) {
        throw new Error('Invalid destination: Missing coordinates or address');
      }

      // Try coordinates first, then fall back to address
      let navigationUrl: string | null = null;

      if (destination.latitude && destination.longitude) {
        navigationUrl = this.buildCoordinateUrl(
          destination.latitude,
          destination.longitude,
          preferredApp
        );
      } else if (fallbackToAddress && destination.address) {
        navigationUrl = this.buildAddressUrl(destination.address, preferredApp);
      }

      if (!navigationUrl) {
        throw new Error('Could not generate navigation URL');
      }

      if (showConfirmation) {
        return new Promise((resolve) => {
          Alert.alert(
            'Navigate to Destination',
            `Open ${this.getAppName(preferredApp)} to navigate to ${destination.name || destination.address || 'location'}?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Navigate',
                onPress: async () => {
                  const success = await this.openUrl(navigationUrl!);
                  resolve(success);
                },
              },
            ]
          );
        });
      } else {
        return await this.openUrl(navigationUrl);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Navigation Error', error instanceof Error ? error.message : 'Unable to open navigation');
      return false;
    }
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<RouteInfo | null> {
    try {
      console.log('📏 Calculating route...');

      // Simple straight-line route calculation
      const distance = this.calculateHaversineDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );

      return {
        distance,
        duration: this.estimateDrivingTime(distance),
        coordinates: [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude },
        ],
      };
    } catch (error) {
      console.error('❌ Route calculation error:', error);
      return null;
    }
  }

  /**
   * Get optimized route for multiple destinations
   */
  async getOptimizedRoute(
    origin: { latitude: number; longitude: number },
    destinations: Array<{ latitude: number; longitude: number; id: string }>
  ): Promise<{
    route: RouteInfo;
    optimizedOrder: string[];
  } | null> {
    try {
      console.log('🔄 Calculating optimized route for multiple destinations...');

      // Simple nearest-neighbor optimization
      const optimizedOrder = this.simpleRouteOptimization(origin, destinations);
      
      // Calculate total distance for optimized route
      let totalDistance = 0;
      let currentPoint = origin;
      const routeCoordinates = [{ latitude: origin.latitude, longitude: origin.longitude }];

      for (const destId of optimizedOrder) {
        const dest = destinations.find(d => d.id === destId);
        if (dest) {
          totalDistance += this.calculateHaversineDistance(
            currentPoint.latitude,
            currentPoint.longitude,
            dest.latitude,
            dest.longitude
          );
          routeCoordinates.push({ latitude: dest.latitude, longitude: dest.longitude });
          currentPoint = dest;
        }
      }

      return {
        route: {
          distance: totalDistance,
          duration: this.estimateDrivingTime(totalDistance),
          coordinates: routeCoordinates,
        },
        optimizedOrder,
      };
    } catch (error) {
      console.error('❌ Optimized route calculation error:', error);
      return null;
    }
  }

  /**
   * Check if device can handle navigation
   */
  async checkNavigationCapability(): Promise<{
    canNavigate: boolean;
    availableApps: string[];
  }> {
    const apps = ['google', 'apple', 'waze'];
    const availableApps: string[] = [];

    for (const app of apps) {
      const url = this.buildCoordinateUrl(0, 0, app as any);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        availableApps.push(app);
      }
    }

    return {
      canNavigate: availableApps.length > 0,
      availableApps,
    };
  }

  /**
   * Private helper methods
   */
  private isValidDestination(destination: NavigationDestination): boolean {
    const hasCoordinates = destination.latitude && destination.longitude;
    const hasAddress = destination.address && destination.address.trim().length > 0;
    return !!(hasCoordinates || hasAddress);
  }

  private buildCoordinateUrl(
    latitude: number,
    longitude: number,
    app: string
  ): string {
    switch (app) {
      case 'google':
        return `google.navigation:q=${latitude},${longitude}&mode=d`;
      case 'apple':
        return `maps://app?daddr=${latitude},${longitude}&dirflg=d`;
      case 'waze':
        return `waze://ul?ll=${latitude},${longitude}&navigate=yes`;
      default:
        // System default
        return Platform.select({
          ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
          android: `google.navigation:q=${latitude},${longitude}&mode=d`,
          default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        }) || '';
    }
  }

  private buildAddressUrl(address: string, app: string): string {
    const encodedAddress = encodeURIComponent(address);
    
    switch (app) {
      case 'google':
        return `google.navigation:q=${encodedAddress}&mode=d`;
      case 'apple':
        return `maps://app?q=${encodedAddress}`;
      case 'waze':
        return `waze://ul?q=${encodedAddress}&navigate=yes`;
      default:
        return Platform.select({
          ios: `maps://app?q=${encodedAddress}`,
          android: `geo:0,0?q=${encodedAddress}`,
          default: `https://maps.google.com/?q=${encodedAddress}`,
        }) || '';
    }
  }

  private async openUrl(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        throw new Error('Cannot open navigation app');
      }
    } catch (error) {
      console.error('❌ Error opening URL:', error);
      return false;
    }
  }

  private getAppName(app: string): string {
    const names = {
      google: 'Google Maps',
      apple: 'Apple Maps',
      waze: 'Waze',
      system: Platform.OS === 'ios' ? 'Maps' : 'Google Maps',
    };
    
    return names[app as keyof typeof names] || 'Maps';
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private estimateDrivingTime(distanceKm: number): number {
    // Estimate driving time based on average city speed (30 km/h)
    return (distanceKm / 30) * 60; // Convert to minutes
  }

  private simpleRouteOptimization(
    origin: { latitude: number; longitude: number },
    destinations: Array<{ latitude: number; longitude: number; id: string }>
  ): string[] {
    const unvisited = [...destinations];
    const optimizedOrder: string[] = [];
    let currentPoint = origin;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Number.MAX_VALUE;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateHaversineDistance(
          currentPoint.latitude,
          currentPoint.longitude,
          unvisited[i].latitude,
          unvisited[i].longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = unvisited.splice(nearestIndex, 1)[0];
      optimizedOrder.push(nearest.id);
      currentPoint = nearest;
    }

    return optimizedOrder;
  }
}

// Export singleton instance
export const navigationService = new NavigationService();
export default navigationService;