/**
 * Environment Configuration - React Native Best Practices
 * 
 * Uses react-native-config exclusively for environment variables
 * - Reads from .env file automatically
 * - No hybrid approach, no Node.js dependencies
 * - Type-safe configuration
 * - Validation and fallbacks
 */

import Config from 'react-native-config';

// Declare global __DEV__ variable
declare const __DEV__: boolean;

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Configuration schema interface
interface EnvironmentConfig {
  // Environment metadata
  NODE_ENV: Environment;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
  IS_STAGING: boolean;

  // Server configuration
  SERVER_IP: string;
  SERVER_PORT: number;
  SERVER_PROTOCOL: 'http' | 'https';

  // API configuration
  API_BASE_URL: string;
  API_HOST: string;
  API_TIMEOUT: number;


  // Tenant configuration
  TENANT_ID: string;
  DEFAULT_TENANT_ID: string;
  TENANT_SUBDOMAIN: string;

  // WebSocket configuration (Go websocket-service)
  WS_BASE_URL: string;
  WS_HOST: string;
  WS_PROTOCOL: 'ws' | 'wss';
  WS_SERVICE_PORT: number;  // Go websocket-service port (default 8085)
  
  // Feature flags
  FEATURES: {
    WEBSOCKET: boolean;
    PUSH_NOTIFICATIONS: boolean;
    LOCATION_TRACKING: boolean;
    OFFLINE_MODE: boolean;
  };
  
  // Debug configuration
  DEBUG: {
    API_CALLS: boolean;
    REALTIME: boolean;
    LOCATION: boolean;
    PERFORMANCE: boolean;
  };
}

// Configuration validation
class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

// Get environment variable with validation
const getEnvVar = (
  key: string, 
  fallback?: string, 
  required: boolean = false
): string => {
  const value = Config[key] || fallback;
  
  if (required && !value) {
    throw new ConfigValidationError(`Required environment variable ${key} is not set`);
  }
  
  return value || '';
};

// Get boolean environment variable
const getBooleanEnv = (key: string, fallback: boolean = false): boolean => {
  const value = Config[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

// Get number environment variable
const getNumberEnv = (key: string, fallback: number): number => {
  const value = Config[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigValidationError(`Invalid number value for ${key}: ${value}`);
  }
  return parsed;
};

// Determine current environment
const getCurrentEnvironment = (): Environment => {
  const env = getEnvVar('NODE_ENV', 'development') as Environment;
  const validEnvs: Environment[] = ['development', 'staging', 'production', 'test'];
  
  if (!env || !validEnvs.includes(env)) {
    // eslint-disable-next-line no-console
    console.warn(`Invalid NODE_ENV: ${env}, defaulting to development`);
    return 'development';
  }
  
  return env;
};

// Build configuration
const buildConfig = (): EnvironmentConfig => {
  const currentEnv = getCurrentEnvironment();
  
  // Core server configuration - NO HARDCODED IPs
  const serverIP = getEnvVar('SERVER_IP', undefined, true);
  const serverPort = getNumberEnv('SERVER_PORT', 8000);
  const serverProtocol = getEnvVar('SERVER_PROTOCOL', 'http') as 'http' | 'https';
  
  // Validate server protocol
  if (!['http', 'https'].includes(serverProtocol)) {
    throw new ConfigValidationError(`Invalid SERVER_PROTOCOL: ${serverProtocol}`);
  }
  
  // Build URLs from components
  const apiBaseUrl = `${serverProtocol}://${serverIP}:${serverPort}`;
  const wsProtocol = serverProtocol === 'https' ? 'wss' : 'ws';
  // WebSocket connects to Go websocket-service on port 8085
  const wsServicePort = getNumberEnv('WS_SERVICE_PORT', 8085);
  const wsBaseUrl = `${wsProtocol}://${serverIP}:${wsServicePort}`;
  
  // Tenant configuration
  const tenantId = getEnvVar('TENANT_ID', 'sirajjunior');
  const tenantSubdomain = getEnvVar('TENANT_SUBDOMAIN', tenantId);
  const apiHost = `${tenantSubdomain}.${serverIP}`;
  const wsHost = `${tenantSubdomain}.${serverIP}`;
  
  return {
    // Environment metadata
    NODE_ENV: currentEnv,
    IS_DEVELOPMENT: currentEnv === 'development',
    IS_PRODUCTION: currentEnv === 'production',
    IS_STAGING: currentEnv === 'staging',
    
    // Server configuration
    SERVER_IP: serverIP,
    SERVER_PORT: serverPort,
    SERVER_PROTOCOL: serverProtocol,
    
    // API configuration
    API_BASE_URL: apiBaseUrl,
    API_HOST: apiHost,
    API_TIMEOUT: getNumberEnv('API_TIMEOUT', currentEnv === 'production' ? 15000 : 30000),
    
    // Tenant configuration
    TENANT_ID: tenantId,
    DEFAULT_TENANT_ID: getEnvVar('DEFAULT_TENANT_ID', tenantId),
    TENANT_SUBDOMAIN: tenantSubdomain,
    
    // WebSocket configuration (Go websocket-service)
    WS_BASE_URL: wsBaseUrl,
    WS_HOST: wsHost,
    WS_PROTOCOL: wsProtocol,
    WS_SERVICE_PORT: wsServicePort,
    
    // Feature flags (can be overridden per environment)
    FEATURES: {
      WEBSOCKET: getBooleanEnv('ENABLE_WEBSOCKET', true),
      PUSH_NOTIFICATIONS: getBooleanEnv('ENABLE_PUSH_NOTIFICATIONS', true),
      LOCATION_TRACKING: getBooleanEnv('ENABLE_LOCATION_TRACKING', true),
      OFFLINE_MODE: getBooleanEnv('ENABLE_OFFLINE_MODE', false),
    },
    
    // Debug configuration - disabled in production
    DEBUG: {
      API_CALLS: false,
      REALTIME: false,
      LOCATION: false,
      PERFORMANCE: false,
    },
  };
};

// Initialize configuration with error handling and fallbacks
let config: EnvironmentConfig;

try {
  config = buildConfig();
} catch (error) {
  /* eslint-disable no-console */
  console.error('❌ Configuration Error:', error);
  
  // Provide emergency fallback configuration to prevent app crash
  console.warn('🚨 Using emergency fallback configuration');
  /* eslint-enable no-console */
  const fallbackHost = 'api.murrsal.com'; // Fallback to production

  config = {
    NODE_ENV: 'production',
    IS_DEVELOPMENT: false,
    IS_PRODUCTION: true,
    IS_STAGING: false,
    SERVER_IP: fallbackHost,
    SERVER_PORT: 443,
    SERVER_PROTOCOL: 'https',
    API_BASE_URL: `https://${fallbackHost}`,
    API_HOST: fallbackHost,
    API_TIMEOUT: 15000,
    TENANT_ID: 'sirajjunior',
    DEFAULT_TENANT_ID: 'sirajjunior',
    TENANT_SUBDOMAIN: 'sirajjunior',
    WS_BASE_URL: `wss://${fallbackHost}`,
    WS_HOST: fallbackHost,
    WS_PROTOCOL: 'wss',
    WS_SERVICE_PORT: 443,
    FEATURES: {
      WEBSOCKET: true,
      PUSH_NOTIFICATIONS: true,
      LOCATION_TRACKING: true,
      OFFLINE_MODE: false,
    },
    DEBUG: {
      API_CALLS: false,
      REALTIME: false,
      LOCATION: false,
      PERFORMANCE: false,
    },
  };
  
}

// Export main configuration
export const ENV = config;

// Helper functions
export const getTenantHost = (tenantId?: string): string => {
  if (tenantId && tenantId !== ENV.TENANT_ID) {
    return `${tenantId}.${ENV.SERVER_IP}`;
  }
  return ENV.API_HOST;
};

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${ENV.API_BASE_URL}${cleanEndpoint}`;
};

export const getWebSocketUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${ENV.WS_BASE_URL}${cleanEndpoint}`;
};

// Debug logging functions - no-op in production
export const apiDebug = (message: string, data?: any): void => {
  if (ENV.DEBUG.API_CALLS && __DEV__) {
    console.log(`[API] ${message}`, data);
  }
};
export const realtimeDebug = (message: string, data?: any): void => {
  if (ENV.DEBUG.REALTIME && __DEV__) {
    console.log(`[REALTIME] ${message}`, data);
  }
};
export const locationDebug = (message: string, data?: any): void => {
  if (ENV.DEBUG.LOCATION && __DEV__) {
    console.log(`[LOCATION] ${message}`, data);
  }
};
export const performanceDebug = (message: string, data?: any): void => {
  if (ENV.DEBUG.PERFORMANCE && __DEV__) {
    console.log(`[PERFORMANCE] ${message}`, data);
  }
};

// Configuration validation function
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required fields
  if (!ENV.SERVER_IP) errors.push('SERVER_IP is required');
  if (!ENV.TENANT_ID) errors.push('TENANT_ID is required');
  
  // URL validation
  try {
    const url = new URL(ENV.API_BASE_URL);
    // Use the url variable to satisfy ESLint
    if (!url.protocol) {
      errors.push('Invalid API_BASE_URL protocol');
    }
  } catch {
    errors.push('Invalid API_BASE_URL format');
  }
  
  // Port validation
  if (ENV.SERVER_PORT < 1 || ENV.SERVER_PORT > 65535) {
    errors.push('SERVER_PORT must be between 1 and 65535');
  }
  
  // Timeout validation
  if (ENV.API_TIMEOUT < 1000) {
    errors.push('API_TIMEOUT should be at least 1000ms');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Development helper to display configuration
export const debugConfig = (): void => {};

// Auto-validate configuration on import (non-blocking)
try {
  const validation = validateConfig();
  if (!validation.valid) {
    // eslint-disable-next-line no-console
    console.error('❌ Configuration validation failed:', validation.errors);
    // Only throw in production if it's a critical error
    if (ENV.IS_PRODUCTION && validation.errors.some(error => 
      error.includes('SERVER_IP') || error.includes('TENANT_ID')
    )) {
      throw new ConfigValidationError(`Critical configuration error: ${validation.errors.join(', ')}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Using configuration with warnings in development mode');
    }
  } else {
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('❌ Configuration validation error:', error);
  // Don't let configuration errors prevent app startup in development
  if (ENV.IS_PRODUCTION) {
    throw error;
  } else {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Continuing with fallback configuration in development');
  }
}