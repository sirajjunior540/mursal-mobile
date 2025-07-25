/**
 * Performance Configuration
 * 
 * Central configuration for all performance-related settings
 * to prevent excessive network requests and battery drain.
 */

export const PERFORMANCE_CONFIG = {
  // Polling intervals
  polling: {
    orderPollingInterval: 60000, // 60 seconds (was 30 seconds)
    minPollingInterval: 30000, // Minimum allowed polling interval
    pollCacheDuration: 10000, // Cache poll results for 10 seconds
  },

  // Location tracking
  location: {
    foregroundUpdateInterval: 30000, // 30 seconds (was 10 seconds)
    backgroundUpdateInterval: 60000, // 60 seconds (was 30 seconds)
    forceUpdateInterval: 120000, // 2 minutes (was 60 seconds)
    forceUpdateTimerInterval: 300000, // 5 minutes (was 2 minutes)
    minDistanceFilter: 50, // Minimum 50 meters movement before update
    backgroundDistanceFilter: 100, // 100 meters in background
    permissionCheckInterval: 600000, // 10 minutes (was 5 minutes)
  },

  // WebSocket reconnection
  websocket: {
    baseReconnectInterval: 10000, // 10 seconds initial (was 5 seconds)
    maxReconnectInterval: 300000, // 5 minutes max
    maxReconnectAttempts: 5,
  },

  // Request deduplication
  deduplication: {
    enabled: true,
    windowMs: 10000, // 10 second window for duplicate detection
  },

  // Logging
  logging: {
    productionLogging: false, // Disable most logging in production
    errorLoggingThreshold: 5, // Only log after 5 consecutive errors
  },

  // Camera
  camera: {
    releaseDelay: 1000, // Delay before releasing camera resources
    maxConcurrentInstances: 1, // Only allow one camera instance at a time
  },

  // General performance
  general: {
    debounceDelay: 300, // Standard debounce delay for user input
    throttleDelay: 1000, // Standard throttle delay for actions
    maxConcurrentRequests: 3, // Maximum concurrent API requests
  },
};

// Helper to check if we're in development mode
export const isDevMode = () => __DEV__;

// Helper to get safe logging function
export const safeLog = (...args: any[]) => {
  if (isDevMode() || PERFORMANCE_CONFIG.logging.productionLogging) {
    console.log(...args);
  }
};

// Helper to get safe error logging function
export const safeError = (...args: any[]) => {
  if (isDevMode() || PERFORMANCE_CONFIG.logging.productionLogging) {
    console.error(...args);
  }
};