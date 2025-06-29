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
  tenantId?: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  profileImage?: string;
  vehicleInfo?: {
    type: string;
    model: string;
    licensePlate: string;
  };
  distance?: number; // Distance in kilometers for nearby drivers
}

export interface DriverBalance {
  cashOnHand: number;
  depositBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
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

export interface Order {
  id: string;
  order_number: string; // Match backend snake_case
  customer_details: Customer; // Match backend field name
  items: OrderItem[];
  delivery_address: string; // Match backend field name (string)
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  estimated_delivery_time?: string;
  delivery_notes?: string;
  created_at: Date;
  updated_at?: Date;
  
  // Deprecated camelCase fields for backward compatibility (remove after full migration)
  /** @deprecated Use order_number */
  orderNumber?: string;
  /** @deprecated Use customer_details */
  customer?: Customer;
  /** @deprecated Use delivery_address */
  deliveryAddress?: Address | string;
  /** @deprecated Use payment_method */
  paymentMethod?: PaymentMethod;
  /** @deprecated Use delivery_fee */
  deliveryFee?: number;
  /** @deprecated Use estimated_delivery_time */
  estimatedDeliveryTime?: string;
  /** @deprecated Use delivery_notes */
  specialInstructions?: string;
  /** @deprecated Use created_at */
  orderTime?: Date;
  
  // Additional fields
  tenantId?: string;
  tenant?: Tenant;
  deliveryId?: string;
  driverId?: string;
  driverName?: string;
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
}

export interface OrderContextType {
  orders: Order[];
  orderHistory: Order[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<boolean>;
  declineOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  getOrderHistory: (filter?: 'today' | 'week' | 'month') => Promise<void>;
  getOrderDetails: (orderId: string) => Promise<Order | null>;
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
