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
  TENANT_SUBDOMAIN: string;
  
  // WebSocket configuration
  WS_BASE_URL: string;
  WS_HOST: string;
  WS_PROTOCOL: 'ws' | 'wss';
  
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
  const wsBaseUrl = `${wsProtocol}://${serverIP}:${serverPort}`;
  
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
    TENANT_SUBDOMAIN: tenantSubdomain,
    
    // WebSocket configuration
    WS_BASE_URL: wsBaseUrl,
    WS_HOST: wsHost,
    WS_PROTOCOL: wsProtocol,
    
    // Feature flags (can be overridden per environment)
    FEATURES: {
      WEBSOCKET: getBooleanEnv('ENABLE_WEBSOCKET', true),
      PUSH_NOTIFICATIONS: getBooleanEnv('ENABLE_PUSH_NOTIFICATIONS', true),
      LOCATION_TRACKING: getBooleanEnv('ENABLE_LOCATION_TRACKING', true),
      OFFLINE_MODE: getBooleanEnv('ENABLE_OFFLINE_MODE', false),
    },
    
    // Debug configuration (auto-disabled in production)
    DEBUG: {
      API_CALLS: getBooleanEnv('DEBUG_API_CALLS', currentEnv !== 'production'),
      REALTIME: getBooleanEnv('DEBUG_REALTIME', currentEnv !== 'production'),
      LOCATION: getBooleanEnv('DEBUG_LOCATION', currentEnv !== 'production'),
      PERFORMANCE: getBooleanEnv('DEBUG_PERFORMANCE', currentEnv === 'development'),
    },
  };
};

// Initialize configuration with error handling and fallbacks
let config: EnvironmentConfig;

try {
  config = buildConfig();
  console.log('✅ Configuration loaded successfully');
} catch (error) {
  console.error('❌ Configuration Error:', error);
  
  // Provide emergency fallback configuration to prevent app crash
  console.warn('🚨 Using emergency fallback configuration');
  config = {
    NODE_ENV: 'development',
    IS_DEVELOPMENT: true,
    IS_PRODUCTION: false,
    IS_STAGING: false,
    SERVER_IP: '192.168.1.149', // Emergency fallback
    SERVER_PORT: 8000,
    SERVER_PROTOCOL: 'http',
    API_BASE_URL: 'http://192.168.1.149:8000',
    API_HOST: 'sirajjunior.192.168.1.149',
    API_TIMEOUT: 30000,
    TENANT_ID: 'sirajjunior',
    TENANT_SUBDOMAIN: 'sirajjunior',
    WS_BASE_URL: 'ws://192.168.1.149:8000',
    WS_HOST: 'sirajjunior.192.168.1.149',
    WS_PROTOCOL: 'ws',
    FEATURES: {
      WEBSOCKET: true,
      PUSH_NOTIFICATIONS: true,
      LOCATION_TRACKING: true,
      OFFLINE_MODE: false,
    },
    DEBUG: {
      API_CALLS: true,
      REALTIME: true,
      LOCATION: true,
      PERFORMANCE: true,
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

// Debug logging functions
export const apiDebug = (...args: unknown[]): void => {
  if (ENV.DEBUG.API_CALLS) {
    console.log('[API]', ...args);
  }
};

export const realtimeDebug = (...args: unknown[]): void => {
  if (ENV.DEBUG.REALTIME) {
    console.log('[REALTIME]', ...args);
  }
};

export const locationDebug = (...args: unknown[]): void => {
  if (ENV.DEBUG.LOCATION) {
    console.log('[LOCATION]', ...args);
  }
};

export const performanceDebug = (...args: unknown[]): void => {
  if (ENV.DEBUG.PERFORMANCE) {
    console.log('[PERFORMANCE]', ...args);
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
    new URL(ENV.API_BASE_URL);
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
export const debugConfig = (): void => {
  if (ENV.IS_DEVELOPMENT) {
    console.log('🔧 Configuration:', {
      environment: ENV.NODE_ENV,
      server: `${ENV.SERVER_PROTOCOL}://${ENV.SERVER_IP}:${ENV.SERVER_PORT}`,
      api: ENV.API_BASE_URL,
      websocket: ENV.WS_BASE_URL,
      tenant: ENV.TENANT_ID,
      features: ENV.FEATURES,
      debug: ENV.DEBUG,
    });
    
    const validation = validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuration errors:', validation.errors);
    } else {
      console.log('✅ Configuration is valid');
    }
  }
};

// Auto-validate configuration on import
const validation = validateConfig();
if (!validation.valid) {
  console.error('❌ Configuration validation failed:', validation.errors);
  if (ENV.IS_PRODUCTION) {
    throw new ConfigValidationError(`Invalid configuration: ${validation.errors.join(', ')}`);
  }
}