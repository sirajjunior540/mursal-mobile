import Config from 'react-native-config';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteWaypoint {
  location: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  travelMode?: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TWO_WHEELER';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  computeAlternativeRoutes?: boolean;
}

export interface RouteResponse {
  routes: Route[];
  status: string;
  error?: string;
}

export interface Route {
  polyline: {
    encodedPolyline: string;
  };
  distanceMeters: number;
  duration: string;
  staticDuration: string;
}

class GoogleRoutesService {
  private apiKey: string;

  constructor() {
    this.apiKey = Config.GOOGLE_MAPS_ANDROID_SDK_KEY || 'AIzaSyCVUnaoUNVdNBvwjo6hOBEaziyZ-fpqOtM';
    console.log('GoogleRoutesService initialized with API key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NO API KEY');
  }

  async computeRoutes(request: RouteRequest): Promise<RouteResponse> {
    try {
      // First try Routes API v2
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: request.origin.latitude,
              longitude: request.origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: request.destination.latitude,
              longitude: request.destination.longitude,
            },
          },
        },
        travelMode: request.travelMode || 'DRIVE',
        routingPreference: request.routingPreference || 'TRAFFIC_AWARE',
        computeAlternativeRoutes: request.computeAlternativeRoutes || false,
        languageCode: 'en-US',
        units: 'METRIC',
      };

      // Add waypoints if provided
      if (request.waypoints && request.waypoints.length > 0) {
        requestBody['intermediates'] = request.waypoints.map(waypoint => ({
          location: {
            latLng: {
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            },
          },
        }));
      }

      console.log('Google Routes API Request:', {
        url: 'https://routes.googleapis.com/directions/v2:computeRoutes',
        origin: requestBody.origin.location.latLng,
        destination: requestBody.destination.location.latLng,
        apiKeyPresent: !!this.apiKey,
        apiKeyLength: this.apiKey?.length,
      });

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.staticDuration',
      };

      console.log('Request headers:', {
        ...headers,
        'X-Goog-Api-Key': headers['X-Goog-Api-Key'] ? `${headers['X-Goog-Api-Key'].substring(0, 10)}...` : 'NO API KEY',
      });

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Google Routes API Response Status:', response.status);

      if (!response.ok) {
        console.error('Google Routes API Error Response:', responseText);
        
        // If Routes API fails with 403, fall back to Directions API
        if (response.status === 403) {
          console.log('Routes API returned 403, falling back to Directions API');
          return await this.computeRoutesWithDirectionsAPI(request);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Google Routes API Response Data:', data);

      if (!data.routes || data.routes.length === 0) {
        return {
          routes: [],
          status: 'ZERO_RESULTS',
          error: 'No routes found',
        };
      }

      return {
        routes: data.routes,
        status: 'OK',
      };
    } catch (error) {
      console.error('Google Routes API Error:', error);
      
      // Try fallback to Directions API
      console.log('Attempting fallback to Directions API');
      try {
        return await this.computeRoutesWithDirectionsAPI(request);
      } catch (fallbackError) {
        console.error('Directions API fallback also failed:', fallbackError);
        return {
          routes: [],
          status: 'ERROR',
          error: error.message || 'Failed to fetch route',
        };
      }
    }
  }

  // Fallback method using Directions API
  private async computeRoutesWithDirectionsAPI(request: RouteRequest): Promise<RouteResponse> {
    try {
      const origin = `${request.origin.latitude},${request.origin.longitude}`;
      const destination = `${request.destination.latitude},${request.destination.longitude}`;
      
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${this.apiKey}`;
      
      // Add waypoints if provided
      if (request.waypoints && request.waypoints.length > 0) {
        const waypointStr = request.waypoints
          .map(w => `${w.latitude},${w.longitude}`)
          .join('|');
        url += `&waypoints=${waypointStr}`;
      }
      
      console.log('Falling back to Directions API:', url.replace(this.apiKey, 'HIDDEN_KEY'));
      
      const response = await fetch(url);
      const json = await response.json();
      
      if (json.status === 'OK' && json.routes && json.routes.length > 0) {
        // Convert Directions API response to Routes API format
        const route = json.routes[0];
        
        return {
          routes: [{
            polyline: {
              encodedPolyline: route.overview_polyline.points,
            },
            distanceMeters: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
            duration: `${route.legs.reduce((total, leg) => total + leg.duration.value, 0)}s`,
            staticDuration: `${route.legs.reduce((total, leg) => total + leg.duration.value, 0)}s`,
          }],
          status: 'OK',
        };
      } else {
        return {
          routes: [],
          status: json.status || 'ERROR',
          error: json.error_message || 'No routes found',
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Helper method to compute route matrix for multiple origins/destinations
  async computeRouteMatrix(origins: LatLng[], destinations: LatLng[]): Promise<any> {
    try {
      const requestBody = {
        origins: origins.map(origin => ({
          waypoint: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
        })),
        destinations: destinations.map(dest => ({
          waypoint: {
            location: {
              latLng: {
                latitude: dest.latitude,
                longitude: dest.longitude,
              },
            },
          },
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };

      const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Google Route Matrix API Error:', error);
      throw error;
    }
  }
}

export const googleRoutesService = new GoogleRoutesService();