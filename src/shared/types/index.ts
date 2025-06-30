/**
 * Centralized type exports
 */

// Order types
export * from './order.types';

// Auth types
export * from './auth.types';

// API types
export * from './api.types';

// Common utility types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  full_address: string;
  coordinates?: Coordinates;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule;
}

export interface FormErrors {
  [fieldName: string]: string;
}

// Navigation types
export interface NavigationParams {
  [key: string]: any;
}

export interface RouteParams {
  orderId?: string;
  autoNavigate?: boolean;
  returnTo?: string;
}

// Component prop types
export interface BaseComponentProps {
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

// Style types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface BorderRadius {
  small: number;
  medium: number;
  large: number;
  round: number;
}

// Animation types
export interface AnimationConfig {
  duration: number;
  easing?: string;
  useNativeDriver?: boolean;
}

export interface SpringConfig {
  tension: number;
  friction: number;
  useNativeDriver?: boolean;
}

// Environment types
export interface EnvironmentConfig {
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  API_TIMEOUT: number;
  LOG_LEVEL: string;
  ENABLE_FLIPPER: boolean;
  MAPBOX_TOKEN?: string;
  SENTRY_DSN?: string;
}

// Feature flags
export interface FeatureFlags {
  enablePushNotifications: boolean;
  enableRealTimeTracking: boolean;
  enableOfflineMode: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
}