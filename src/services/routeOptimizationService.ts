/**
 * Route Optimization Service
 * Handles batch order route optimization with TSP-based algorithm
 */

import { locationService } from './locationService';
import { apiService } from './api';

export interface OptimizedStop {
  sequence: number;
  orderId: string;
  stopType: 'pickup' | 'delivery';
  address: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  distanceFromPreviousKm: number;
  etaMinutes: number;
  instructions?: string;
}

export interface OptimizedRoute {
  batchId: string;
  driverLocation: { lat: number; lng: number };
  stops: OptimizedStop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  optimizedAt: string;
}

interface RouteOptimizationRequest {
  origin: { lat: number; lng: number };
  stops: Array<{
    orderId: string;
    stopType: 'pickup' | 'delivery';
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
    instructions?: string;
    priority?: number;
  }>;
}

class RouteOptimizationService {
  /**
   * Get optimized route for a batch
   */
  async getOptimizedRoute(batchId: string): Promise<OptimizedRoute> {
    try {
      console.log(`📍 Getting optimized route for batch: ${batchId}`);

      // Get driver's current location
      const currentLocation = await locationService.getCurrentLocation();

      // Fetch batch orders from API
      const response = await apiService.get(`/api/v1/batches/${batchId}/`);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch batch data');
      }

      const batchData = response.data;

      // Extract stops from batch
      const stops = this.extractStopsFromBatch(batchData);

      // Optimize route
      const optimizedRoute = await this.optimizeRoute({
        origin: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        stops,
      });

      // Add batch ID and metadata
      return {
        batchId,
        driverLocation: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        ...optimizedRoute,
        optimizedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting optimized route:', error);
      throw error;
    }
  }

  /**
   * Reoptimize route from current location
   */
  async reoptimizeFromCurrentLocation(batchId: string): Promise<OptimizedRoute> {
    try {
      console.log(`🔄 Reoptimizing route for batch: ${batchId}`);

      // Get driver's current location
      const currentLocation = await locationService.getCurrentLocation();

      // Fetch batch orders from API
      const response = await apiService.get(`/api/v1/batches/${batchId}/`);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch batch data');
      }

      const batchData = response.data;

      // Extract only remaining stops (not completed)
      const allStops = this.extractStopsFromBatch(batchData);
      const remainingStops = allStops.filter(stop => stop.status !== 'completed');

      // Optimize route from current location
      const optimizedRoute = await this.optimizeRoute({
        origin: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        stops: remainingStops,
      });

      return {
        batchId,
        driverLocation: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        ...optimizedRoute,
        optimizedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error reoptimizing route:', error);
      throw error;
    }
  }

  /**
   * Extract stops from batch data
   */
  private extractStopsFromBatch(batchData: any): Array<any> {
    const stops: Array<any> = [];

    // Add pickup stop if exists
    if (batchData.pickup_latitude && batchData.pickup_longitude) {
      stops.push({
        orderId: `pickup-${batchData.id}`,
        stopType: 'pickup',
        address: batchData.pickup_address || 'Pickup location',
        lat: Number(batchData.pickup_latitude),
        lng: Number(batchData.pickup_longitude),
        contactName: batchData.pickup_contact_name || 'Merchant',
        contactPhone: batchData.pickup_contact_phone || '',
        instructions: batchData.pickup_instructions || '',
        priority: 1, // Pickups have priority
      });
    }

    // Add delivery stops from orders
    if (batchData.orders && Array.isArray(batchData.orders)) {
      batchData.orders.forEach((order: any) => {
        if (order.delivery_latitude && order.delivery_longitude) {
          stops.push({
            orderId: order.id,
            stopType: 'delivery',
            address: order.delivery_address || 'Delivery location',
            lat: Number(order.delivery_latitude),
            lng: Number(order.delivery_longitude),
            contactName: order.customer?.name || order.customer_name || 'Customer',
            contactPhone: order.customer?.phone || order.delivery_contact_phone || '',
            instructions: order.delivery_instructions || '',
            priority: order.priority === 'urgent' ? 2 : 0,
            status: order.status,
          });
        }
      });
    }

    return stops;
  }

  /**
   * Optimize route using nearest neighbor algorithm with constraints
   */
  private async optimizeRoute(
    request: RouteOptimizationRequest
  ): Promise<Omit<OptimizedRoute, 'batchId' | 'driverLocation' | 'optimizedAt'>> {
    try {
      console.log('🗺️ Optimizing route with stops:', request.stops.length);

      // Separate pickups and deliveries
      const pickups = request.stops.filter(s => s.stopType === 'pickup');
      const deliveries = request.stops.filter(s => s.stopType === 'delivery');

      // Sort pickups by priority and distance
      const sortedPickups = this.sortStopsByDistance(request.origin, pickups);

      // Sort deliveries by priority and distance
      const sortedDeliveries = this.sortStopsByDistance(
        sortedPickups.length > 0
          ? { lat: sortedPickups[sortedPickups.length - 1].lat, lng: sortedPickups[sortedPickups.length - 1].lng }
          : request.origin,
        deliveries
      );

      // Combine: all pickups first, then all deliveries
      const orderedStops = [...sortedPickups, ...sortedDeliveries];

      // Calculate distances and ETAs
      let currentLocation = request.origin;
      let totalDistanceKm = 0;
      let totalDurationMinutes = 0;

      const optimizedStops: OptimizedStop[] = [];

      for (let i = 0; i < orderedStops.length; i++) {
        const stop = orderedStops[i];

        // Calculate distance from previous stop
        const distance = this.calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          stop.lat,
          stop.lng
        );

        // Estimate time (assuming 30 km/h average speed + 5 min per stop)
        const travelTimeMinutes = (distance / 30) * 60;
        const stopTimeMinutes = 5; // Average time at each stop
        const totalTimeMinutes = Math.ceil(travelTimeMinutes + stopTimeMinutes);

        totalDistanceKm += distance;
        totalDurationMinutes += totalTimeMinutes;

        optimizedStops.push({
          sequence: i + 1,
          orderId: stop.orderId,
          stopType: stop.stopType,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          contactName: stop.contactName,
          contactPhone: stop.contactPhone,
          distanceFromPreviousKm: distance,
          etaMinutes: totalTimeMinutes,
          instructions: stop.instructions,
        });

        // Update current location for next iteration
        currentLocation = { lat: stop.lat, lng: stop.lng };
      }

      console.log(`✅ Route optimized: ${optimizedStops.length} stops, ${totalDistanceKm.toFixed(1)}km, ${totalDurationMinutes}min`);

      return {
        stops: optimizedStops,
        totalDistanceKm,
        totalDurationMinutes,
      };
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw error;
    }
  }

  /**
   * Sort stops by distance from origin using nearest neighbor
   */
  private sortStopsByDistance(
    origin: { lat: number; lng: number },
    stops: Array<any>
  ): Array<any> {
    if (stops.length === 0) return [];
    if (stops.length === 1) return stops;

    // Separate by priority
    const urgent = stops.filter(s => s.priority === 2);
    const high = stops.filter(s => s.priority === 1);
    const normal = stops.filter(s => !s.priority || s.priority === 0);

    // Sort each priority group by distance
    const sortByDistance = (stopsToSort: Array<any>, startPoint: { lat: number; lng: number }) => {
      return stopsToSort.sort((a, b) => {
        const distA = this.calculateDistance(startPoint.lat, startPoint.lng, a.lat, a.lng);
        const distB = this.calculateDistance(startPoint.lat, startPoint.lng, b.lat, b.lng);
        return distA - distB;
      });
    };

    const sortedUrgent = sortByDistance([...urgent], origin);
    const lastUrgent = sortedUrgent[sortedUrgent.length - 1];
    const nextOrigin = lastUrgent ? { lat: lastUrgent.lat, lng: lastUrgent.lng } : origin;

    const sortedHigh = sortByDistance([...high], nextOrigin);
    const lastHigh = sortedHigh[sortedHigh.length - 1];
    const finalOrigin = lastHigh ? { lat: lastHigh.lat, lng: lastHigh.lng } : nextOrigin;

    const sortedNormal = sortByDistance([...normal], finalOrigin);

    // Combine in priority order
    return [...sortedUrgent, ...sortedHigh, ...sortedNormal];
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get route polyline for map display (using Google Routes API)
   */
  async getRoutePolyline(stops: OptimizedStop[]): Promise<string> {
    try {
      if (stops.length < 2) return '';

      // Use first stop as origin and last as destination
      const origin = stops[0];
      const destination = stops[stops.length - 1];

      // Middle stops as waypoints
      const waypoints = stops.slice(1, -1);

      // TODO: Call Google Routes API or similar to get polyline
      // For now, return empty string
      return '';
    } catch (error) {
      console.error('Error getting route polyline:', error);
      return '';
    }
  }
}

export const routeOptimizationService = new RouteOptimizationService();
