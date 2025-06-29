import { Platform, Linking } from 'react-native';
import { getMapboxToken } from '../config/environment';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DirectionsResponse {
  routes: Array<{
    geometry: {
      coordinates: number[][];
    };
    distance: number;
    duration: number;
  }>;
}

export interface MapboxRouteOptions {
  profile?: 'driving' | 'walking' | 'cycling';
  overview?: 'full' | 'simplified' | 'false';
  geometries?: 'geojson' | 'polyline';
  steps?: boolean;
}

class MapboxService {
  private accessToken: string;
  private baseUrl = 'https://api.mapbox.com';

  constructor() {
    this.accessToken = getMapboxToken();
    
    if (!this.accessToken) {
      console.warn('⚠️ Mapbox access token not configured');
    } else {
      console.log('✅ Mapbox service initialized with token:', `${this.accessToken.substring(0, 20)}...`);
    }
  }

  /**
   * Get access token for use in components
   */
  public getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Check if Mapbox is properly configured
   */
  public isConfigured(): boolean {
    return !!this.accessToken && this.accessToken.length > 0;
  }

  /**
   * Get directions between two points using Mapbox Directions API
   */
  public async getDirections(
    origin: Coordinates,
    destination: Coordinates,
    options: MapboxRouteOptions = {}
  ): Promise<DirectionsResponse | null> {
    if (!this.isConfigured()) {
      console.error('❌ Mapbox not configured - cannot get directions');
      return null;
    }

    const {
      profile = 'driving',
      overview = 'full',
      geometries = 'geojson',
      steps = true
    } = options;

    try {
      const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const url = `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordinates}`;
      
      const params = new URLSearchParams({
        access_token: this.accessToken,
        overview,
        geometries,
        steps: steps.toString(),
      });

      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        console.log('✅ Mapbox directions retrieved successfully');
        return data;
      } else {
        console.warn('⚠️ No routes found from Mapbox');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get directions from Mapbox:', error);
      return null;
    }
  }

  /**
   * Open navigation in external map app with fallback to Mapbox
   */
  public async openNavigation(
    destination: Coordinates,
    origin?: Coordinates,
    label?: string
  ): Promise<boolean> {
    try {
      const destinationString = `${destination.latitude},${destination.longitude}`;
      const originString = origin ? `${origin.latitude},${origin.longitude}` : '';
      
      // Try platform-specific navigation apps first
      let navigationUrl: string;
      
      if (Platform.OS === 'ios') {
        // Try Apple Maps first
        navigationUrl = origin 
          ? `maps://app?saddr=${originString}&daddr=${destinationString}&dirflg=d`
          : `maps://app?daddr=${destinationString}&dirflg=d`;
      } else {
        // Try Google Maps navigation on Android
        navigationUrl = origin
          ? `google.navigation:q=${destinationString}&mode=d&avoid=tolls`
          : `google.navigation:q=${destinationString}&mode=d`;
      }

      console.log('🗺️ Attempting to open navigation:', navigationUrl);
      
      const canOpen = await Linking.canOpenURL(navigationUrl);
      if (canOpen) {
        await Linking.openURL(navigationUrl);
        console.log('✅ Opened platform navigation app');
        return true;
      }

      // Fallback to web-based navigation
      const fallbackUrl = this.generateWebNavigationUrl(destination, origin, label);
      await Linking.openURL(fallbackUrl);
      console.log('✅ Opened web navigation as fallback');
      return true;

    } catch (error) {
      console.error('❌ Failed to open navigation:', error);
      return false;
    }
  }

  /**
   * Generate a web-based navigation URL as fallback
   */
  private generateWebNavigationUrl(
    destination: Coordinates,
    origin?: Coordinates,
    label?: string
  ): string {
    const destString = `${destination.latitude},${destination.longitude}`;
    
    if (origin) {
      const originString = `${origin.latitude},${origin.longitude}`;
      return `https://www.google.com/maps/dir/${originString}/${destString}`;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${destString}`;
    }
  }

  /**
   * Generate a static map image URL
   */
  public generateStaticMapUrl(
    center: Coordinates,
    width: number = 300,
    height: number = 200,
    zoom: number = 15,
    markers?: Array<{ coordinates: Coordinates; color?: string; label?: string }>
  ): string {
    if (!this.isConfigured()) {
      console.warn('⚠️ Mapbox not configured - cannot generate static map');
      return '';
    }

    let url = `${this.baseUrl}/styles/v1/mapbox/streets-v11/static/`;
    
    // Add markers if provided
    if (markers && markers.length > 0) {
      const markerStrings = markers.map(marker => {
        const { coordinates, color = 'red', label = '' } = marker;
        return `pin-s-${label}+${color}(${coordinates.longitude},${coordinates.latitude})`;
      });
      url += `${markerStrings.join(',')}/`;
    }

    // Add center, zoom, and dimensions
    url += `${center.longitude},${center.latitude},${zoom}/${width}x${height}`;
    
    // Add access token
    url += `?access_token=${this.accessToken}`;
    
    return url;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  public calculateDistance(origin: Coordinates, destination: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.latitude)) * 
      Math.cos(this.toRadians(destination.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format duration from seconds to human readable string
   */
  public formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Format distance from meters to human readable string
   */
  public formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Test Mapbox configuration
   */
  public async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('❌ Mapbox not configured');
      return false;
    }

    try {
      // Test with a simple geocoding request
      const testUrl = `${this.baseUrl}/geocoding/v5/mapbox.places/test.json?access_token=${this.accessToken}&limit=1`;
      const response = await fetch(testUrl);
      
      if (response.ok) {
        console.log('✅ Mapbox configuration test successful');
        return true;
      } else {
        console.error('❌ Mapbox configuration test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Mapbox configuration test error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mapboxService = new MapboxService();