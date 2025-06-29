import Config from 'react-native-config';

export interface EnvironmentConfig {
  // Environment
  NODE_ENV: string;
  
  // API Configuration
  API_BASE_URL: string;
  API_HOST: string;
  API_TIMEOUT: number;
  
  // Tenant Configuration
  DEFAULT_TENANT_ID: string;
  TENANT_SUBDOMAIN: string;
  
  // WebSocket Configuration
  WS_BASE_URL: string;
  WS_HOST: string;
  
  // Feature Flags
  ENABLE_WEBSOCKET: boolean;
  ENABLE_PUSH_NOTIFICATIONS: boolean;
  ENABLE_LOCATION_TRACKING: boolean;
  
  // Debug Configuration
  DEBUG_API_CALLS: boolean;
  DEBUG_REALTIME: boolean;
  DEBUG_LOCATION: boolean;
}

// Default configuration for fallback
const defaultConfig: EnvironmentConfig = {
  NODE_ENV: 'development',
  API_BASE_URL: 'http://192.168.1.52:8000',
  API_HOST: 'sirajjunior.192.168.1.52',
  API_TIMEOUT: 30000,
  DEFAULT_TENANT_ID: 'sirajjunior',
  TENANT_SUBDOMAIN: 'sirajjunior',
  WS_BASE_URL: 'ws://192.168.1.52:8000',
  WS_HOST: 'sirajjunior.192.168.1.52',
  ENABLE_WEBSOCKET: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_LOCATION_TRACKING: true,
  DEBUG_API_CALLS: true,
  DEBUG_REALTIME: true,
  DEBUG_LOCATION: true,
};

// Helper function to parse boolean strings
const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number strings
const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Create environment configuration
export const ENV: EnvironmentConfig = {
  NODE_ENV: Config.NODE_ENV || defaultConfig.NODE_ENV,
  API_BASE_URL: Config.API_BASE_URL || defaultConfig.API_BASE_URL,
  API_HOST: Config.API_HOST || defaultConfig.API_HOST,
  API_TIMEOUT: parseNumber(Config.API_TIMEOUT, defaultConfig.API_TIMEOUT),
  DEFAULT_TENANT_ID: Config.DEFAULT_TENANT_ID || defaultConfig.DEFAULT_TENANT_ID,
  TENANT_SUBDOMAIN: Config.TENANT_SUBDOMAIN || defaultConfig.TENANT_SUBDOMAIN,
  WS_BASE_URL: Config.WS_BASE_URL || defaultConfig.WS_BASE_URL,
  WS_HOST: Config.WS_HOST || defaultConfig.WS_HOST,
  ENABLE_WEBSOCKET: parseBoolean(Config.ENABLE_WEBSOCKET) || defaultConfig.ENABLE_WEBSOCKET,
  ENABLE_PUSH_NOTIFICATIONS: parseBoolean(Config.ENABLE_PUSH_NOTIFICATIONS) || defaultConfig.ENABLE_PUSH_NOTIFICATIONS,
  ENABLE_LOCATION_TRACKING: parseBoolean(Config.ENABLE_LOCATION_TRACKING) || defaultConfig.ENABLE_LOCATION_TRACKING,
  DEBUG_API_CALLS: parseBoolean(Config.DEBUG_API_CALLS) || defaultConfig.DEBUG_API_CALLS,
  DEBUG_REALTIME: parseBoolean(Config.DEBUG_REALTIME) || defaultConfig.DEBUG_REALTIME,
  DEBUG_LOCATION: parseBoolean(Config.DEBUG_LOCATION) || defaultConfig.DEBUG_LOCATION,
};

// Development helpers
export const isDevelopment = (): boolean => ENV.NODE_ENV === 'development';
export const isProduction = (): boolean => ENV.NODE_ENV === 'production';

// API helpers
export const getApiUrl = (endpoint?: string): string => {
  const baseUrl = ENV.API_BASE_URL.endsWith('/') 
    ? ENV.API_BASE_URL.slice(0, -1) 
    : ENV.API_BASE_URL;
  
  if (!endpoint) return baseUrl;
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const getWebSocketUrl = (endpoint?: string): string => {
  const baseUrl = ENV.WS_BASE_URL.endsWith('/') 
    ? ENV.WS_BASE_URL.slice(0, -1) 
    : ENV.WS_BASE_URL;
  
  if (!endpoint) return baseUrl;
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Tenant helpers
export const getTenantHost = (): string => ENV.API_HOST;
export const getTenantSubdomain = (): string => ENV.TENANT_SUBDOMAIN;

// Debug helpers
export const debugLog = (category: keyof Pick<EnvironmentConfig, 'DEBUG_API_CALLS' | 'DEBUG_REALTIME' | 'DEBUG_LOCATION'>) => {
  return (message: string, ...args: any[]) => {
    if (ENV[category] && isDevelopment()) {
      console.log(`[${category.replace('DEBUG_', '')}] ${message}`, ...args);
    }
  };
};

export const apiDebug = debugLog('DEBUG_API_CALLS');
export const realtimeDebug = debugLog('DEBUG_REALTIME');
export const locationDebug = debugLog('DEBUG_LOCATION');

// Log current configuration in development
if (isDevelopment()) {
  console.log('🔧 Environment Configuration:', {
    NODE_ENV: ENV.NODE_ENV,
    API_BASE_URL: ENV.API_BASE_URL,
    API_HOST: ENV.API_HOST,
    DEFAULT_TENANT_ID: ENV.DEFAULT_TENANT_ID,
    WS_BASE_URL: ENV.WS_BASE_URL,
    features: {
      websocket: ENV.ENABLE_WEBSOCKET,
      pushNotifications: ENV.ENABLE_PUSH_NOTIFICATIONS,
      locationTracking: ENV.ENABLE_LOCATION_TRACKING,
    },
  });
}