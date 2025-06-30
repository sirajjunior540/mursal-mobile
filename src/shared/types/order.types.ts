/**
 * Order-related TypeScript types and interfaces
 */

export interface OrderCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  notes?: string;
}

export interface OrderLocation {
  latitude: number;
  longitude: number;
  address: string;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  DECLINED = 'declined',
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