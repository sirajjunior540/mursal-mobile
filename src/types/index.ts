// Core Types for DriverApp

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  deliveryAddress: Address;
  restaurantAddress: Address;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  estimatedDeliveryTime: string;
  specialInstructions?: string;
  orderTime: Date;
  acceptedTime?: Date;
  pickedUpTime?: Date;
  deliveredTime?: Date;
  tenantId?: string;
  tenant?: Tenant;
  // Delivery-specific fields when order comes from delivery endpoint
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
  acceptOrder: (orderId: string) => Promise<void>;
  declineOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderHistory: (filter?: 'today' | 'week' | 'month') => Promise<void>;
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
