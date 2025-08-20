/**
 * Batch Leg Types for Driver App
 * Represents batch legs that drivers can accept all-or-nothing
 */

export interface BatchLeg {
  id: string;
  leg_number: string;
  leg_type: 'pickup' | 'direct' | 'multi_stop';
  status: 'available' | 'assigned' | 'in_progress' | 'completed';
  
  // Batch information
  batch: {
    id: string;
    batch_number: string;
    name: string;
    customer: {
      id: string;
      name: string;
    };
    total_orders: number;
    total_value: number;
  };
  
  // Leg details
  stops_count: number;
  distance_km: number;
  estimated_duration: number;
  
  // Origin (pickup point)
  origin_type: 'customer' | 'warehouse' | 'hub';
  origin_location: {
    address: string;
    latitude?: number;
    longitude?: number;
    contact?: {
      name: string;
      phone: string;
    };
  };
  
  // Destinations (delivery points)
  destinations: Array<{
    address: string;
    latitude?: number;
    longitude?: number;
    contact?: {
      name: string;
      phone: string;
    };
    order_id?: string;
    priority?: number;
    notes?: string;
  }>;
  
  // Requirements
  total_weight?: number;
  total_volume?: number;
  required_vehicle_type?: 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck';
  requires_temperature_control: boolean;
  contains_fragile: boolean;
  
  // Earnings
  estimated_earnings?: number;
  
  // Timing
  created_at: string;
  pickup_deadline?: string;
  delivery_deadline?: string;
}

export interface BatchLegListResponse {
  count: number;
  legs: BatchLeg[];
  driver_info: {
    vehicle_type: string | null;
    max_weight: number | null;
  };
}

export interface BatchLegAcceptResponse {
  success: boolean;
  message: string;
  leg: BatchLeg;
}

export interface DriverProfile {
  id: string;
  vehicle_type: 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck';
  max_weight_capacity: number;
  max_volume_capacity?: number;
  max_distance_km: number;
  allowed_delivery_types: string[];
  accepts_cash_on_delivery: boolean;
  accepts_fragile_items: boolean;
  accepts_temperature_controlled: boolean;
  max_stops_per_route: number;
  prefers_single_pickup: boolean;
  preferred_zones: string[];
  excluded_zones: string[];
}

// Helper functions for batch legs
export const getBatchLegSummary = (leg: BatchLeg): string => {
  const stops = leg.stops_count === 1 ? '1 stop' : `${leg.stops_count} stops`;
  const distance = leg.distance_km ? `${leg.distance_km.toFixed(1)}km` : '';
  return `${leg.batch.name} - ${stops} ${distance}`.trim();
};

export const getBatchLegRequirements = (leg: BatchLeg): string[] => {
  const requirements: string[] = [];
  
  if (leg.required_vehicle_type) {
    requirements.push(`Requires ${leg.required_vehicle_type}`);
  }
  
  if (leg.total_weight) {
    requirements.push(`${leg.total_weight}kg`);
  }
  
  if (leg.requires_temperature_control) {
    requirements.push('Temperature controlled');
  }
  
  if (leg.contains_fragile) {
    requirements.push('Fragile items');
  }
  
  return requirements;
};

export const canDriverHandleLeg = (leg: BatchLeg, profile: DriverProfile): boolean => {
  // Check weight capacity
  if (leg.total_weight && leg.total_weight > profile.max_weight_capacity) {
    return false;
  }
  
  // Check volume capacity
  if (leg.total_volume && profile.max_volume_capacity && leg.total_volume > profile.max_volume_capacity) {
    return false;
  }
  
  // Check distance
  if (leg.distance_km && leg.distance_km > profile.max_distance_km) {
    return false;
  }
  
  // Check special requirements
  if (leg.requires_temperature_control && !profile.accepts_temperature_controlled) {
    return false;
  }
  
  if (leg.contains_fragile && !profile.accepts_fragile_items) {
    return false;
  }
  
  // Check vehicle type hierarchy
  const vehicleHierarchy = {
    'bicycle': 1,
    'motorcycle': 2,
    'car': 3,
    'van': 4,
    'truck': 5
  };
  
  if (leg.required_vehicle_type) {
    const requiredLevel = vehicleHierarchy[leg.required_vehicle_type] || 3;
    const driverLevel = vehicleHierarchy[profile.vehicle_type] || 3;
    
    if (requiredLevel > driverLevel) {
      return false;
    }
  }
  
  return true;
};