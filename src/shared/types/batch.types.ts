/**
 * Batch Order TypeScript types and interfaces for mobile app
 */

import { Order, OrderLocation, OrderStatus } from './order.types';

export interface BatchOrder {
  id: string;
  batch_number: string;
  name: string;
  status: BatchStatus;
  
  // Pickup information (shared across all orders)
  pickup_location: OrderLocation;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  scheduled_pickup_date?: string;
  scheduled_pickup_time?: string;
  
  // Orders in this batch
  orders: Order[];
  total_orders: number;
  
  // Batch metadata
  batch_type: 'standard' | 'express' | 'bulk' | 'fragile' | 'temperature_controlled';
  enable_smart_routing: boolean;
  same_pickup_location: boolean;
  
  // Financial totals
  total_value: number;
  estimated_total_weight?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  processed_at?: string;
  
  // Driver assignment
  driver_id?: string;
  assigned_at?: string;
  
  // Batch settings
  batch_notes?: string;
  special_instructions?: string;
  
  // Consolidation settings
  consolidate_to_warehouse?: boolean;
  warehouse_id?: string;
  warehouse_address?: string;
}

export enum BatchStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  READY_FOR_PICKUP = 'ready_for_pickup',
  DRIVER_ASSIGNED = 'driver_assigned',
  COLLECTED = 'collected',
  AT_WAREHOUSE = 'at_warehouse',
  WAREHOUSE_PROCESSING = 'warehouse_processing',
  REROUTED = 'rerouted',
  FINAL_DELIVERY = 'final_delivery',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface BatchOrderFilters {
  status?: BatchStatus[];
  batch_type?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
}

export interface BatchOrderResponse {
  success: boolean;
  data: BatchOrder;
  message?: string;
}

export interface BatchOrderListResponse {
  success: boolean;
  data: BatchOrder[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  message?: string;
}

// Driver actions for batch orders
export interface BatchOrderActions {
  acceptBatch: (batchId: string) => Promise<void>;
  startBatchPickup: (batchId: string) => Promise<void>;
  completeBatchPickup: (batchId: string) => Promise<void>;
  startBatchDelivery: (batchId: string) => Promise<void>;
  markOrderDelivered: (batchId: string, orderId: string) => Promise<void>;
  completeBatch: (batchId: string) => Promise<void>;
  updateBatchStatus: (batchId: string, status: BatchStatus) => Promise<void>;
}

// WebSocket message types for batch orders
export interface BatchWebSocketMessage {
  type: 'batch_assigned' | 'batch_updated' | 'batch_cancelled' | 'batch_order_updated';
  data: BatchOrder;
  timestamp: string;
}

// Batch delivery progress
export interface BatchDeliveryProgress {
  batch_id: string;
  total_orders: number;
  delivered_orders: number;
  remaining_orders: number;
  current_order?: Order;
  next_order?: Order;
  completion_percentage: number;
  estimated_completion_time?: string;
}

// Batch navigation and routing
export interface BatchRoute {
  batch_id: string;
  pickup_location: OrderLocation;
  delivery_stops: Array<{
    order_id: string;
    location: OrderLocation;
    sequence: number;
    estimated_arrival: string;
    status: 'pending' | 'completed' | 'skipped';
  }>;
  total_distance: number;
  estimated_duration: number;
  optimized: boolean;
}