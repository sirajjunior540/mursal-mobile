/**
 * Order-related TypeScript types and interfaces
 */

import { SpecialHandling } from '../../types';

export interface OrderCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

// Product variant and addon structures
export interface VariantOption {
  name: string;
  price_adjustment: number;
}

export interface VariantGroup {
  id: string;
  name: string;
  options: VariantOption[];
}

export interface Addon {
  name: string;
  price: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  addons: Addon[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  notes?: string;
  variant_groups?: VariantGroup[];
  addon_groups?: AddonGroup[];
}

export interface OrderLocation {
  latitude: number;
  longitude: number;
  address: string;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

/**
 * Unified Order Status - matches backend delivery-service and main Django backend
 * Do NOT add statuses that don't exist in backend!
 */
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum OrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DeliveryType {
  REGULAR = 'regular',
  FOOD = 'food',
  FAST = 'fast',
  SCHEDULED = 'scheduled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  ONLINE = 'online',
}

export interface Order {
  id: string;
  order_number: string;
  customer: OrderCustomer;
  status: OrderStatus;
  priority: OrderPriority;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;

  // Financial details
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  
  // Location information
  pickup_location: OrderLocation;
  delivery_location: OrderLocation;
  
  // Items
  items: OrderItem[];
  
  // Timing
  created_at: string;
  updated_at: string;
  scheduled_delivery_time?: string;
  estimated_delivery_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  
  // Notes and instructions
  delivery_notes?: string;
  special_instructions?: string;
  
  // Driver assignment
  driver_id?: string;
  assigned_at?: string;
  
  // Metadata
  source?: string;
  tenant_id?: string;
  
  // Batch order support
  is_batch?: boolean;
  batch_id?: string;
  batch_info?: BatchOrderInfo;
  
  // Warehouse consolidation
  is_consolidated?: boolean;
  warehouse_info?: {
    warehouse_id?: number;
    warehouse_address?: string;
    warehouse_latitude?: number;
    warehouse_longitude?: number;
  };
  delivery_address_info?: {
    address: string;
    latitude?: number;
    longitude?: number;
    is_warehouse: boolean;
    delivery_type: string;
  };
}

export interface OrderFilters {
  status?: OrderStatus[];
  priority?: OrderPriority[];
  delivery_type?: DeliveryType[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
}

export interface OrderSortOptions {
  field: 'created_at' | 'priority' | 'estimated_delivery_time' | 'total';
  direction: 'asc' | 'desc';
}

export interface OrderListOptions {
  filters?: OrderFilters;
  sort?: OrderSortOptions;
  page?: number;
  limit?: number;
}

// API Response types
export interface OrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  message?: string;
}

// Context types
export interface OrderState {
  orders: Order[];
  orderHistory: Order[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface OrderActions {
  refreshOrders: () => Promise<void>;
  getOrderDetails: (orderId: string) => Promise<Order>;
  acceptOrder: (orderId: string) => Promise<void>;
  declineOrder: (orderId: string, reason?: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderHistory: (filters?: OrderFilters) => Promise<void>;
  clearOrders: () => void;
  setOrderNotificationCallback: (callback: ((order: Order) => void) | null) => void;
  canAcceptOrder: (order: Order) => boolean;
}

export interface OrderContextType extends OrderState, OrderActions {}

// WebSocket message types
export interface OrderWebSocketMessage {
  type: 'new_order' | 'order_updated' | 'order_cancelled' | 'driver_assigned';
  data: Order;
  timestamp: string;
}

// Order action types for useReducer
export type OrderActionType =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_ORDER_HISTORY'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'REMOVE_ORDER'; payload: string }
  | { type: 'ADD_NEW_ORDER'; payload: Order }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_LAST_UPDATED'; payload: string };

// Batch Order Types
export enum BatchStatus {
  DRAFT = 'draft',
  STEP1_COMPLETE = 'step1_complete',
  STEP2_COMPLETE = 'step2_complete',
  STEP3_COMPLETE = 'step3_complete',
  READY_FOR_PICKUP = 'ready_for_pickup',
  SUBMITTED = 'submitted',
  DRIVER_ASSIGNED = 'driver_assigned',
  COLLECTED = 'collected',
  AT_WAREHOUSE = 'at_warehouse',
  WAREHOUSE_PROCESSING = 'warehouse_processing',
  REROUTED = 'rerouted',
  FINAL_DELIVERY = 'final_delivery',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface BatchOrderInfo {
  id: string;
  batch_number: string;
  name: string;
  status: BatchStatus;
  customer_id: string;
  total_orders: number;
  total_items: number;
  current_step: number;
  
  // Pickup information
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  
  // Scheduling
  scheduled_pickup_date?: string;
  scheduled_pickup_time?: string;
  
  // Settings
  enable_smart_routing: boolean;
  batch_notes?: string;
  
  // Step completion timestamps
  step1_completed_at?: string;
  step2_completed_at?: string;
  step3_completed_at?: string;
  submitted_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Orders in this batch
  orders: BatchOrder[];
  
  // Warehouse consolidation
  is_consolidated?: boolean;
  delivery_address_info?: {
    address: string;
    latitude?: number;
    longitude?: number;
    is_warehouse: boolean;
    delivery_type: string;
  };
  warehouse_info?: {
    consolidate_to_warehouse: boolean;
    warehouse_id?: number;
    warehouse_address?: string;
    warehouse_latitude?: number;
    warehouse_longitude?: number;
  };
}

export interface BatchOrder {
  id: string;
  order_number: string;
  
  // Recipient Information
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string;
  
  // Delivery Information
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  delivery_instructions?: string;
  
  // Package Information
  package_size: string;
  package_weight: number;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;
  priority: OrderPriority;
  
  // Scheduling
  scheduled_date?: string;
  scheduled_time?: string;
  
  // Special Requirements
  special_instructions?: string;
  requires_signature: boolean;
  requires_id_verification: boolean;
  cash_on_delivery: boolean;
  cod_amount: number;
  special_handling?: SpecialHandling;
  
  // Financial
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  
  // Items
  items: BatchOrderItem[];
  
  // Status
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface BatchOrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  weight?: number;
  product_id?: string;
  variant_groups?: VariantGroup[];
  addon_groups?: AddonGroup[];
}

// API Response types for batch operations
export interface BatchOrderResponse {
  success: boolean;
  data: BatchOrderInfo;
  message?: string;
}

export interface BatchOrderListResponse {
  success: boolean;
  data: BatchOrderInfo[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  message?: string;
}

export interface BatchAcceptResponse {
  success: boolean;
  message?: string;
  batch_id?: string;
  assigned_orders?: string[];
}