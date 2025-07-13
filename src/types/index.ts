// Core Types for DriverApp

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TenantSettings {
  show_driver_balance: boolean;
  enable_customer_feedback: boolean;
  enable_delivery_tips: boolean;
  enable_payment_integration: boolean;
  enable_fleet_management: boolean;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  currency: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  token: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  tenantId?: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // Added for compatibility
  email: string;
  phone: string;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  isAvailable?: boolean; // Added for compatibility
  status?: string; // Added for compatibility
  profileImage?: string;
  vehicleInfo?: {
    type: string;
    model: string;
    licensePlate: string;
  };
  distance?: number; // Distance in kilometers for nearby drivers
  currentLatitude?: number; // Driver's current latitude
  currentLongitude?: number; // Driver's current longitude
  lastLocationUpdate?: Date; // When location was last updated
}

export interface DriverBalance {
  // Financial data
  cashOnHand: number;
  depositBalance: number;
  totalEarnings: number;
  pendingEarnings: number;
  totalWithdrawals: number;
  availableBalance: number;
  pendingPayouts: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  
  // Performance metrics
  averageDeliveryTime?: number; // in minutes
  availableOrders?: number;
  completedOrders?: number;
  todayCompletedOrders?: number;
  totalDeliveries?: number;
  successfulDeliveries?: number;
  successRate?: number;
  averageRating?: number;
  
  // Period information
  lastUpdated: string;
  breakdown?: {
    today: number;
    week: number;
    month: number;
    deliveryEarnings: number;
    tips: number;
    bonuses: number;
  };
  period?: {
    start_date?: string;
    end_date?: string;
  };
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  apartmentUnit?: string;
  deliveryInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled'
  | 'returned'
  | 'failed';

export type PaymentMethod = 'cash' | 'card' | 'digital_wallet';

export type PackageSize = 'small' | 'medium' | 'large' | 'extra_large';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type SpecialHandling = 'none' | 'fragile' | 'perishable' | 'temperature_controlled' | 'liquid' | 'hazardous';
export type DeliveryType = 'regular' | 'food' | 'fast';

export interface Order {
  // ⚠️ CRITICAL: This 'id' field contains the DELIVERY ID for API operations!
  // Use this ID for all accept/decline/status update API calls to /api/v1/delivery/deliveries/{id}/
  id: string; // This is actually the DELIVERY ID - confusing but necessary for compatibility
  
  order_number?: string; // Match backend snake_case
  customer?: Customer; // Added for compatibility
  customer_details?: Customer; // Match backend field name
  items?: OrderItem[];
  delivery_address?: string; // Match backend field name (string)
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  status?: OrderStatus;
  payment_method?: PaymentMethod;
  subtotal?: number;
  delivery_fee?: number;
  tax?: number;
  total?: number;
  estimated_delivery_time?: string;
  delivery_notes?: string;
  created_at?: Date;
  updated_at?: Date;
  
  // Smart assignment fields
  delivery_type?: DeliveryType;
  package_size?: PackageSize;
  package_weight?: number;
  priority?: Priority;
  special_handling?: SpecialHandling;
  
  // Time constraints
  pickup_time_window_start?: string;
  pickup_time_window_end?: string;
  delivery_time_window_start?: string;
  delivery_time_window_end?: string;
  estimated_preparation_time?: number;
  
  // Pickup and delivery details
  pickup_address?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  delivery_instructions?: string;
  
  // Additional constraints
  requires_signature?: boolean;
  
  // Batch order support - based on actual API response
  current_batch?: {
    id: string;
    batch_number: string;
    name: string;
    status: string;
    batch_type: string;
  } | null;
  consolidation_warehouse_id?: string;
  consolidation_batch_id?: string;
  final_delivery_address?: string;
  final_delivery_latitude?: number;
  final_delivery_longitude?: number;
  
  // Distance tracking
  distance?: number;
  requires_id_verification?: boolean;
  cash_on_delivery?: boolean;
  cod_amount?: number;
  
  
  // Additional fields
  tenantId?: string;
  tenant?: Tenant;
  // ⚠️ deliveryId contains the same value as 'id' above for clarity
  deliveryId?: string; // Same as 'id' field - use either one for API calls
  orderId?: string; // The actual order ID from the order table (if different from delivery ID)
  driverId?: string;
  driverName?: string;
}

// Extended interface for batch orders
export interface BatchOrder extends Order {
  current_batch: {
    id: string;
    batch_number: string;
    name: string;
    status: string;
    batch_type: string;
    orders?: Order[]; // Individual orders in the batch
  };
  warehouseInfo?: {
    id: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  routingStrategy?: 'customer_to_warehouse' | 'warehouse_to_customers';
  batchMetadata?: {
    totalItems: number;
    totalWeight: number;
    estimatedDuration: number;
    consolidationRequired: boolean;
  };
}

export interface BalanceTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'cash_collection';
  amount: number;
  description: string;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  orderId?: string;
}

// Context Types
export interface AuthContextType {
  user: AuthUser | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => Promise<void>;
  setTenant: (tenantId: string) => Promise<void>;
  error: string | null;
  hasPermission: {
    isPlatformSuperuser: () => boolean;
    isPlatformAdmin: () => boolean;
    isTenantAdmin: () => boolean;
    isTenantStaff: () => boolean;
    isDriver: () => boolean;
    isCustomer: () => boolean;
    isAdmin: () => boolean;
    isManager: () => boolean;
    isStaff: () => boolean;
    canManageUsers: () => boolean;
    canManageSettings: () => boolean;
    canViewAnalytics: () => boolean;
    canManageOrders: () => boolean;
    canAssignDeliveries: () => boolean;
    hasTenantAdminAccess: () => boolean;
    hasTenantStaffAccess: () => boolean;
  };
}

export interface OrderContextType {
  orders: Order[];           // Available orders (for dashboard/route)
  driverOrders: Order[];     // Driver's accepted orders
  orderHistory: Order[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<boolean>;
  declineOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  getOrderHistory: (filter?: 'today' | 'week' | 'month') => Promise<void>;
  getOrderDetails: (orderId: string) => Promise<Order | null>;
  getDriverOrders: () => Promise<void>;
  getRouteOptimization: () => Promise<any>;
  setOrderNotificationCallback: (callback: ((order: Order) => void) | null) => void;
  setOrderAcceptedCallback: (callback: ((orderId: string) => void) | null) => void;
  canAcceptOrder: (order: Order) => boolean;
}

export interface DriverContextType {
  driver: Driver | null;
  balance: DriverBalance | null;
  isLoading: boolean;
  error: string | null;
  updateOnlineStatus: (isOnline: boolean) => Promise<void>;
  getDriverProfile: () => Promise<void>;
  getDriverBalance: () => Promise<void>;
  requestWithdrawal: (amount: number) => Promise<void>;
  addDeposit: (amount: number) => Promise<void>;
  recordCashCollection: (orderId: string, amount: number) => Promise<void>;
  updateDriverLocation: (latitude: number, longitude: number) => Promise<void>;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: AuthUser;
  driver: Driver;
  tenant?: Tenant;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  OrderDetails: { orderId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  OngoingDelivery: undefined;
  RouteNavigation: undefined;
  History: undefined;
  Profile: undefined;
};

// Filter Types
export type HistoryFilter = 'today' | 'week' | 'month' | 'all';

// Helper type to make API usage crystal clear
export interface OrderApiIds {
  deliveryId: string; // Use this for all delivery API calls (accept, decline, status update)
  orderId?: string;   // The actual order ID (for reference only)
  orderNumber?: string; // Human-readable identifier
}

/**
 * Extract API IDs from an order for safe API usage
 * 
 * IMPORTANT: For all delivery-related API calls, use the deliveryId!
 * - order.accept(deliveryId)
 * - order.decline(deliveryId) 
 * - order.updateStatus(deliveryId, status)
 * 
 * @param order The order object
 * @returns Object with clearly labeled IDs
 */
export const extractOrderApiIds = (order: Order): OrderApiIds => ({
  deliveryId: order.id, // The main ID field contains the delivery ID (confusing but true)
  orderId: order.orderId,
  orderNumber: order.order_number
});

/**
 * Get the delivery ID for API calls - this is what you need for accept/decline/status updates
 * @param order The order object
 * @returns The delivery ID to use in API calls
 */
export const getDeliveryIdForApi = (order: Order): string => order.id;

/**
 * Get a human-readable order identifier for display purposes
 * @param order The order object
 * @returns Human-readable order identifier
 */
export const getOrderDisplayId = (order: Order): string => {
  return order.order_number || `#${order.id}`;
};

/**
 * Type guard to check if an order is a batch order
 * @param order The order object to check
 * @returns true if the order is a batch order
 */
export const isBatchOrder = (order: Order): order is BatchOrder => {
  return Boolean(order.current_batch);
};

/**
 * Safely get batch properties from an order
 * @param order The order object
 * @returns Batch properties if it's a batch order, null otherwise
 */
export const getBatchProperties = (order: Order) => {
  if (!isBatchOrder(order)) {
    return null;
  }
  
  return {
    batchId: order.current_batch.id,
    batchNumber: order.current_batch.batch_number,
    batchName: order.current_batch.name,
    batchStatus: order.current_batch.status,
    batchType: order.current_batch.batch_type,
    orders: order.current_batch.orders,
    warehouseInfo: order.warehouseInfo,
    routingStrategy: order.routingStrategy,
    batchMetadata: order.batchMetadata,
    consolidationWarehouseId: order.consolidation_warehouse_id,
    consolidationBatchId: order.consolidation_batch_id,
    finalDeliveryAddress: order.final_delivery_address
  };
};

/**
 * Backwards compatibility: Get orders from a batch order
 * @param batchOrder The batch order object
 * @returns Array of orders in the batch
 */
export const getBatchOrders = (batchOrder: BatchOrder): Order[] => {
  return batchOrder.current_batch.orders || [];
};

// Theme Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  black: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}
