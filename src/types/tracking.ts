/**
 * TypeScript types for carrier tracking functionality
 */

export type ShipmentStatus =
  | 'created'
  | 'booked'
  | 'collected'
  | 'in_transit'
  | 'customs_clearance'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';

export type CarrierType = 'express' | 'ocean_freight';

export interface Carrier {
  id: string;
  carrier_code: string;
  carrier_name: string;
  carrier_type: CarrierType;
  supports_real_time_tracking: boolean;
  is_active: boolean;
  priority: number;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer?: Customer;
}

export interface CarrierShipment {
  id: string;
  shipment_id: string;
  tracking_number: string;
  carrier: Carrier;
  order?: Order;
  current_status: ShipmentStatus;
  service_type: string;
  origin_address?: string;
  destination_address?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  current_location?: string;
  auto_tracking_enabled: boolean;
  last_tracking_update?: string;
  special_instructions?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  event_description: string;
  event_timestamp: string;
  location?: string;
  carrier_event_code?: string;
  data_source: 'api' | 'webhook' | 'manual';
  processed: boolean;
  exception_details?: string;
  created_at: string;
}

export interface TrackingLocation {
  id: string;
  lat: number;
  lng: number;
  type: 'origin' | 'destination' | 'current' | 'waypoint' | 'facility';
  label: string;
  timestamp?: string;
  carrier_type?: CarrierType;
  status?: ShipmentStatus;
}

export interface QRScanResult {
  success: boolean;
  data?: string;
  shipment?: CarrierShipment;
  message: string;
}

export interface ShipmentUpdateRequest {
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
  timestamp?: string;
}

export interface DriverAssignment {
  id: string;
  driver_id: string;
  shipment_ids: string[];
  assigned_at: string;
  status: 'assigned' | 'in_progress' | 'completed';
  route_optimized: boolean;
  estimated_completion: string;
}

export interface DeliveryProof {
  shipment_id: string;
  proof_type: 'photo' | 'signature' | 'qr_scan' | 'geolocation';
  proof_data: string; // Base64 image, signature data, QR code, or coordinates
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface PickupRequest {
  shipment_id: string;
  pickup_location: string;
  pickup_time: string;
  contact_person?: string;
  contact_phone?: string;
  special_instructions?: string;
}

export interface DeliveryAttempt {
  id: string;
  shipment_id: string;
  attempt_number: number;
  timestamp: string;
  status: 'successful' | 'failed' | 'rescheduled';
  failure_reason?: string;
  reschedule_date?: string;
  proof?: DeliveryProof;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface BatchOperation {
  id: string;
  operation_type: 'pickup' | 'delivery' | 'scan';
  shipment_ids: string[];
  driver_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

export interface TrackingNotification {
  id: string;
  shipment_id: string;
  type: 'status_update' | 'delivery_attempt' | 'exception' | 'delay';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_required?: boolean;
  action_type?: 'update_status' | 'collect_proof' | 'contact_customer';
}

export interface DriverTrackingStats {
  total_shipments: number;
  completed_deliveries: number;
  pending_pickups: number;
  in_transit: number;
  completion_rate: number;
  on_time_rate: number;
  avg_delivery_time: number;
  distance_traveled: number;
}

export interface RouteOptimization {
  shipment_ids: string[];
  optimized_order: string[];
  total_distance: number;
  estimated_time: number;
  waypoints: Array<{
    shipment_id: string;
    address: string;
    type: 'pickup' | 'delivery';
    estimated_arrival: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}

// API Response types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form types for driver operations
export interface ScanFormData {
  tracking_number: string;
  scan_type: 'pickup' | 'delivery' | 'waypoint';
  location?: string;
  notes?: string;
}

export interface StatusUpdateFormData {
  shipment_id: string;
  new_status: ShipmentStatus;
  location?: string;
  notes?: string;
  proof?: DeliveryProof;
}

export interface ManualEntryFormData {
  tracking_number: string;
  carrier_code?: string;
  operation_type: 'pickup' | 'delivery';
  notes?: string;
}