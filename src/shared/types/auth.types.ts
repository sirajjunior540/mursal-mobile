/**
 * Authentication-related TypeScript types and interfaces
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'driver' | 'admin' | 'manager';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver extends User {
  role: 'driver';
  license_number: string;
  vehicle_info: VehicleInfo;
  status: DriverStatus;
  location: DriverLocation;
  rating: number;
  total_deliveries: number;
  is_online: boolean;
  is_available: boolean;
  last_active: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  type: 'car' | 'motorcycle' | 'bicycle' | 'scooter';
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  ON_BREAK = 'on_break',
  UNAVAILABLE = 'unavailable',
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: Driver;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    tenant: TenantInfo;
  };
  message?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  app_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  features: TenantFeatures;
}

export interface TenantFeatures {
  real_time_tracking: boolean;
  push_notifications: boolean;
  route_optimization: boolean;
  cash_on_delivery: boolean;
  multi_stop_delivery: boolean;
}

export interface AuthState {
  user: Driver | null;
  tenant: TenantInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<Driver>) => Promise<void>;
  updateLocation: (location: DriverLocation) => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => Promise<void>;
  clearError: () => void;
}

export interface AuthContextType extends AuthState, AuthActions {}

// Token types
export interface TokenPayload {
  user_id: string;
  email: string;
  role: string;
  tenant_id: string;
  exp: number;
  iat: number;
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// API types
export interface RefreshTokenResponse {
  success: boolean;
  data: {
    access_token: string;
    expires_in: number;
  };
  message?: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  vehicle_info?: Partial<VehicleInfo>;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

// Auth action types for useReducer
export type AuthActionType =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: Driver }
  | { type: 'SET_TENANT'; payload: TenantInfo }
  | { type: 'UPDATE_USER'; payload: Partial<Driver> }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_LOCATION'; payload: DriverLocation }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };