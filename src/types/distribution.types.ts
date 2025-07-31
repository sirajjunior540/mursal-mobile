/**
 * Distribution Batch Types for Mobile App
 * 
 * These types support warehouse distribution batch handling
 * for local deliveries and network transfers.
 */

export interface DistributionBatch {
  id: string;
  distribution_id: string;
  warehouse_id: number;
  warehouse_name: string;
  source_batch_id?: number;
  source_batch_number?: string;
  distribution_type: 'local' | 'zone' | 'express' | 'scheduled' | 'network';
  driver_type: 'local' | 'network' | 'third_party';
  assigned_driver_id?: number;
  assigned_driver_name?: string;
  target_warehouse_id?: number;
  target_warehouse_name?: string;
  total_packages: number;
  total_weight: number;
  total_volume: number;
  scheduled_departure: string;
  actual_departure?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  status: 'preparing' | 'ready_for_dispatch' | 'driver_assigned' | 'dispatched' | 'in_transit' | 'arrived' | 'delivering' | 'completed' | 'cancelled';
  optimized_route?: any;
  estimated_distance?: number;
  estimated_duration?: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DistributionOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  package_count: number;
  weight?: number;
  special_instructions?: string;
  cod_amount?: number;
  requires_signature?: boolean;
  special_handling?: string[];
}

export interface DistributionBatchWithOrders extends DistributionBatch {
  orders: DistributionOrder[];
}

export interface DistributionAcceptancePayload {
  distribution_id: string;
  driver_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DistributionStatusUpdatePayload {
  distribution_id: string;
  status: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  proof_of_delivery?: string;
  signature?: string;
}