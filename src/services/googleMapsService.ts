import Config from 'react-native-config';
import polyline from '@mapbox/polyline';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteRequest {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
}

interface RouteResponse {
  coordinates: Location[];
  distance?: number; // in meters
  duration?: number; // in seconds
  bounds?: {
    northeast: Location;
    southwest: Location;
  };
}

class GoogleMapsService {
  private apiKey: string;

  constructor() {
    // Try multiple ways to get the API key
    this.apiKey = Config.GOOGLE_MAPS_ANDROID_SDK_KEY || 
                  Config['GOOGLE_MAPS_ANDROID_SDK_KEY'] || 
                  'AIzaSyCVUnaoUNVdNBvwjo6hOBEaziyZ-fpqOtM'; // Direct fallback from .env file
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found in configuration');
    }
  }

  async getDirections(request: RouteRequest): Promise<RouteResponse> {
    try {
      const { origin, destination, waypoints } = request;
      
      // Build the API URL
      let url = `https://maps.googleapis.com/maps/api/directions/json`;
      url += `?origin=${origin.latitude},${origin.longitude}`;
      url += `&destination=${destination.latitude},${destination.longitude}`;
      
      // Add waypoints if provided
      if (waypoints && waypoints.length > 0) {
        const waypointStr = waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
        url += `&waypoints=${waypointStr}`;
      }
      
      // Add optimization for multiple waypoints
      if (waypoints && waypoints.length > 1) {
        url += `&optimize=true`;
      }
      
      url += `&key=${this.apiKey}`;

      if (!this.apiKey) {
        throw new Error('Google Maps API key is not configured. Check GOOGLE_MAPS_ANDROID_SDK_KEY in .env file');
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decode the polyline
      const points = polyline.decode(route.overview_polyline.points);
      const coordinates = points.map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));

      return {
        coordinates,
        distance: leg.distance?.value,
        duration: leg.duration?.value,
        bounds: {
          northeast: {
            latitude: route.bounds.northeast.lat,
            longitude: route.bounds.northeast.lng,
          },
          southwest: {
            latitude: route.bounds.southwest.lat,
            longitude: route.bounds.southwest.lng,
          },
        },
      };
    } catch (error) {
      console.error('Google Directions API error:', error);
      
      // Return fallback straight line route
      const coordinates: Location[] = [request.origin];
      if (request.waypoints) {
        coordinates.push(...request.waypoints);
      }
      coordinates.push(request.destination);
      
      return {
        coordinates,
      };
    }
  }

  async getOptimizedRoute(locations: Location[]): Promise<RouteResponse> {
    if (locations.length < 2) {
      throw new Error('At least 2 locations required for route optimization');
    }

    if (locations.length === 2) {
      // Simple route between two points
      return this.getDirections({
        origin: locations[0],
        destination: locations[1],
      });
    }

    // Multi-stop route with optimization
    const origin = locations[0];
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(1, -1);

    return this.getDirections({
      origin,
      destination,
      waypoints,
    });
  }

  async getPickupDeliveryRoute(
    pickupLocation: Location,
    deliveryLocation: Location,
    driverLocation?: Location
  ): Promise<RouteResponse> {
    if (driverLocation) {
      // Route: Driver → Pickup → Delivery
      return this.getDirections({
        origin: driverLocation,
        destination: deliveryLocation,
        waypoints: [pickupLocation],
      });
    } else {
      // Route: Pickup → Delivery
      return this.getDirections({
        origin: pickupLocation,
        destination: deliveryLocation,
      });
    }
  }

  // Helper method to calculate distance between two points (Haversine formula)
  calculateDistance(point1: Location, point2: Location): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your-google-maps-api-key';
  }

  // Get geocoding for an address (bonus feature)
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.isConfigured()) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
}

export const googleMapsService = new GoogleMapsService();
export { GoogleMapsService };
export type { Location, RouteRequest, RouteResponse };