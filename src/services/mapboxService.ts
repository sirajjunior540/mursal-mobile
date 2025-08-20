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

export interface MapboxGeocodeResponse {
  features: Array<{
    id: string;
    type: string;
    place_name: string;
    text: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties?: Record<string, any>;
    context?: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

export interface ParsedAddress {
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  full_address: string;
}

class MapboxService {
  private accessToken: string;
  private baseUrl = 'https://api.mapbox.com';

  constructor() {
    this.accessToken = getMapboxToken();
    
    // Token initialization handled silently
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
        return data;
      } else {
        return null;
      }
    } catch (error) {
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

      const canOpen = await Linking.canOpenURL(navigationUrl);
      if (canOpen) {
        await Linking.openURL(navigationUrl);
        return true;
      }

      // Fallback to web-based navigation
      const fallbackUrl = this.generateWebNavigationUrl(destination, origin, label);
      await Linking.openURL(fallbackUrl);
      return true;

    } catch (error) {
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
   * Reverse geocode coordinates to get address information
   */
  public async reverseGeocode(coordinates: Coordinates): Promise<MapboxGeocodeResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        types: 'address,poi',
        limit: '1'
      });

      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Mapbox Geocoding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse Mapbox geocoding response to address components for backend API
   */
  public parseAddressFromGeocoding(geocodeResponse: MapboxGeocodeResponse): ParsedAddress | null {
    try {
      const feature = geocodeResponse.features[0];
      if (!feature) return null;

      const context = feature.context || [];
      const properties = feature.properties || {};
      
      // Initialize address components
      let streetNumber = '';
      let streetName = '';
      let city = '';
      let state = '';
      let postalCode = '';
      let country = '';

      // Extract address number and street name from main feature
      if (feature.place_name) {
        const addressParts = feature.place_name.split(',')[0].trim();
        streetName = addressParts;
        
        // Try to extract street number if it's in the address
        if (properties.address) {
          streetNumber = properties.address;
          streetName = feature.text || '';
        }
      }

      // Parse context for other components
      context.forEach((item: any) => {
        const id = item.id || '';
        
        if (id.startsWith('postcode')) {
          postalCode = item.text;
        } else if (id.startsWith('place')) {
          city = item.text;
        } else if (id.startsWith('region')) {
          state = item.text;
        } else if (id.startsWith('country')) {
          country = item.text;
        }
      });

      // Construct full street address
      const street_address = streetNumber ? `${streetNumber} ${streetName}`.trim() : streetName;

      // Limit coordinate precision to 7 decimal places (backend requirement)
      const coordinates = feature.geometry.coordinates;
      const longitude = parseFloat(coordinates[0].toFixed(7));
      const latitude = parseFloat(coordinates[1].toFixed(7));

      return {
        street_address: street_address || feature.place_name || '',
        city: city || '',
        state: state || '',
        postal_code: postalCode || '00000',
        country: country || '',
        latitude,
        longitude,
        full_address: feature.place_name || ''
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get address from current location coordinates
   */
  public async getAddressFromCoordinates(coordinates: Coordinates): Promise<ParsedAddress | null> {
    const geocodeResponse = await this.reverseGeocode(coordinates);
    if (!geocodeResponse) {
      return null;
    }

    return this.parseAddressFromGeocoding(geocodeResponse);
  }

  /**
   * Test Mapbox configuration
   */
  public async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Test with a simple geocoding request
      const testUrl = `${this.baseUrl}/geocoding/v5/mapbox.places/test.json?access_token=${this.accessToken}&limit=1`;
      const response = await fetch(testUrl);
      
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const mapboxService = new MapboxService();