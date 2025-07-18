/**
 * Map Provider Service
 * Handles multi-provider routing based on tenant configuration
 */
import Config from 'react-native-config';
import { apiService } from './api';

export interface MapProviderConfig {
  map_provider: 'none' | 'google' | 'mapbox' | 'openrouteservice';
  api_key: string | null;
  enable_real_time_traffic: boolean;
  enable_alternative_routes: boolean;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface Route {
  coordinates: RoutePoint[];
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string; // encoded polyline
}

class MapProviderService {
  private config: MapProviderConfig | null = null;
  private configPromise: Promise<MapProviderConfig> | null = null;

  /**
   * Get map provider configuration from the backend
   */
  async getConfig(): Promise<MapProviderConfig> {
    // Return cached config if available
    if (this.config) {
      return this.config;
    }

    // If already fetching, wait for the same promise
    if (this.configPromise) {
      return this.configPromise;
    }

    // Fetch configuration from backend
    this.configPromise = apiService.get<MapProviderConfig>('/api/v1/tenants/map-info/')
      .then(response => {
        this.config = response.data;
        return response.data;
      })
      .catch(error => {
        console.error('Failed to fetch map provider config:', error);
        // Return default config on error
        const defaultConfig: MapProviderConfig = {
          map_provider: 'none',
          api_key: null,
          enable_real_time_traffic: false,
          enable_alternative_routes: false
        };
        this.config = defaultConfig;
        return defaultConfig;
      })
      .finally(() => {
        this.configPromise = null;
      });

    return this.configPromise;
  }

  /**
   * Clear cached configuration
   */
  clearConfig(): void {
    this.config = null;
    this.configPromise = null;
  }

  /**
   * Get route between two points using the configured provider
   */
  async getRoute(origin: RoutePoint, destination: RoutePoint): Promise<Route | null> {
    try {
      const config = await this.getConfig();

      let route: Route | null = null;

      switch (config.map_provider) {
        case 'google':
          route = await this.getGoogleRoute(origin, destination, config);
          break;
        case 'mapbox':
          route = await this.getMapboxRoute(origin, destination, config);
          break;
        case 'openrouteservice':
          route = await this.getOpenRouteServiceRoute(origin, destination, config);
          break;
        case 'none':
        default:
          // Use backend route optimization
          route = await this.getBackendRoute(origin, destination);
          break;
      }

      // If the selected provider fails, fall back to backend route
      if (!route && config.map_provider !== 'none') {
        console.log('Primary map provider failed, falling back to backend route');
        route = await this.getBackendRoute(origin, destination);
      }

      return route;
    } catch (error) {
      console.error('Error in getRoute:', error);
      // Last resort: try backend route
      try {
        return await this.getBackendRoute(origin, destination);
      } catch (backendError) {
        console.error('Backend route also failed:', backendError);
        return null;
      }
    }
  }

  /**
   * Decode polyline (Google format)
   */
  private decodePolyline(encoded: string): RoutePoint[] {
    const poly: RoutePoint[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  }

  /**
   * Get route using Google Directions API
   */
  private async getGoogleRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    config: MapProviderConfig
  ): Promise<Route | null> {
    try {
      const apiKey = config.api_key || Config.GOOGLE_MAPS_ANDROID_SDK_KEY;
      if (!apiKey) {
        console.error('No Google Maps API key available');
        return null;
      }

      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: apiKey,
        mode: 'driving',
        ...(config.enable_real_time_traffic && { departure_time: 'now' }),
        ...(config.enable_alternative_routes && { alternatives: 'true' }),
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        return {
          coordinates: this.decodePolyline(route.overview_polyline.points),
          distance: leg.distance.value,
          duration: leg.duration.value,
          polyline: route.overview_polyline.points,
        };
      }

      console.error('Google Directions API error:', data.status);
      return null;
    } catch (error) {
      console.error('Error fetching Google route:', error);
      return null;
    }
  }

  /**
   * Get route using Mapbox Directions API
   */
  private async getMapboxRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    config: MapProviderConfig
  ): Promise<Route | null> {
    try {
      const accessToken = config.api_key;
      if (!accessToken) {
        console.error('No Mapbox access token available');
        return null;
      }

      const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const params = new URLSearchParams({
        access_token: accessToken,
        geometries: 'geojson',
        overview: 'full',
        steps: 'false',
        ...(config.enable_alternative_routes && { alternatives: 'true' }),
      });

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        return {
          coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          })),
          distance: route.distance,
          duration: route.duration,
        };
      }

      console.error('Mapbox Directions API error:', data);
      return null;
    } catch (error) {
      console.error('Error fetching Mapbox route:', error);
      return null;
    }
  }

  /**
   * Get route using OpenRouteService API
   */
  private async getOpenRouteServiceRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    config: MapProviderConfig
  ): Promise<Route | null> {
    try {
      const apiKey = config.api_key;
      if (!apiKey) {
        console.error('No OpenRouteService API key available');
        return null;
      }

      const body = {
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      };

      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const properties = feature.properties;

        return {
          coordinates: feature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          })),
          distance: properties.summary.distance,
          duration: properties.summary.duration,
        };
      }

      console.error('OpenRouteService API error:', data);
      return null;
    } catch (error) {
      console.error('Error fetching OpenRouteService route:', error);
      return null;
    }
  }

  /**
   * Get route using backend optimization service
   */
  private async getBackendRoute(
    origin: RoutePoint,
    destination: RoutePoint
  ): Promise<Route | null> {
    try {
      // This endpoint should be implemented in the backend
      const response = await apiService.post('/api/v1/delivery/calculate-route/', {
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      });

      console.log('Backend route response:', response);

      if (response.success && response.data) {
        // The backend returns { route: { coordinates, distance, duration } }
        // But response.data already contains the full response body
        if ('route' in response.data && response.data.route) {
          return {
            coordinates: response.data.route.coordinates,
            distance: response.data.route.distance,
            duration: response.data.route.duration,
          };
        }
        // If the response is the route data directly
        else if ('coordinates' in response.data) {
          return {
            coordinates: response.data.coordinates,
            distance: response.data.distance,
            duration: response.data.duration,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching backend route:', error);
      return null;
    }
  }

  /**
   * Check if maps should be shown based on provider config
   */
  async shouldShowMap(): Promise<boolean> {
    const config = await this.getConfig();
    return config.map_provider !== 'none';
  }
}

export const mapProviderService = new MapProviderService();