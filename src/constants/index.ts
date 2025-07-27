import Config from 'react-native-config';
import { ENV } from '../config/environment';

export * from './theme';
export * from './colors';
export * from './designSystem';

// Export spacing as SPACING for consistency
export { spacing as SPACING } from './theme';

// API Configuration (now using centralized ENV)
export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  HOST: ENV.API_HOST,
  TIMEOUT: ENV.API_TIMEOUT,
  RETRY_ATTEMPTS: 3,
};

// Tenant Configuration
export const TENANT_CONFIG = {
  DEFAULT_TENANT: ENV.DEFAULT_TENANT_ID,
  TENANT_HEADER: 'X-Tenant-ID',
  TENANT_STORAGE_KEY: '@tenant_id',
};

// Environment
export const ENVIRONMENT = ENV.NODE_ENV;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  DRIVER_DATA: '@driver_data',
  ACTIVE_ORDERS: '@active_orders',
  ORDER_HISTORY: '@order_history',
  DRIVER_SETTINGS: '@driver_settings',
  LAST_SYNC: '@last_sync',
  TENANT_ID: '@tenant_id',
} as const;

// App Settings
export const APP_SETTINGS = {
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'es', 'ar'],
  AUTO_SYNC_INTERVAL: 30000, // 30 seconds
  ORDER_REFRESH_INTERVAL: 10000, // 10 seconds
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
} as const;

// Order Status Colors
export const ORDER_STATUS_COLORS = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#9C27B0',
  ready: '#3F51B5',
  assigned: '#2196F3',
  accepted: '#2196F3',
  picked_up: '#9C27B0',
  in_transit: '#3F51B5',
  delivered: '#4CAF50',
  cancelled: '#F44336',
  returned: '#795548',
  failed: '#F44336',
} as const;

// Quick Deposit Amounts
export const QUICK_DEPOSIT_AMOUNTS = [50, 100, 200, 500] as const;

// Payment Method Icons
export const PAYMENT_METHOD_ICONS = {
  cash: 'cash',
  card: 'credit-card',
  digital_wallet: 'wallet',
} as const;

// Order Status Labels
export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  assigned: 'Assigned',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  failed: 'Failed',
} as const;

// History Filter Labels
export const HISTORY_FILTER_LABELS = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
} as const;

// User Role Constants
export const USER_ROLES = {
  // Platform level roles
  PLATFORM_SUPERUSER: 'superuser',
  PLATFORM_ADMIN: 'platform_admin',
  
  // Tenant level roles  
  TENANT_ADMIN: 'tenant_admin',
  TENANT_STAFF: 'tenant_staff',
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  
  // Legacy roles (for backward compatibility)
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;
