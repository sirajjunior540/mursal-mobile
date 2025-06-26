export * from './theme';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://api.mursal.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Tenant Configuration
export const TENANT_CONFIG = {
  DEFAULT_TENANT: 'default',
  TENANT_HEADER: 'X-Tenant-ID',
  TENANT_STORAGE_KEY: '@tenant_id',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  DRIVER_DATA: '@driver_data',
  ACTIVE_ORDERS: '@active_orders',
  ORDER_HISTORY: '@order_history',
  DRIVER_SETTINGS: '@driver_settings',
  LAST_SYNC: '@last_sync',
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
  accepted: '#2196F3',
  picked_up: '#9C27B0',
  in_transit: '#3F51B5',
  delivered: '#4CAF50',
  cancelled: '#F44336',
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
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} as const;

// History Filter Labels
export const HISTORY_FILTER_LABELS = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
} as const;
