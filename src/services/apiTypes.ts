/**
 * Backend API Type Definitions
 * 
 * This file contains all the interface definitions for backend API responses.
 * These types represent the raw data structure returned by the Django backend.
 */

// Backend data interfaces
export interface BackendDelivery {
  id: string;
  order_id?: string;
  order?: BackendOrder | number | string;
  driver?: string | null;
  driver_id?: string;
  driver_name?: string;
  delivery_status?: string;
  status?: string;
  tracking_url?: string;
  proof_of_delivery?: string;
  signature?: string;
  created_at?: string;
  updated_at?: string;
  pickup_time?: string;
  delivery_time?: string;
  estimated_delivery_time?: string;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer?: BackendCustomer;
  customer_details?: BackendCustomer;
  batch_id?: string;
  batch?: BackendBatch;
  pickup_address?: string;
  delivery_address?: string;
  // Missing fields that are used in apiTransformers
  location?: string;
  latitude?: number;
  longitude?: number;
  reason?: string;
}

export interface BackendOrder {
  id: string;
  order_number?: string;
  orderNumber?: string;
  customer?: BackendCustomer;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id?: string | number;
  customer_details?: BackendCustomer;
  total_amount?: string | number;
  delivery_fee?: string | number;
  payment_status?: string;
  order_status?: string;
  status?: string;
  special_instructions?: string;
  items?: BackendOrderItem[];
  order_items?: BackendOrderItem[];
  created_at?: string;
  delivery_address?: string;
  delivery_notes?: string;
  estimated_delivery_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  // Coordinate fields
  pickup_latitude?: string | number;
  pickup_longitude?: string | number;
  delivery_latitude?: string | number;
  delivery_longitude?: string | number;
  pickup_address?: string;
  // Payment method
  payment_method?: string;
  // Additional order fields
  subtotal?: string | number;
  tax?: string | number;
  total?: string | number;
  scheduled_delivery_time?: string;
  current_batch_id?: string;
  current_batch?: {
    id: string;
    batch_number: string;
    name: string;
    status: string;
    batch_type: string;
  } | null;
  batch_id?: string;
  batchSize?: number;
  orders?: BackendOrder[];
  consolidation_warehouse_id?: string;
  consolidation_batch_id?: string;
  final_delivery_address?: string;
  final_delivery_latitude?: string | number;
  final_delivery_longitude?: string | number;
  // QR Code fields
  qr_code_id?: string;
  qr_code_url?: string;
}

export interface BackendCustomer {
  id?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
}

export interface BackendBatch {
  id: string;
  batch_id?: string;
  batch_number?: string;
  name?: string;
  batch_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  orders?: BackendOrder[];
  location?: string;
  location_id?: string;
  location_address?: string;
  location_latitude?: string | number;
  location_longitude?: string | number;
  parent?: string;
  total_weight?: number;
  estimated_duration?: number;
  previous_batches?: string[];
  pickup_latitude?: string | number;
  pickup_longitude?: string | number;
  delivery_latitude?: string | number;
  delivery_longitude?: string | number;
  pickup_address?: string;
  delivery_address?: string;
}

export interface BackendVehicle {
  type?: string;
  model?: string;
  license_plate?: string;
}

export interface BackendTransactionResponse {
  transactions?: BackendTransactionData[];
  results?: BackendTransactionData[];  // Alternative field name used by some endpoints
  pagination?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  // Earnings data fields
  cashOnHand?: number;
  depositBalance?: number;
  totalEarnings?: number;
  customPeriodEarnings?: number;
  pendingPayouts?: number;
  totalWithdrawals?: number;
  availableBalance?: number;
  todayEarnings?: number;
  weekEarnings?: number;
  monthEarnings?: number;
  period?: {
    start_date?: string;
    end_date?: string;
  };
}

export interface BackendTransactionData {
  id: string;
  type: string;
  transaction_type?: string;
  amount: number | string;
  description?: string;
  date?: string;
  created_at?: string;
  status?: string;
  orderId?: string;
  order_id?: string;
  deliveryId?: string;
  delivery_id?: string;
  metadata?: Record<string, unknown>;
}

export interface BackendVariantOption {
  name?: string;
  price_adjustment?: number;
}

export interface BackendVariantGroup {
  id?: string;
  name?: string;
  options?: BackendVariantOption[];
}

export interface BackendAddon {
  name?: string;
  price?: number;
}

export interface BackendAddonGroup {
  id?: string;
  name?: string;
  addons?: BackendAddon[];
}

export interface BackendOrderItem {
  id?: string;
  product_details?: {
    name?: string;
  };
  product?: {
    name?: string;
  };
  name?: string;
  quantity?: number;
  price?: string | number;
  notes?: string;
  variant_groups?: BackendVariantGroup[];
  addon_groups?: BackendAddonGroup[];
}

export interface RouteOptimizationResponse {
  optimized_route?: Array<{
    delivery_id: string;
    order_id: string;
    sequence: number;
    estimated_distance_km?: number;
    estimated_duration_minutes?: number;
    pickup_coordinates?: {
      latitude: number;
      longitude: number;
    };
    delivery_coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  total_distance_km?: number;
  total_duration_minutes?: number;
  optimization_algorithm?: string;
  created_at?: string;
}

export interface SmartAcceptResponse {
  accepted: boolean;
  delivery_id?: string;
  message?: string;
  assignment_reason?: string;
  estimated_pickup_time?: string;
}

export interface EstimatePickupResponse {
  estimated_pickup_time?: string;
  estimated_duration_minutes?: number;
  estimated_distance_km?: number;
  route_instructions?: string[];
}

export interface BackendDriver {
  id: string;
  username?: string;
  first_name?: string;
  lastName?: string;
  firstName?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  rating?: number;
  total_deliveries?: number;
  is_available?: boolean;
  is_online?: boolean;
  is_on_duty?: boolean;
  profile_image?: string;
  avatar?: string;
  distance_km?: number;
  vehicle?: BackendVehicle;
}

// Token response interface
export interface TokenResponse {
  access?: string;
  token?: string;
  refresh?: string;
  user_id?: number;
  username?: string;
  email?: string;
  role?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  // Driver profile fields that may be included in login response
  first_name?: string;
  last_name?: string;
  phone?: string;
  rating?: number;
  total_deliveries?: number;
  is_online?: boolean;
  profile_image?: string;
}

// User info response interface
export interface UserInfoResponse {
  username?: string;
  role?: string;
  is_driver?: boolean;
  id?: string;
}

// Smart delivery request data interface
export interface SmartDeliveryData {
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// Smart status update data interface
export interface SmartStatusUpdateData extends SmartDeliveryData {
  status: string;
}

// Decline delivery data interface
export interface DeclineDeliveryData {
  location?: string;
  reason?: string;
}

// Backend Batch Leg data interface
export interface BackendBatchLeg {
  id?: string;
  leg_number?: string;
  batch_number?: string;
  leg_type?: string;
  status?: string;
  batch_id?: string;
  batch_name?: string;
  customer_id?: string;
  customer_name?: string;
  order_count?: number;
  total_value?: number;
  stops_count?: number;
  destinations?: any[];
  distance_km?: number;
  estimated_distance_km?: number;
  estimated_duration?: number;
  estimated_duration_minutes?: number;
  origin_type?: string;
  start_location?: string;
  pickup_address?: string;
  start_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  origin_contact?: any;
  end_location?: string;
  delivery_address?: string;
  end_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  destination_contact?: any;
  total_weight?: number;
  total_volume?: number;
  required_vehicle_type?: string;
  requires_temperature_control?: boolean;
  requires_refrigeration?: boolean;
  contains_fragile?: boolean;
  estimated_earnings?: number;
  created_at?: string;
  pickup_deadline?: string;
  scheduled_start_time?: string;
  delivery_deadline?: string;
  scheduled_end_time?: string;
}

// Batch Leg Response types
export interface BackendBatchLegResponse {
  count?: number;
  results?: BackendBatchLeg[];
  next?: string | null;
  previous?: string | null;
}