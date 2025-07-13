import { 
  ApiResponse, 
  AuthUser, 
  Driver, 
  DriverBalance, 
  Order,
  BatchOrder, 
  OrderStatus,
  PaymentMethod,
  BalanceTransaction,
  LoginRequest,
  LoginResponse,
  Tenant,
  TenantSettings
} from '../types';
import { 
  BatchLeg, 
  BatchLegListResponse, 
  BatchLegAcceptResponse, 
  DriverProfile 
} from '../types/batchLeg';
import { API_CONFIG, TENANT_CONFIG, STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { ENV, getTenantHost, apiDebug } from '../config/environment';

// Backend data interfaces
export interface BackendDelivery {
  id: string;
  order_id?: string;
  order?: BackendOrder;
  driver?: string | null;
  driver_id?: string;
  driver_name?: string;
  delivery_status?: string;
  status?: string;
  tracking_url?: string;
  proof_of_delivery?: string;
  signature?: string;
  created_at?: string;
  updated_at?: string;
  pickup_time?: string;
  delivery_time?: string;
  estimated_delivery_time?: string;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer?: BackendCustomer;
  customer_details?: BackendCustomer;
  batch_id?: string;
  batch?: BackendBatch;
}

export interface BackendOrder {
  id: string;
  order_number?: string;
  orderNumber?: string;
  customer?: BackendCustomer;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id?: string | number;
  customer_details?: BackendCustomer;
  total_amount?: string | number;
  delivery_fee?: string | number;
  payment_status?: string;
  order_status?: string;
  status?: string;
  special_instructions?: string;
  items?: BackendOrderItem[];
  order_items?: BackendOrderItem[];
  created_at?: string;
  delivery_address?: string;
  delivery_notes?: string;
  estimated_delivery_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  // Coordinate fields
  pickup_latitude?: string | number;
  pickup_longitude?: string | number;
  delivery_latitude?: string | number;
  delivery_longitude?: string | number;
  pickup_address?: string;
  // Payment method
  payment_method?: string;
  // Additional order fields
  subtotal?: string | number;
  tax?: string | number;
  total?: string | number;
  scheduled_delivery_time?: string;
  current_batch_id?: string;
  current_batch?: {
    id: string;
    batch_number: string;
    name: string;
    status: string;
    batch_type: string;
  } | null;
  batch_id?: string;
  batchSize?: number;
  orders?: BackendOrder[];
  consolidation_warehouse_id?: string;
  consolidation_batch_id?: string;
  final_delivery_address?: string;
  final_delivery_latitude?: string | number;
  final_delivery_longitude?: string | number;
}

interface BackendCustomer {
  id?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_number?: string;
  email?: string;
}

interface BackendBatch {
  id: string;
  batch_id?: string;
  batch_number?: string;
  name?: string;
  batch_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  orders?: BackendOrder[];
  location?: string;
  location_id?: string;
  location_address?: string;
  location_latitude?: string | number;
  location_longitude?: string | number;
  parent?: string;
  total_weight?: number;
  estimated_duration?: number;
  previous_batches?: string[];
  pickup_latitude?: string | number;
  pickup_longitude?: string | number;
  delivery_latitude?: string | number;
  delivery_longitude?: string | number;
  pickup_address?: string;
  delivery_address?: string;
}

interface BackendVehicle {
  type?: string;
  model?: string;
  license_plate?: string;
}

interface BackendTransactionResponse {
  transactions: BackendTransactionData[];
  pagination?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

interface BackendTransactionData {
  id: string;
  type: string;
  transaction_type?: string;
  amount: number | string;
  description?: string;
  date?: string;
  created_at?: string;
  status?: string;
  orderId?: string;
  order_id?: string;
  deliveryId?: string;
  delivery_id?: string;
  metadata?: Record<string, unknown>;
}

interface BackendOrderItem {
  id?: string;
  product_details?: {
    name?: string;
  };
  product?: {
    name?: string;
  };
  name?: string;
  quantity?: number;
  price?: string | number;
  notes?: string;
}

interface RouteOptimizationResponse {
  optimized_route?: Array<{
    delivery_id: string;
    order_id: string;
    sequence: number;
    estimated_distance_km?: number;
    estimated_duration_minutes?: number;
    pickup_coordinates?: {
      latitude: number;
      longitude: number;
    };
    delivery_coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  total_distance_km?: number;
  total_duration_minutes?: number;
  optimization_algorithm?: string;
  created_at?: string;
}

interface SmartAcceptResponse {
  accepted: boolean;
  delivery_id?: string;
  message?: string;
  assignment_reason?: string;
  estimated_pickup_time?: string;
}

interface EstimatePickupResponse {
  estimated_pickup_time?: string;
  estimated_duration_minutes?: number;
  estimated_distance_km?: number;
  route_instructions?: string[];
}

interface BackendDriver {
  id: string;
  username?: string;
  first_name?: string;
  lastName?: string;
  firstName?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  rating?: number;
  total_deliveries?: number;
  is_available?: boolean;
  is_online?: boolean;
  profile_image?: string;
  avatar?: string;
  distance_km?: number;
  vehicle?: BackendVehicle;
}

// Token response interface
export interface TokenResponse {
  access?: string;
  token?: string;
  refresh?: string;
  user_id?: number;
  username?: string;
  email?: string;
  role?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

// User info response interface
export interface UserInfoResponse {
  username?: string;
  role?: string;
  is_driver?: boolean;
  id?: string;
}

// Smart delivery request data interface
interface SmartDeliveryData {
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// Smart status update data interface
interface SmartStatusUpdateData extends SmartDeliveryData {
  status: string;
}

// Decline delivery data interface
interface DeclineDeliveryData {
  location?: string;
  reason?: string;
}

/**
 * HTTP Client for API requests
 */
class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout?: number) {
    this.baseURL = baseURL || ENV.API_BASE_URL;
    this.timeout = timeout || ENV.API_TIMEOUT;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.requestWithAuth<T>(endpoint, options);
  }

  private async requestWithAuth<T>(
    endpoint: string, 
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    // Get valid auth token (with automatic refresh if needed)
    const token = await this.getValidToken();

    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      // For physical phone, try both Host header and custom header
      'Host': getTenantHost(),
      'X-Tenant-Host': getTenantHost(),
    };

    // Add Authorization header only if token exists and is valid
    if (token && token.trim()) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    // Log API calls for debugging
    apiDebug(`${options.method || 'GET'} ${url}`);
    apiDebug('Headers:', defaultHeaders);
    if (token) {
      apiDebug('Using auth token:', `${token.substring(0, 20)}...`);
    } else {
      apiDebug('No auth token available');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      apiDebug('Making API request to:', url);

      // React Native compatible timeout using Promise.race
      const fetchPromise = fetch(url, config);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout after ${this.timeout}ms`)), this.timeout)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      let data = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.detail || `HTTP ${response.status}`);
      }

      apiDebug(`API Success: ${url}`, data);
      return {
        success: true,
        data,
        message: data?.message,
      };
    } catch (error) {
      // Check if this is an authentication error and we haven't already retried
      if (!isRetry && this.isAuthError(error)) {
        console.log('🔄 Authentication error detected, attempting token refresh...');
        const refreshSuccess = await this.refreshAuthToken();
        if (refreshSuccess) {
          console.log('✅ Token refreshed, retrying request...');
          return this.requestWithAuth<T>(endpoint, options, true);
        } else {
          console.log('❌ Token refresh failed, authentication error persists');
          // Don't throw here - let the error be handled below to trigger logout
        }
      }

      apiDebug(`API Error [${endpoint}]:`, error);
      console.log('Request URL:', url);

      // Only log headers for non-authentication errors to reduce log noise
      if (!this.isAuthError(error)) {
        console.log('Request headers:', defaultHeaders);
      } else {
        console.log('🔍 Authentication error - headers not logged for security');
      }

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (__DEV__ && error.stack) {
          console.log('Error stack:', error.stack);
        }

        // Provide user-friendly messages for common errors
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = `Network error. Cannot reach ${this.baseURL}. Check if phone and computer are on same WiFi network.`;
        } else if (error.message.includes('fetch')) {
          errorMessage = `Connection failed to ${this.baseURL}. Check if Django server is running with: python manage.py runserver 0.0.0.0:8000`;
        } else if (error.message.includes('ERR_NETWORK')) {
          errorMessage = `Network connection failed. Server ${this.baseURL} not accessible from phone.`;
        }
      }

      return {
        success: false,
        data: null as T,
        error: errorMessage,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Get a valid authentication token, refreshing if necessary
   */
  private async getValidToken(): Promise<string | null> {
    const token = await SecureStorage.getAuthToken();
    if (!token) {
      console.log('🚫 No auth token available');
      return null;
    }

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const bufferTime = 60; // Refresh 1 minute before expiry

      if (payload.exp && payload.exp < (now + bufferTime)) {
        console.log('🔄 Token expiring soon, attempting refresh...');
        const refreshSuccess = await this.refreshAuthToken();
        if (refreshSuccess) {
          const newToken = await SecureStorage.getAuthToken();
          console.log('✅ Token refreshed successfully');
          return newToken;
        } else {
          console.log('❌ Token refresh failed, using expired token (will likely fail)');
          return token; // Return expired token, let server handle the error
        }
      }

      return token;
    } catch (error) {
      apiDebug('Token validation error:', error);
      return token; // Return token anyway, let server validate
    }
  }

  /**
   * Refresh the authentication token using the refresh token
   */
  private async refreshAuthToken(): Promise<boolean> {
    try {
      console.log('🔄 Attempting to refresh authentication token...');

      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }

      // Make refresh request without authentication headers
      const url = `${this.baseURL}/api/v1/auth/token/refresh/`;
      const headers = {
        'Content-Type': 'application/json',
        'Host': getTenantHost(),
      };

      console.log('🔄 Making token refresh request to:', url);

      // React Native compatible timeout using Promise.race
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          refresh: refreshToken
        }),
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Token refresh timeout after ${this.timeout}ms`)), this.timeout)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        apiDebug('Token refresh failed:', response.status, errorData);

        // If refresh token is invalid, clear all auth data
        if (response.status === 401 || response.status === 403) {
          console.log('🗑️ Refresh token invalid, clearing auth data');
          await SecureStorage.clearAll();
        }

        return false;
      }

      const data = await response.json();

      if (data.access) {
        await SecureStorage.setAuthToken(data.access);
        console.log('✅ New access token stored successfully');

        // Update refresh token if provided
        if (data.refresh) {
          await SecureStorage.setRefreshToken(data.refresh);
          console.log('✅ New refresh token stored successfully');
        }

        return true;
      } else {
        apiDebug('Refresh response missing access token:', data);
        return false;
      }
    } catch (error) {
      apiDebug('Token refresh network error:', error);
      return false;
    }
  }

  /**
   * Check if an error is an authentication error
   */
  private isAuthError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = errorMessage.includes('401') || 
                       errorMessage.includes('403') || 
                       errorMessage.includes('Unauthorized') ||
                       errorMessage.includes('Forbidden') ||
                       errorMessage.includes('authentication') ||
                       errorMessage.includes('token');

    if (isAuthError) {
      console.log('🔍 Detected authentication error:', errorMessage);
    }

    return isAuthError;
  }
}

/**
 * API Service for DriverApp
 */
class ApiService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient(); // Uses ENV configuration
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return ENV.API_BASE_URL;
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Store tenant ID if provided
    if (credentials.tenantId) {
      await Storage.setItem(TENANT_CONFIG.TENANT_STORAGE_KEY, credentials.tenantId);
    }
    // Use the configured base URL (already has tenant)
    const tenantId = credentials.tenantId || 'sirajjunior';

    // First, get the JWT token
    const tokenResponse = await this.client.post<TokenResponse>('/api/v1/auth/token/', {
      username: credentials.username,
      password: credentials.password
    });

    if (!tokenResponse.success || !tokenResponse.data) {
      return {
        success: false,
        data: null!,
        error: tokenResponse.error || 'Invalid email or password'
      };
    }

    // Store the access token securely
    const token = tokenResponse.data?.access || tokenResponse.data?.token;
    await SecureStorage.setAuthToken(token || '');

    // Store refresh token if available
    if (tokenResponse.data?.refresh) {
      await SecureStorage.setRefreshToken(tokenResponse.data.refresh);
    }

    // Extract user information from JWT token
    let userInfo = {
      user_id: tokenResponse.data?.user_id,
      username: tokenResponse.data?.username,
      email: tokenResponse.data?.email,
      role: tokenResponse.data?.role,
      is_staff: tokenResponse.data?.is_staff,
      is_superuser: tokenResponse.data?.is_superuser,
    };

    // If not in token response, decode from JWT
    if (!userInfo.user_id && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userInfo = {
          user_id: payload.user_id,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          is_staff: payload.is_staff,
          is_superuser: payload.is_superuser,
        };
      } catch (error) {
        console.warn('Failed to decode JWT token:', error);
      }
    }

    // Now fetch driver profile using the token
    const driverResponse = await this.getDriverProfile();

    if (!driverResponse.success || !driverResponse.data) {
      return {
        success: false,
        data: null!,
        error: 'Failed to fetch driver profile'
      };
    }

    // Construct the response in the expected format
    const user: AuthUser = {
      id: String(userInfo.user_id || driverResponse.data.id || ''),
      username: userInfo.username || credentials.username,
      email: userInfo.email || driverResponse.data.email || '',
      firstName: driverResponse.data.firstName || '',
      lastName: driverResponse.data.lastName || '',
      phone: driverResponse.data.phone || '',
      role: userInfo.role || 'driver',
      is_active: true,
      is_staff: userInfo.is_staff || false,
      is_superuser: userInfo.is_superuser || false,
      token: token || '',
      tenantId: tenantId || 'sirajjunior'
    };

    const tenant: Tenant = {
      id: tenantId,
      name: tenantId,
      logo: `${API_CONFIG.BASE_URL}/api/v1/appearance/logo/`,
      primaryColor: '#4CAF50'
    };

    return {
      success: true,
      data: {
        user,
        driver: driverResponse.data,
        tenant
      }
    };
  }

  async logout(): Promise<ApiResponse<void>> {
    // Clear all secure tokens
    await SecureStorage.clearAll();
    return { success: true, data: undefined };
  }

  // Driver Profile
  async getDriverProfile(): Promise<ApiResponse<Driver>> {
    // Try to get the driver ID from storage
    const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
    let driverId = cachedDriver?.id;

    // If no cached driver ID, try to get from auth token payload
    if (!driverId) {
      const token = await SecureStorage.getAuthToken();
      if (token) {
        try {
          // Decode JWT token to get user/driver ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          driverId = payload.user_id || payload.id || payload.driver_id;
        } catch (error) {
          console.warn('Failed to decode token for driver ID:', error);
        }
      }
    }

    // For driver profile, always use the 'me' endpoint for current driver
    // For admin operations, use the admin/drivers endpoint
    const endpoint = '/api/v1/auth/drivers/me/';

    let response = await this.client.get<unknown>(endpoint);
    
    // If the 'me' endpoint fails, try the driver-profile endpoint as fallback
    if (!response.success && response.error?.includes('404')) {
      console.warn('⚠️ Driver me endpoint failed, trying driver-profile endpoint...');
      response = await this.client.get<unknown>('/api/v1/drivers/driver-profile/');
    }

    // Transform backend response to match our Driver type
    if (response.success && response.data) {
      const driverData = response.data as BackendDriver;
      const driver: Driver = {
        id: String(driverData.id || ''),
        firstName: String(driverData.first_name || driverData.firstName || ''),
        lastName: String(driverData.last_name || driverData.lastName || ''),
        email: String(driverData.email || ''),
        phone: String(driverData.phone_number || driverData.phone || ''),
        rating: Number(driverData.rating || 0),
        totalDeliveries: Number(driverData.total_deliveries || 0),
        isOnline: Boolean(driverData.is_available || driverData.is_online || false),
        profileImage: String(driverData.profile_image || driverData.avatar || ''),
        vehicleInfo: driverData.vehicle ? {
          type: String(driverData.vehicle?.type || ''),
          model: String(driverData.vehicle?.model || ''),
          licensePlate: String(driverData.vehicle?.license_plate || '')
        } : undefined
      };
      
      console.log('👤 Driver profile fetched:', { id: driver.id, username: driverData.username });

      return {
        success: true,
        data: driver,
        message: response.message
      };
    }

    return {
      success: false,
      data: null!,
      error: 'Failed to fetch driver profile'
    };
  }

  async updateDriverStatus(isOnline: boolean): Promise<ApiResponse<void>> {
    // First, try to get the correct driver ID from the /me/ endpoint
    try {
      console.log('🔄 Fetching current driver info from /me/ endpoint...');
      const meResponse = await this.client.get<any>('/api/v1/auth/me/');
      
      if (meResponse.success && meResponse.data) {
        const driverId = meResponse.data.id;
        console.log(`✅ Got driver ID from /me/: ${driverId}`);
        
        // Update the status using the correct driver ID
        const response = await this.client.post<void>('/api/v1/auth/drivers/update_my_status/', {
          is_online: isOnline,
          is_available: isOnline,
          is_on_duty: isOnline
        });
        
        if (response.success) {
          // Update cached driver data with correct ID
          const driver: Driver = {
            id: String(driverId),
            firstName: String(meResponse.data.first_name || ''),
            lastName: String(meResponse.data.last_name || ''),
            email: String(meResponse.data.email || ''),
            phone: String(meResponse.data.phone_number || ''),
            rating: Number(meResponse.data.rating || 0),
            totalDeliveries: Number(meResponse.data.total_deliveries || 0),
            isOnline: isOnline,
            profileImage: String(meResponse.data.profile_picture || ''),
            vehicleInfo: meResponse.data.vehicle_type ? {
              type: String(meResponse.data.vehicle_type || ''),
              model: String(meResponse.data.vehicle_number || ''),
              licensePlate: String(meResponse.data.vehicle_number || '')
            } : undefined
          };
          await Storage.setItem(STORAGE_KEYS.DRIVER_DATA, driver);
          console.log(`✅ Driver status updated and cache refreshed with ID: ${driverId}`);
        }
        
        return response;
      }
    } catch (error) {
      console.error('❌ Error fetching driver info from /me/:', error);
    }
    
    // Fallback: try with cached driver ID
    const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
    let driverId = cachedDriver?.id;
    
    if (!driverId) {
      const token = await SecureStorage.getAuthToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          driverId = payload.user_id || payload.id || payload.driver_id;
        } catch (error) {
          console.warn('Failed to decode token for driver ID:', error);
        }
      }
    }
    
    if (!driverId) {
      return {
        success: false,
        data: null!,
        error: 'Driver ID not found. Please log in again.'
      };
    }
    
    console.log(`🚚 Updating driver status for ID ${driverId} to ${isOnline ? 'online' : 'offline'}`);
    
    try {
      const response = await this.client.post<void>('/api/v1/auth/drivers/update_my_status/', {
        is_online: isOnline,
        is_available: isOnline,
        is_on_duty: isOnline
      });
      
      if (!response.success && response.error?.includes('404')) {
        console.warn('⚠️ Driver not found (404), clearing cached driver data...');
        await Storage.removeItem(STORAGE_KEYS.DRIVER_DATA);
        return {
          success: false,
          data: null!,
          error: 'Driver not found. Please log in again.'
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error updating driver status:', error);
      throw error;
    }
  }

  // Orders
  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    // Get available orders for the driver to accept (unassigned/broadcast orders)
    try {
      const locationService = await import('./locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      const url = `/api/v1/delivery/deliveries/available_orders/?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
      const response = await this.client.get<BackendDelivery[]>(url);

      // Transform backend response to match our Order type
      if (response.success && response.data) {
        console.log('🔍 DEBUG: available_orders raw response:');
        response.data.forEach((item, index) => {
          console.log(`Order ${index}:`, {
            id: item.id,
            order_id: item.order?.id,
            order_number: item.order?.order_number,
            has_order_object: !!item.order,
            driver: item.driver,
            status: item.status,
            keys: Object.keys(item)
          });
        });

        const orders: Order[] = (response.data || []).map(this.transformOrder);
        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
    } catch (locationError) {
      console.warn('⚠️ Failed to get location for active orders:', locationError);
      
      // Fallback without location
      const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');
      
      if (response.success && response.data) {
        const orders: Order[] = (response.data || []).map(this.transformOrder);
        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
    }
  }

  async getOrderHistory(filter?: string): Promise<ApiResponse<Order[]>> {
    // Use the correct ViewSet endpoint for deliveries with optional filtering
    const endpoint = filter ? `/api/v1/delivery/deliveries/?${filter}` : '/api/v1/delivery/deliveries/';
    const response = await this.client.get<BackendDelivery[]>(endpoint);

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const orders: Order[] = dataArray.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  async getCompletedOrders(): Promise<ApiResponse<Order[]>> {
    // Use the custom action endpoint for completed deliveries
    const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/completed/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const orders: Order[] = dataArray.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  async getFailedOrders(): Promise<ApiResponse<Order[]>> {
    // Use the custom action endpoint for failed deliveries
    const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/failed/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const orders: Order[] = dataArray.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  async debugDriverAuth(): Promise<ApiResponse<any>> {
    console.log('🔍 Running driver authentication debug...');
    try {
      const response = await this.client.get<any>('/api/v1/delivery/deliveries/driver_debug/');
      console.log('🔐 Driver debug info:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Driver debug failed:', error);
      return {
        success: false,
        data: null,
        error: 'Debug endpoint failed'
      };
    }
  }

  async getDriverOrders(): Promise<ApiResponse<Order[]>> {
    console.log('📋 Fetching driver orders...');
    
    // First run debug to check authentication
    await this.debugDriverAuth();
    
    // Use by_driver endpoint as primary since it has complete order data
    // Based on backend testing, this endpoint includes ASSIGNED status deliveries
    console.log('🚛 Using by_driver endpoint (includes complete order data)...');
    
    try {
      const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/by_driver/');
      
      if (response.success && response.data) {
        console.log(`🔍 Raw backend response: ${response.data.length} delivery records`);
        
        const orders: Order[] = (response.data || []).map((backendItem) => {
          const transformedOrder = this.transformOrder(backendItem);
          console.log(`✅ Transformed order ${transformedOrder.id}:`, {
            status: transformedOrder.status,
            hasCoordinates: !!(transformedOrder.pickup_latitude && transformedOrder.delivery_latitude),
            pickup_lat: transformedOrder.pickup_latitude,
            delivery_lat: transformedOrder.delivery_latitude
          });
          return transformedOrder;
        });
        
        console.log(`✅ Found ${orders.length} driver orders via by_driver endpoint`);
        console.log('📋 Final transformed orders:', orders.map(o => ({
          id: o.id,
          status: o.status,
          hasPickup: !!(o.pickup_latitude && o.pickup_longitude),
          hasDelivery: !!(o.delivery_latitude && o.delivery_longitude),
          customer: o.customer?.name
        })));
        
        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ by_driver endpoint failed: ${errorMessage}`);
      
      // Log authentication status for debugging
      const token = await this.getValidToken();
      console.log('🔐 Debug info:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        endpoint: '/api/v1/delivery/deliveries/by_driver/'
      });
      
      // If by_driver fails, try ongoing-deliveries as fallback (but it has incomplete data)
      if (errorMessage.includes('429') || errorMessage.includes('404') || errorMessage.includes('403')) {
        console.log('🔄 Falling back to ongoing-deliveries endpoint (incomplete data)...');
        
        try {
          const fallbackResponse = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/ongoing-deliveries/');
          
          if (fallbackResponse.success && fallbackResponse.data) {
            // Extract deliveries array from the response
            const deliveriesData = fallbackResponse.data;
            const ordersArray = Array.isArray(deliveriesData) ? deliveriesData : [deliveriesData];
            
            const orders: Order[] = ordersArray.map(this.transformOrder);
            console.log(`⚠️ Found ${orders.length} driver orders via ongoing-deliveries endpoint (fallback - incomplete data)`);
            return {
              success: true,
              data: orders,
              message: 'Retrieved via fallback endpoint (incomplete order data)'
            };
          }
          
          return fallbackResponse as ApiResponse<Order[]>;
          
        } catch (fallbackError) {
          console.error('❌ Both endpoints failed:', fallbackError);
          return {
            success: false,
            data: [],
            error: 'Failed to fetch driver orders from both endpoints'
          };
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getRouteOptimization(latitude?: number, longitude?: number): Promise<ApiResponse<RouteOptimizationResponse>> {
    console.log('🗺️ Fetching route optimization from backend...');
    
    // If no coordinates provided, try to get from cached driver data
    if (!latitude || !longitude) {
      try {
        const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
        if (cachedDriver && cachedDriver.currentLatitude && cachedDriver.currentLongitude) {
          latitude = cachedDriver.currentLatitude;
          longitude = cachedDriver.currentLongitude;
          console.log('📍 Using cached driver location for route optimization');
        }
      } catch (error) {
        console.warn('⚠️ Could not get cached driver location:', error);
      }
    }
    
    // Build URL with required query parameters
    let url = '/api/v1/delivery/deliveries/route-optimization/';
    if (latitude && longitude) {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString()
      });
      url += `?${params.toString()}`;
      console.log(`📍 Route optimization with location: ${latitude}, ${longitude}`);
    } else {
      console.warn('⚠️ No driver location available for route optimization - this may cause a 400 error');
    }
    
    return this.client.get<RouteOptimizationResponse>(url);
  }

  async getOngoingDeliveries(): Promise<ApiResponse<Order[]>> {
    console.log('🚚 Fetching ongoing deliveries...');
    const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/ongoing-deliveries/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const orders: Order[] = (response.data || []).map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }


  async smartAcceptOrder(orderId: string): Promise<ApiResponse<SmartAcceptResponse>> {
    console.log(`🎯 Smart accepting order: ${orderId}`);
    return this.client.post<SmartAcceptResponse>(`/api/v1/delivery/deliveries/${orderId}/smart_accept/`);
  }

  async getAvailableOrdersWithDistance(): Promise<ApiResponse<Order[]>> {
    console.log('📍 Fetching available orders with distance filtering...');
    
    // Get current location to send with request
    try {
      const locationService = await import('./locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      console.log('📍 Sending location with request:', {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      // Send location as query parameters
      const url = `/api/v1/delivery/deliveries/available_orders/?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
      const response = await this.client.get<BackendDelivery[]>(url);

      // Transform backend response to match our Order type
      if (response.success && response.data) {
        const orders: Order[] = (response.data || []).map(this.transformOrder);
        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
    } catch (locationError) {
      console.warn('⚠️ Failed to get location, fetching orders without location filter:', locationError);
      
      // Fallback to request without location
      const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');

      // Transform backend response to match our Order type
      if (response.success && response.data) {
        const orders: Order[] = (response.data || []).map(this.transformOrder);
        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
    }
  }

  // Helper function to determine correct order status
  private transformOrderStatus = (delivery: BackendDelivery, order: BackendOrder): string => {
    const deliveryStatus = delivery?.status;
    const orderStatus = order?.status;

    console.log('🔍 Transforming order status:', {
      deliveryStatus,
      orderStatus,
      hasDriver: !!delivery?.driver,
      driverId: delivery?.driver
    });

    // If this is from available_orders endpoint, it should be pending
    // Available orders are those that drivers can accept
    if (!delivery?.driver || delivery?.driver === null || delivery?.driver === '') {
      console.log('📋 Order has no driver assigned - setting status to pending');
      return 'pending';
    }

    // If delivery has a driver, use the delivery status directly
    if (delivery?.driver && deliveryStatus) {
      console.log(`🚛 Order has driver - using delivery status: ${deliveryStatus}`);
      return deliveryStatus;
    }

    // Use delivery status if available, then order status, default to pending
    const finalStatus = deliveryStatus || orderStatus || 'pending';
    console.log(`✅ Final order status: ${finalStatus}`);
    return finalStatus;
  };

  // Helper method to transform backend delivery/order to frontend Order type
  private transformOrder = (backendData: unknown): Order => {
    // Type guard to safely access properties
    if (!backendData || typeof backendData !== 'object') {
      throw new Error('Invalid backend data provided to transformOrder');
    }
    
    const data = backendData as BackendOrder | BackendDelivery;
    console.log('🔄 transformOrder input:', {
      hasId: !!data.id,
      hasOrder: !!('order' in data && data.order && typeof data.order === 'object'),
      hasDriver: 'driver' in data,
      topLevelKeys: Object.keys(data).slice(0, 10)
    });

    // Use type-safe extraction utilities - simplified inline
    const isDelivery = 'order' in data && data.order && typeof data.order === 'object';
    const order = isDelivery ? (data as BackendDelivery).order as BackendOrder : (data as BackendOrder);
    const delivery = isDelivery ? (data as BackendDelivery) : null;

    console.log('🔍 Transforming order data:', {
      isDelivery,
      hasOrder: !!order,
      orderId: order?.id,
      hasCustomer: !!(order?.customer || order?.customer_details),
      backendDataKeys: Object.keys(backendData),
      orderKeys: order ? Object.keys(order) : []
    });

    // Enhanced customer data extraction with debugging
    console.log('🔍 Customer data extraction:', {
      'order.customer': order.customer,
      'order.customer_details': order.customer_details,
      'order.customer_name': order.customer_name,
      'order.customer_id': order.customer_id,
      'delivery?.customer': delivery?.customer,
      'customerIsId': typeof order.customer === 'number' || typeof order.customer === 'string',
      'hasCustomerDetails': !!order.customer_details,
      'customerDetailsKeys': order.customer_details ? Object.keys(order.customer_details) : []
    });

    let customerData: BackendCustomer = {};
    
    // Handle case where customer is just an ID (needs to be fixed in backend)
    if (typeof order.customer === 'number' || typeof order.customer === 'string') {
      console.warn('⚠️ Customer field is just an ID, not an object. Backend should return customer_details.');
      customerData = {
        id: String(order.customer),
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email
      };
    } else {
      customerData = (order.customer_details as BackendCustomer) ||  // Use customer_details first (contains full object)
                    (order.customer as BackendCustomer) || 
                    (delivery?.customer_details as BackendCustomer) || 
                    (delivery?.customer as BackendCustomer) || 
                    {};
    }

    // Fallback customer data if missing
    const customer = {
      id: String(customerData.id || order.customer_id || delivery?.customer_id || order.customer || `customer_${order.id || 'unknown'}`),
      name: customerData.name || 
            customerData.full_name || 
            order.customer_name || 
            delivery?.customer_name ||
            `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() ||
            (customerData.user?.first_name && customerData.user?.last_name ? 
              `${customerData.user.first_name} ${customerData.user.last_name}` : 
            'Unknown Customer'),
      phone: customerData.phone || 
             customerData.phone_number || 
             order.customer_phone || 
             delivery?.customer_phone ||
             '',
      email: customerData.email || 
             order.customer_email || 
             delivery?.customer_email ||
             ''
    };

    // Log if customer data is missing for debugging
    if (!customer.name || customer.name === 'Unknown Customer') {
      console.warn('⚠️ Missing customer data in order:', {
        orderId: order.id,
        backendData: JSON.stringify(backendData, null, 2),
        extractedCustomer: customer
      });
    }

    // CRITICAL: For available_orders endpoint, the root object IS the delivery
    // So backendData.id is the delivery ID we need for accept/decline
    const primaryId = String(data.id || delivery?.id || order?.id || '');

    console.log('🆔 ID Resolution:', {
      primaryId,
      backendDataId: data.id,
      deliveryId: delivery?.id,
      orderId: order?.id,
      isFromAvailableOrders: !delivery && data.id && 'order' in data
    });

    // Detect if this is a batch order by checking for batch-related fields
    // Check if the delivery is associated with a batch
    const isBatchDelivery = !!(
      (delivery as BackendDelivery)?.batch_id || 
      (delivery as BackendDelivery)?.batch?.id ||
      data.batch_id || 
      (backendData as BackendBatch)?.id ||
      order.current_batch_id ||
      order.current_batch
    );
    
    console.log('🔍 Batch detection:', {
      isBatchDelivery,
      deliveryBatchId: (delivery as BackendDelivery)?.batch_id,
      orderBatchId: order?.current_batch_id,
      backendBatchId: data.batch_id
    });

    const baseOrder = {
      // ⚠️ CRITICAL: The 'id' field contains the DELIVERY ID for API operations
      id: primaryId,  // This is the delivery ID that must be used for accept/decline/status API calls
      
      // Explicit delivery ID field for clarity (same as id above)
      deliveryId: primaryId, // Same as 'id' - the delivery ID for API calls
      
      // The actual order ID from the order table (if different)
      orderId: order.id, // The order table's primary key
      
      orderNumber: order.order_number || `#${order.id}`,
      customer,
      items: (order?.items || order?.order_items || []).map((item: BackendOrderItem) => ({
        id: item.id || '',
        name: item.product_details?.name || item.product?.name || item.name || '',
        quantity: item.quantity || 1,
        price: parseFloat(String(item.price ?? 0)) || 0,
        specialInstructions: item.notes || ''
      })),
      deliveryAddress: {
        id: '',
        street: order.delivery_address || '',
        city: '', // These fields are not in the current backend response
        state: '',
        zipCode: '',
        apartmentUnit: '',
        deliveryInstructions: order.delivery_notes || '',
        coordinates: undefined // Could be parsed from address if needed
      },
      // CRITICAL: Add coordinate fields that RouteNavigationScreen expects
      pickup_latitude: order.pickup_latitude ? parseFloat(String(order.pickup_latitude)) : undefined,
      pickup_longitude: order.pickup_longitude ? parseFloat(String(order.pickup_longitude)) : undefined,
      delivery_latitude: order.delivery_latitude ? parseFloat(String(order.delivery_latitude)) : undefined,
      delivery_longitude: order.delivery_longitude ? parseFloat(String(order.delivery_longitude)) : undefined,
      pickup_address: order.pickup_address || '',
      delivery_address: order.delivery_address || '',
      status: this.transformOrderStatus(delivery || {} as BackendDelivery, order) as OrderStatus,
      paymentMethod: (order.payment_method || 'cash') as PaymentMethod,
      subtotal: order.subtotal ? parseFloat(String(order.subtotal)) : 0,
      deliveryFee: order.delivery_fee ? parseFloat(String(order.delivery_fee)) : 0,
      tax: order.tax ? parseFloat(String(order.tax)) : 0,
      total: order.total ? parseFloat(String(order.total)) : 0,
      estimatedDeliveryTime: delivery?.estimated_delivery_time || order.scheduled_delivery_time || '',
      specialInstructions: order.delivery_notes || '',
      orderTime: order.created_at ? new Date(order.created_at) : new Date(),
      // Add delivery-specific fields if this is a delivery object
      driverId: delivery?.driver || undefined,
      driverName: delivery?.driver_name || undefined,
      
      // Batch order support - use current_batch structure
      current_batch: order.current_batch || null,
      batchId: (delivery as BackendDelivery)?.batch_id || data.batch_id || order?.current_batch_id || undefined,
      consolidationWarehouseId: order.consolidation_warehouse_id,
      finalDeliveryAddress: order.final_delivery_address,
      finalDeliveryLatitude: order.final_delivery_latitude ? parseFloat(String(order.final_delivery_latitude)) : undefined,
      finalDeliveryLongitude: order.final_delivery_longitude ? parseFloat(String(order.final_delivery_longitude)) : undefined,
      // Add batch orders if this is a batch
      orders: isBatchDelivery && 'orders' in data && Array.isArray(data.orders) ? data.orders : undefined,
    };

    // If this is a batch order, try to determine batch size from available data
    if (isBatchDelivery && order.consolidation_batch_id) {
      // For now, we'll estimate batch size from other indicators
      // In a real implementation, this would come from the backend
      const estimatedBatchSize = order?.batchSize || 
                                order?.orders?.length || 
                                2; // Default estimate
      
      return {
        ...baseOrder,
        batchSize: estimatedBatchSize,
      } as Order;
    }

    return baseOrder as Order;
  }

  async acceptOrder(deliveryId: string): Promise<ApiResponse<void>> {
    console.log(`🎯 Attempting to accept order using delivery ID: ${deliveryId}`);
    
    // Debug: Check current user info before making the request
    try {
      const userResponse = await this.client.get<UserInfoResponse>('/whoami/');
      console.log('🔍 Current user info:', {
        username: userResponse.data?.username,
        role: userResponse.data?.role,
        is_driver: userResponse.data?.role === 'driver',
        id: userResponse.data?.id
      });
      
      if (userResponse.data?.role !== 'driver') {
        console.warn('⚠️ User role is not "driver":', userResponse.data?.role);
        console.warn('💡 User needs role="driver" for driver operations to work');
      }
    } catch (error) {
      console.warn('⚠️ Could not get user info:', error);
    }
    
    // ⚠️ CRITICAL: This endpoint expects a DELIVERY ID, not an order ID
    console.log(`🔗 Making API call to: /api/v1/delivery/deliveries/${deliveryId}/accept/`);
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/accept/`);
  }

  async acceptBatchOrder(batchId: string): Promise<ApiResponse<void>> {
    console.log(`🎯 Attempting to accept batch order: ${batchId}`);
    
    // Use the new batch endpoint with the unified Batch model
    try {
      const result = await this.client.post<void>(`/api/v1/delivery/batches/${batchId}/accept/`, {
        notes: 'Batch accepted via mobile app'
      });
      
      if (result.success) {
        console.log(`✅ Successfully accepted batch order: ${batchId}`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Batch accept failed: ${error}`);
    }
    
    // Fallback to delivery endpoint if batch endpoint fails
    return this.client.post<void>(`/api/v1/delivery/deliveries/${batchId}/accept/`);
  }

  async updateBatchStatus(batchId: string, status: string, data?: Record<string, unknown>): Promise<ApiResponse<void>> {
    console.log(`🔄 Updating batch ${batchId} status to ${status}`);
    
    try {
      const result = await this.client.post<void>(`/api/v1/delivery/batches/${batchId}/update_status/`, {
        status,
        ...data
      });
      
      if (result.success) {
        console.log(`✅ Successfully updated batch status to ${status}`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Batch status update failed: ${error}`);
    }
    
    // Fallback to delivery endpoint
    return this.updateOrderStatus(batchId, status as OrderStatus);
  }

  async getAvailableBatches(): Promise<ApiResponse<BatchOrder[]>> {
    console.log('📦 Fetching available batches...');
    
    try {
      const response = await this.client.get<BackendBatch[]>('/api/v1/delivery/batches/available/');
      
      if (response.success && response.data) {
        const batches = response.data.map((batch: BackendBatch) => this.transformBatchOrder(batch));
        return {
          success: true,
          data: batches,
          message: response.message
        };
      }
      
      return response as ApiResponse<BatchOrder[]>;
    } catch (error) {
      console.error('Failed to get available batches:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to fetch available batches'
      };
    }
  }

  async getBatchDetails(batchId: string): Promise<ApiResponse<BatchOrder>> {
    console.log(`📦 Fetching batch details for: ${batchId}`);
    
    const response = await this.client.get<BackendBatch>(`/api/v1/delivery/batches/${batchId}/`);
    
    if (response.success && response.data) {
      // Transform to BatchOrder type
      const batch = this.transformBatchOrder(response.data);
      return {
        success: true,
        data: batch,
        message: response.message
      };
    }
    
    return response as ApiResponse<BatchOrder>;
  }

  private transformBatchOrder(backendBatch: BackendBatch): BatchOrder {
    const orders = (backendBatch.orders || []).map((order: BackendOrder) => this.transformOrder(order));
    
    return {
      id: String(backendBatch.id),
      current_batch: {
        id: String(backendBatch.id),
        batch_number: backendBatch.batch_number || `BATCH-${backendBatch.id}`,
        name: backendBatch.name || `Batch ${backendBatch.id}`,
        status: backendBatch.status || 'pending',
        batch_type: backendBatch.batch_type || 'regular',
        orders: orders
      },
      status: backendBatch.status,
      orders: orders,
      order_number: `BATCH-${backendBatch.id}`,
      created_at: backendBatch.created_at ? new Date(backendBatch.created_at) : new Date(),
      updated_at: backendBatch.updated_at ? new Date(backendBatch.updated_at) : new Date(),
      warehouseInfo: backendBatch.location ? {
        id: String(backendBatch.location_id || ''),
        name: backendBatch.location,
        address: backendBatch.location_address || '',
        latitude: backendBatch.location_latitude,
        longitude: backendBatch.location_longitude,
      } : undefined,
      routingStrategy: backendBatch.parent ? 'warehouse_to_customers' : 'customer_to_warehouse',
      batchMetadata: {
        totalItems: orders.reduce((sum: number, order: Order) => sum + (order.items?.length || 0), 0),
        totalWeight: backendBatch.total_weight || 0,
        estimatedDuration: backendBatch.estimated_duration || 0,
        consolidationRequired: !!backendBatch.previous_batches?.length,
      },
      // Map other fields
      pickup_latitude: backendBatch.pickup_latitude,
      pickup_longitude: backendBatch.pickup_longitude,
      delivery_latitude: backendBatch.delivery_latitude,
      delivery_longitude: backendBatch.delivery_longitude,
      pickup_address: backendBatch.pickup_address,
      delivery_address: backendBatch.delivery_address,
    } as BatchOrder;
  }

  async acceptRoute(routeId: string): Promise<ApiResponse<void>> {
    console.log(`🎯 Attempting to accept route: ${routeId}`);
    
    // Try route-specific endpoint first
    try {
      const result = await this.client.post<void>(`/api/v1/delivery/routes/${routeId}/accept/`);
      
      if (result.success) {
        console.log(`✅ Successfully accepted route: ${routeId}`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Route accept failed, trying batch order endpoint: ${error}`);
    }
    
    // Fallback to batch order endpoint
    return this.acceptBatchOrder(routeId);
  }

  async declineOrder(deliveryId: string): Promise<ApiResponse<void>> {
    console.log(`🚫 API: Attempting to decline order using delivery ID: ${deliveryId}`);

    // ⚠️ CRITICAL: This endpoint expects a DELIVERY ID, not an order ID
    console.log(`🔗 Making API call to: /api/v1/delivery/deliveries/${deliveryId}/decline/`);
    const result = await this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/decline/`);

    if (!result.success) {
      console.error(`❌ Decline failed for delivery ID ${deliveryId}:`, result.error);

      // If error mentions "you can only decline", it means backend needs fixing
      if (result.error?.toLowerCase().includes('you can only decline')) {
        console.error('⚠️ Backend decline logic needs update - see quick_backend_fix.py');
      }
    } else {
      console.log(`✅ Successfully declined order using delivery ID: ${deliveryId}`);
    }

    return result;
  }

  async updateOrderStatus(deliveryId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    console.log(`🔄 Updating order status to ${status} using delivery ID: ${deliveryId}`);
    
    // Try the standard update_status endpoint first
    try {
      console.log(`🔗 Making API call to: /api/v1/delivery/deliveries/${deliveryId}/update_status/`);
      const result = await this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/update_status/`, { status });
      if (result.success) {
        console.log(`✅ Successfully updated order status to ${status} using delivery ID: ${deliveryId}`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Standard update_status failed for delivery ID ${deliveryId}:`, error);
    }

    // Try smart_update_status as fallback
    try {
      console.log(`🔄 Trying smart_update_status for delivery ID ${deliveryId}`);
      console.log(`🔗 Making API call to: /api/v1/delivery/deliveries/${deliveryId}/smart_update_status/`);
      const result = await this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_update_status/`, { 
        status,
        location: 'Driver App',
        notes: `Status updated to ${status} via mobile app`
      });
      if (result.success) {
        console.log(`✅ Successfully updated order status to ${status} using delivery ID: ${deliveryId} via smart_update`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Smart update_status also failed for delivery ID ${deliveryId}:`, error);
    }

    // If both fail, return error
    return {
      success: false,
      data: undefined,
      error: `Failed to update order status to ${status} using delivery ID ${deliveryId}. Both update_status and smart_update_status endpoints failed.`
    };
  }

  // Smart assignment methods - removed duplicates, using typed versions above

  async smartAcceptDelivery(deliveryId: string, data: SmartDeliveryData): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_accept/`, data);
  }

  async smartUpdateStatus(deliveryId: string, data: SmartStatusUpdateData): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_update_status/`, data);
  }

  async getAvailableOrders(): Promise<ApiResponse<BackendDelivery[]>> {
    // Get smart-filtered available orders for the driver
    return this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');
  }

  async declineDelivery(deliveryId: string, data: DeclineDeliveryData): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/decline/`, data);
  }

  async markDeliveryViewed(deliveryId: string): Promise<ApiResponse<void>> {
    console.log(`👁️ API: Marking delivery ${deliveryId} as viewed`);
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/mark_viewed/`, {});
  }

  /**
   * Estimate time for driver to reach pickup location
   * @param deliveryId Delivery ID
   * @param latitude Driver's current latitude
   * @param longitude Driver's current longitude
   * @param transportationMode Optional transportation mode (bike, car, van)
   * @returns Estimate data including distance, travel time, and estimated arrival time
   */
  async estimatePickupTime(
    deliveryId: string, 
    latitude: number, 
    longitude: number,
    transportationMode?: string
  ): Promise<ApiResponse<EstimatePickupResponse>> {
    const data = {
      driver_latitude: latitude,
      driver_longitude: longitude,
      transportation_mode: transportationMode
    };

    return this.client.post<EstimatePickupResponse>(`/api/v1/delivery/deliveries/${deliveryId}/estimate_pickup/`, data);
  }

  // Get specific order details by ID
  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    const response = await this.client.get<BackendDelivery>(`/api/v1/delivery/deliveries/${orderId}/`);

    if (response.success && response.data) {
      const order = this.transformOrder(response.data);
      return {
        success: true,
        data: order,
        message: response.message
      };
    }

    return response as ApiResponse<Order>;
  }

  // User Management
  async getCurrentUser(): Promise<ApiResponse<UserInfoResponse>> {
    return this.client.get<UserInfoResponse>('/whoami/');
  }

  // Balance Management
  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    console.log('💰 Getting driver balance overview...');
    
    try {
      const response = await this.client.get<any>('/api/v1/users/drivers/balance/');
      
      if (response.success && response.data) {
        const balance: DriverBalance = {
          // Financial data
          totalEarnings: response.data.totalEarnings || 0,
          pendingEarnings: response.data.pendingPayouts || 0,
          totalWithdrawals: response.data.depositBalance || 0,
          availableBalance: response.data.cashOnHand || 0,
          cashOnHand: response.data.cashOnHand || 0,
          depositBalance: response.data.depositBalance || 0,
          todayEarnings: response.data.todayEarnings || 0,
          weekEarnings: response.data.weekEarnings || 0,
          monthEarnings: response.data.monthEarnings || 0,
          pendingPayouts: response.data.pendingPayouts || 0,
          
          // Performance metrics
          averageDeliveryTime: response.data.average_delivery_time || 0,
          availableOrders: response.data.available_orders || 0,
          completedOrders: response.data.completed_orders || 0,
          todayCompletedOrders: response.data.today_completed_orders || 0,
          totalDeliveries: response.data.total_deliveries || 0,
          successfulDeliveries: response.data.successful_deliveries || 0,
          successRate: response.data.success_rate || 0,
          averageRating: response.data.average_rating || 0,
          
          // Period information
          lastUpdated: new Date().toISOString(),
          breakdown: {
            today: response.data.todayEarnings || 0,
            week: response.data.weekEarnings || 0,
            month: response.data.monthEarnings || 0,
            deliveryEarnings: response.data.totalEarnings || 0,
            tips: 0,
            bonuses: 0
          }
        };
        
        console.log('✅ Driver balance retrieved successfully:', balance);
        return {
          success: true,
          data: balance,
          message: response.message
        };
      }
      
      return response as ApiResponse<DriverBalance>;
    } catch (error) {
      console.error('❌ Error getting driver balance:', error);
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Failed to get balance'
      };
    }
  }

  async addDeposit(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/driver/balance/deposit/', { amount });
  }

  async requestWithdrawal(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/driver/balance/withdraw/', { amount });
  }

  async recordCashCollection(orderId: string, amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/auth/drivers/record_cash_collection/', { orderId, amount });
  }

  async getTransactionHistory(): Promise<ApiResponse<BalanceTransaction[]>> {
    console.log('📊 Getting transaction history...');
    
    try {
      // Try multiple possible endpoints for transaction history
      let endpoint = '/api/v1/auth/drivers/transaction_history/';
      let response = await this.client.get<any>(endpoint);
      
      // If 404, try driver balance endpoint which might have transaction data
      if (!response.success && response.error?.includes('404')) {
        console.log('📡 Trying driver balance endpoint for transactions...');
        endpoint = '/api/v1/auth/drivers/balance/';
        response = await this.client.get<any>(endpoint);
        
        // If balance endpoint works but has no transactions, create some sample data for testing
        if (response.success && response.data && !response.data.transactions) {
          const sampleTransactions: BalanceTransaction[] = [
            {
              id: '1',
              type: 'earning',
              amount: 25.50,
              description: 'Delivery completed - Order #12345',
              date: new Date(),
              status: 'completed',
              orderId: '12345'
            },
            {
              id: '2', 
              type: 'earning',
              amount: 18.75,
              description: 'Delivery completed - Order #12344',
              date: new Date(Date.now() - 86400000), // Yesterday
              status: 'completed',
              orderId: '12344'
            },
            {
              id: '3',
              type: 'withdrawal',
              amount: 100.00,
              description: 'Cash withdrawal',
              date: new Date(Date.now() - 172800000), // 2 days ago
              status: 'completed'
            }
          ];
          
          return {
            success: true,
            data: sampleTransactions,
            message: 'Sample transaction data'
          };
        }
      }
      
      if (response.success && response.data) {
        // Handle different response formats
        let transactionData = response.data.transactions || response.data.results || response.data || [];
        
        // If transactionData is not an array, try to extract transactions from it
        if (!Array.isArray(transactionData)) {
          transactionData = [];
        }
        
        const transactions = transactionData.map((transaction: BackendTransactionData): BalanceTransaction => ({
          id: transaction.id || String(Math.random()),
          type: (transaction.transaction_type || transaction.type || 'earning') as BalanceTransaction['type'],
          amount: Number(transaction.amount || 0),
          description: transaction.description || 'Transaction',
          date: transaction.created_at ? new Date(transaction.created_at) : new Date(),
          status: (transaction.status || 'completed') as BalanceTransaction['status'],
          orderId: transaction.order_id || transaction.orderId
        }));
        
        console.log('✅ Transaction history retrieved:', transactions.length);
        return {
          success: true,
          data: transactions,
          message: response.message
        };
      }
      
      return response as ApiResponse<BalanceTransaction[]>;
    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get transaction history'
      };
    }
  }

  // Location tracking
  async updateLocation(latitude: number, longitude: number): Promise<ApiResponse<void>> {
    console.log(`📍 API: Updating location to ${latitude}, ${longitude}`);

    // Use the new update_my_location endpoint that doesn't require driver ID
    const endpoint = `/api/v1/auth/drivers/update_my_location/`;
    console.log(`🎯 Calling location endpoint: ${endpoint}`);

    // Add timestamp and additional data for better tracking
    const locationData = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      accuracy: 10, // meters
      heading: 0, // degrees
      speed: 0, // m/s
      provider: 'mobile_app'
    };

    console.log('📍 Sending location data:', locationData);

    const result = await this.client.post<void>(endpoint, locationData);

    if (result.success) {
      console.log('✅ Location update API call successful');
      
      // Also update the cached driver data with new location
      const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
      if (cachedDriver) {
        const updatedDriver = {
          ...cachedDriver,
          latitude,
          longitude,
          lastLocationUpdate: new Date().toISOString()
        };
        await Storage.setItem(STORAGE_KEYS.DRIVER_DATA, updatedDriver);
      }
    } else {
      console.error('❌ Location update API call failed:', result.error);
      
      // Log additional debugging info
      console.log('🔍 Location update debug info:', {
        endpoint,
        coordinates: { latitude, longitude },
        error: result.error
      });
    }

    return result;
  }

  // Real-time order updates
  async pollNewOrders(): Promise<ApiResponse<Order[]>> {
    console.log('🔄 Polling for new available orders...');

    try {
      const locationService = await import('./locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      const url = `/api/v1/delivery/deliveries/available_orders/?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
      console.log(`📍 Polling with location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
      
      // Get available broadcast orders that drivers can accept
      const response = await this.client.get<BackendDelivery[]>(url);

      if (response.success && response.data) {
        console.log(`📦 Raw response data:`, response.data);
        const dataArray = Array.isArray(response.data) ? response.data : [response.data];
        const orders: Order[] = dataArray.map(this.transformOrder);
        console.log(`📎 Found ${orders?.length || 0} available orders`);

        orders.forEach((order, index) => {
          console.log(`  📄 Order ${index + 1}: ${order.id} - ${order.customer?.name || 'Unknown Customer'} - $${order.total}`);
        });

        return {
          success: true,
          data: orders,
          message: response.message
        };
      } else {
        console.log('⚠️ No orders available or polling failed:', response.error);
      }

      return response as ApiResponse<Order[]>;
    } catch (locationError) {
      console.warn('⚠️ Failed to get location for polling:', locationError);
      
      // Fallback without location
      const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');
      
      if (response.success && response.data) {
        const dataArray = Array.isArray(response.data) ? response.data : [response.data];
        const orders: Order[] = dataArray.map(this.transformOrder);
        console.log(`📎 Found ${orders?.length || 0} available orders (no location filter)`);

        return {
          success: true,
          data: orders,
          message: response.message
        };
      }

      return response as ApiResponse<Order[]>;
    }
  }

  async getNearbyDrivers(latitude: number, longitude: number, radius: number = 5): Promise<ApiResponse<Driver[]>> {
    const response = await this.client.get<BackendDriver[]>(`/api/v1/auth/drivers/nearby_drivers/?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);

    if (response.success && response.data) {
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const drivers: Driver[] = dataArray.map((driverData: BackendDriver) => ({
        id: driverData.id || '',
        firstName: driverData.first_name || driverData.firstName || '',
        lastName: driverData.last_name || driverData.lastName || '',
        email: driverData.email || '',
        phone: driverData.phone_number || driverData.phone || '',
        rating: driverData.rating || 0,
        totalDeliveries: driverData.total_deliveries || 0,
        isOnline: driverData.is_available || driverData.is_online || false,
        profileImage: driverData.profile_image || driverData.avatar,
        vehicleInfo: driverData.vehicle ? {
          type: driverData.vehicle.type || '',
          model: driverData.vehicle.model || '',
          licensePlate: driverData.vehicle.license_plate || ''
        } : undefined,
        distance: driverData.distance_km
      }));

      return {
        success: true,
        data: drivers,
        message: response.message
      };
    }

    return response as ApiResponse<Driver[]>;
  }

  // Tenant Settings
  async getTenantSettings(): Promise<ApiResponse<TenantSettings>> {
    return this.client.get<TenantSettings>('/api/v1/tenants/settings/');
  }

  // Firebase Cloud Messaging
  async updateFcmToken(token: string): Promise<ApiResponse<void>> {
    console.log(`🔔 API: Updating FCM token: ${token.substring(0, 10)}...`);

    // Get the current driver ID
    const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
    let driverId = cachedDriver?.id;

    console.log('Cached driver ID:', driverId);

    if (!driverId) {
      console.log('No cached driver ID, trying to extract from token...');
      const authToken = await SecureStorage.getAuthToken();
      if (authToken) {
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1]));
          driverId = payload.user_id || payload.id || payload.driver_id;
          console.log('Driver ID from token:', driverId);
        } catch (error) {
          console.warn('Failed to decode token for driver ID:', error);
        }
      } else {
        console.error('No auth token found');
      }
    }

    if (!driverId) {
      console.error('❌ Cannot update FCM token: Driver ID not found');
      return {
        success: false,
        data: null!,
        error: 'Driver ID not found'
      };
    }

    const endpoint = '/api/v1/auth/drivers/me/update_fcm_token/';
    console.log(`🎯 Calling FCM token endpoint: ${endpoint}`);

    try {
      const result = await this.client.post<void>(endpoint, {
        fcm_token: token
      });

      if (result.success) {
        console.log('✅ FCM token update API call successful');
      } else {
        console.error('❌ FCM token update API call failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ FCM token update network error:', error);
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Network error updating FCM token'
      };
    }
  }


  // Test polling endpoint
  async testPollingEndpoint(): Promise<ApiResponse<Order[]>> {
    console.log('🧪 Testing polling endpoint...');

    try {
      const result = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');

      if (result.success && result.data) {
        console.log('✅ Polling endpoint works, got', result.data?.length || 0, 'orders');

        // Transform data if needed
        const orders: Order[] = (result.data || []).map(this.transformOrder);
        return {
          success: true,
          data: orders,
          message: 'Polling endpoint test successful'
        };
      }

      return result as ApiResponse<Order[]>;
    } catch (error) {
      console.error('❌ Polling endpoint test failed:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Polling endpoint test failed'
      };
    }
  }

  // Diagnostic method to check driver status and location
  async diagnoseMobileOrderIssue(): Promise<void> {
    console.log('🔍 === MOBILE ORDER DIAGNOSTIC ===');
    
    try {
      // 1. Check driver authentication
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        return;
      }
      
      // 2. Check driver profile
      console.log('📋 Checking driver profile...');
      const driverResponse = await this.getDriverProfile();
      if (driverResponse.success && driverResponse.data) {
        console.log('✅ Driver profile:', {
          id: driverResponse.data.id,
          name: driverResponse.data.name,
          isOnline: driverResponse.data.isOnline,
          isAvailable: driverResponse.data.isAvailable,
          status: driverResponse.data.status
        });
      } else {
        console.error('❌ Failed to get driver profile:', driverResponse.error);
      }
      
      // 3. Check location service status
      console.log('📍 Checking location service...');
      const { locationService } = await import('./locationService');
      console.log('Location service status:', {
        isTracking: locationService.isLocationTracking(),
      });
      
      // 4. Get current location
      try {
        const currentLocation = await locationService.getCurrentLocation();
        console.log('✅ Current location:', {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy
        });
        
        // 5. Test location update
        const locationUpdateResult = await this.updateLocation(
          currentLocation.latitude,
          currentLocation.longitude
        );
        console.log('Location update result:', locationUpdateResult);
        
      } catch (locationError) {
        console.error('❌ Location error:', locationError);
      }
      
      // 6. Check available orders
      console.log('📦 Checking available orders...');
      const ordersResponse = await this.getAvailableOrdersWithDistance();
      if (ordersResponse.success) {
        console.log('✅ Available orders:', {
          count: ordersResponse.data.length,
          orders: ordersResponse.data.map(o => ({
            id: o.id,
            customer: o.customer?.name,
            total: o.total,
            status: o.status
          }))
        });
      } else {
        console.error('❌ Failed to get available orders:', ordersResponse.error);
      }
      
      // 7. Test direct API endpoint
      console.log('🔗 Testing direct API endpoint...');
      const directResponse = await this.client.get<any>('/api/v1/delivery/deliveries/available_orders/');
      console.log('Direct API response:', {
        success: directResponse.success,
        dataLength: directResponse.data?.length || 0,
        error: directResponse.error
      });
      
      // 8. Check driver online status in backend
      console.log('🟢 Checking driver online status...');
      const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
      const driverId = (cachedDriver as Driver)?.id || this.extractDriverIdFromToken(token);
      
      if (driverId) {
        const statusResponse = await this.client.get<any>('/api/v1/auth/drivers/me/');
        if (statusResponse.success) {
          console.log('✅ Driver status from backend:', {
            id: statusResponse.data.id,
            is_online: statusResponse.data.is_online,
            is_available: statusResponse.data.is_available,
            is_on_duty: statusResponse.data.is_on_duty,
            last_location_update: statusResponse.data.last_location_update,
            latitude: statusResponse.data.latitude,
            longitude: statusResponse.data.longitude
          });
        } else {
          console.error('❌ Failed to get driver status:', statusResponse.error);
        }
      }
      
    } catch (error) {
      console.error('💥 Diagnostic error:', error);
    }
    
    console.log('🔍 === END DIAGNOSTIC ===');
  }

  // Helper method to extract driver ID from token
  private extractDriverIdFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || payload.id || payload.driver_id || null;
    } catch {
      return null;
    }
  }

  // ===== EARNINGS AND BALANCE METHODS =====

  /**
   * Get driver earnings summary for a specific period
   */
  async getDriverEarnings(startDate?: string, endDate?: string): Promise<ApiResponse<DriverBalance>> {
    console.log('💰 Getting driver earnings...', { startDate, endDate });
    
    // Debug authentication before trying earnings
    await this.debugDriverAuth();
    
    try {
      // Try multiple possible endpoints for earnings/balance
      let endpoint = '/api/v1/auth/drivers/balance/';
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      console.log('📡 Trying earnings endpoint:', endpoint);
      let response = await this.client.get<any>(endpoint);
      
      // If that fails, try the driver balance endpoint
      if (!response.success && response.error?.includes('404')) {
        console.log('📡 Trying fallback driver balance endpoint...');
        endpoint = '/api/v1/auth/drivers/';
        response = await this.client.get<any>(endpoint);
      }
      
      if (response.success && response.data) {
        // Use custom period earnings if available, otherwise use total earnings
        const periodEarnings = response.data.customPeriodEarnings !== null 
          ? response.data.customPeriodEarnings 
          : response.data.totalEarnings || 0;

        const earnings: DriverBalance = {
          cashOnHand: response.data.cashOnHand || 0,
          depositBalance: response.data.depositBalance || 0,
          totalEarnings: periodEarnings,
          pendingEarnings: response.data.pendingPayouts || 0,
          totalWithdrawals: response.data.totalWithdrawals || 0,
          availableBalance: response.data.availableBalance || response.data.cashOnHand || 0,
          pendingPayouts: response.data.pendingPayouts || 0,
          todayEarnings: response.data.todayEarnings || 0,
          weekEarnings: response.data.weekEarnings || 0,
          monthEarnings: response.data.monthEarnings || 0,
          lastUpdated: new Date().toISOString(),
          breakdown: {
            today: response.data.todayEarnings || 0,
            week: response.data.weekEarnings || 0,
            month: response.data.monthEarnings || 0,
            deliveryEarnings: periodEarnings,
            tips: 0, // Will be available from transactions
            bonuses: 0 // Will be available from transactions
          },
          period: response.data.period || { start_date: startDate, end_date: endDate }
        };
        
        console.log('✅ Driver earnings retrieved successfully:', earnings);
        return {
          success: true,
          data: earnings,
          message: response.message
        };
      }
      
      return response as ApiResponse<DriverBalance>;
    } catch (error) {
      console.error('❌ Error getting driver earnings:', error);
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Failed to get earnings'
      };
    }
  }

  /**
   * Get driver balance transactions (earnings history)
   */
  async getBalanceTransactions(page: number = 1, pageSize: number = 20): Promise<ApiResponse<BalanceTransaction[]>> {
    console.log('📊 Getting balance transactions...', { page, pageSize });
    
    try {
      // Try multiple possible endpoints for transaction history
      let endpoint = `/api/v1/auth/drivers/transaction_history/?page=${page}&page_size=${pageSize}`;
      let response = await this.client.get<any>(endpoint);
      
      // If 404, try the original endpoint without pagination
      if (!response.success && response.error?.includes('404')) {
        console.log('📡 Trying fallback transaction endpoint...');
        endpoint = '/api/v1/auth/drivers/transaction_history/';
        response = await this.client.get<any>(endpoint);
      }
      
      // If still 404, try driver balance endpoint which might have transaction data
      if (!response.success && response.error?.includes('404')) {
        console.log('📡 Trying driver balance endpoint for transactions...');
        endpoint = '/api/v1/auth/drivers/balance/';
        response = await this.client.get<any>(endpoint);
      }
      
      if (response.success && response.data) {
        // Handle different response formats
        let transactionData = response.data.results || response.data.transactions || response.data || [];
        
        // Ensure transactionData is an array
        if (!Array.isArray(transactionData)) {
          console.log('⚠️ Transaction data is not an array:', typeof transactionData);
          transactionData = [];
        }
        
        const transactions = transactionData.map((transaction: BackendTransactionData): BalanceTransaction => ({
          id: transaction.id || String(Math.random()),
          type: (transaction.transaction_type || transaction.type || 'earning') as BalanceTransaction['type'],
          amount: Number(transaction.amount || 0),
          description: transaction.description || 'Transaction',
          date: transaction.created_at ? new Date(transaction.created_at) : new Date(),
          status: (transaction.status || 'completed') as BalanceTransaction['status'],
          orderId: transaction.order_id || transaction.orderId
        }));
        
        console.log('✅ Balance transactions retrieved:', transactions.length);
        return {
          success: true,
          data: transactions,
          message: response.message
        };
      }
      
      return response as ApiResponse<BalanceTransaction[]>;
    } catch (error) {
      console.error('❌ Error getting balance transactions:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get balance transactions'
      };
    }
  }

  /**
   * Get earnings for today only
   */
  async getTodayEarnings(): Promise<ApiResponse<DriverBalance>> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return this.getDriverEarnings(today, today);
  }

  /**
   * Get earnings for this week
   */
  async getWeekEarnings(): Promise<ApiResponse<DriverBalance>> {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));
    
    return this.getDriverEarnings(
      startOfWeek.toISOString().split('T')[0],
      endOfWeek.toISOString().split('T')[0]
    );
  }

  /**
   * Get earnings for this month
   */
  async getMonthEarnings(): Promise<ApiResponse<DriverBalance>> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return this.getDriverEarnings(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
  }

  // ==========================================
  // Batch Leg Methods (New System)
  // ==========================================
  
  async getAvailableBatchLegs(): Promise<ApiResponse<BatchLegListResponse>> {
    console.log('📦 Fetching available batch legs...');
    
    try {
      const locationService = await import('./locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      const url = `/api/v1/delivery/batch-legs/available_legs/?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
      return this.client.get<BatchLegListResponse>(url);
    } catch (locationError) {
      console.warn('⚠️ Failed to get location, fetching legs without location filter:', locationError);
      return this.client.get<BatchLegListResponse>('/api/v1/delivery/batch-legs/available_legs/');
    }
  }

  async getBatchLegDetails(legId: string): Promise<ApiResponse<BatchLeg>> {
    console.log(`📋 Fetching batch leg details: ${legId}`);
    return this.client.get<BatchLeg>(`/api/v1/delivery/batch-legs/${legId}/leg_details/`);
  }

  async acceptBatchLeg(legId: string): Promise<ApiResponse<BatchLegAcceptResponse>> {
    console.log(`✅ Accepting batch leg: ${legId}`);
    return this.client.post<BatchLegAcceptResponse>(`/api/v1/delivery/batch-legs/${legId}/accept_leg/`);
  }

  async declineBatchLeg(legId: string): Promise<ApiResponse<void>> {
    console.log(`❌ Declining batch leg: ${legId}`);
    return this.client.post<void>(`/api/v1/delivery/batch-legs/${legId}/decline_leg/`);
  }

  async getDriverProfileNew(): Promise<ApiResponse<DriverProfile>> {
    console.log('👤 Fetching driver profile...');
    return this.client.get<DriverProfile>('/api/v1/drivers/driver-profile/');
  }

  async updateDriverProfile(profile: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    console.log('💾 Updating driver profile...');
    return this.client.put<DriverProfile>('/api/v1/drivers/driver-profile/', profile);
  }
}

// Production API Service
export const apiService = new ApiService();

// Export delivery-specific methods for convenience
export const deliveryApi = {
  getOngoingDeliveries: () => apiService.getOngoingDeliveries(),
  getRouteOptimization: () => apiService.getRouteOptimization(),
  getAvailableOrders: () => apiService.getAvailableOrders(),
  getOrderDetails: (orderId: string) => apiService.getOrderDetails(orderId),
  smartAcceptDelivery: (deliveryId: string, data: SmartDeliveryData) => apiService.smartAcceptDelivery(deliveryId, data),
  smartUpdateStatus: (deliveryId: string, data: SmartStatusUpdateData) => apiService.smartUpdateStatus(deliveryId, data),
  declineDelivery: (deliveryId: string, data: DeclineDeliveryData) => apiService.declineDelivery(deliveryId, data),
  markDeliveryViewed: (deliveryId: string) => apiService.markDeliveryViewed(deliveryId),
  diagnoseMobileOrderIssue: () => apiService.diagnoseMobileOrderIssue(),
  debugDriverAuth: () => apiService.debugDriverAuth(),
  // Batch operations
  getAvailableBatches: () => apiService.getAvailableBatches(),
  getBatchDetails: (batchId: string) => apiService.getBatchDetails(batchId),
  acceptBatch: (batchId: string) => apiService.acceptBatchOrder(batchId),
  updateBatchStatus: (batchId: string, status: string, data?: Record<string, unknown>) => apiService.updateBatchStatus(batchId, status, data),
};
