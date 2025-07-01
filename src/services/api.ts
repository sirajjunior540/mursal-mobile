import { 
  ApiResponse, 
  AuthUser, 
  Driver, 
  DriverBalance, 
  Order, 
  OrderStatus,
  BalanceTransaction,
  LoginRequest,
  LoginResponse,
  Tenant,
  TenantSettings
} from '../types';
import { API_CONFIG, TENANT_CONFIG, STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { ENV, getApiUrl, getTenantHost, apiDebug } from '../config/environment';

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
      'Host': getTenantHost(), // Required for Django tenant resolution
    };

    // Add Authorization header only if token exists and is valid
    if (token && token.trim()) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    // Log API calls for debugging
    apiDebug(`${options.method || 'GET'} ${url}`);
    apiDebug('Host header:', getTenantHost());
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
      console.log('Making API request to:', url);

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

      console.log(`API Success: ${url}`, data);
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

      console.log(`API Error [${endpoint}]:`, error);
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
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Connection failed. Please check if the server is running and try again.';
        } else if (error.message.includes('ERR_NETWORK')) {
          errorMessage = `Network connection failed. Check if server is accessible at ${  this.baseURL}`;
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

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
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
      console.error('⚠️ Token validation error:', error);
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

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          refresh: refreshToken
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Token refresh failed:', response.status, errorData);

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
        console.error('❌ Refresh response missing access token:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh network error:', error);
      return false;
    }
  }

  /**
   * Check if an error is an authentication error
   */
  private isAuthError(error: any): boolean {
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
    const tokenResponse = await this.client.post<any>('/api/v1/auth/token/', {
      username: credentials.username,
      password: credentials.password
    });

    if (!tokenResponse.success || !tokenResponse.data) {
      return {
        success: false,
        data: null as any,
        error: tokenResponse.error || 'Invalid email or password'
      };
    }

    // Store the access token securely
    const token = tokenResponse.data.access || tokenResponse.data.token;
    await SecureStorage.setAuthToken(token);

    // Store refresh token if available
    if (tokenResponse.data.refresh) {
      await SecureStorage.setRefreshToken(tokenResponse.data.refresh);
    }

    // Now fetch driver profile using the token
    const driverResponse = await this.getDriverProfile();

    if (!driverResponse.success || !driverResponse.data) {
      return {
        success: false,
        data: null as any,
        error: 'Failed to fetch driver profile'
      };
    }

    // Construct the response in the expected format
    const user: AuthUser = {
      id: driverResponse.data.id || '',
      username: credentials.username,
      email: driverResponse.data.email || '',
      firstName: driverResponse.data.firstName || '',
      lastName: driverResponse.data.lastName || '',
      phone: driverResponse.data.phone || '',
      token,
      tenantId
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

    // Use the driver ID in the URL - Django ViewSet will handle the lookup
    const endpoint = driverId 
      ? `/api/v1/auth/drivers/${driverId}/` 
      : '/api/v1/auth/drivers/';

    const response = await this.client.get<any>(endpoint);

    // Transform backend response to match our Driver type
    if (response.success && response.data) {
      const driver: Driver = {
        id: response.data.id || '',
        firstName: response.data.first_name || response.data.firstName || '',
        lastName: response.data.last_name || response.data.lastName || '',
        email: response.data.email || '',
        phone: response.data.phone_number || response.data.phone || '',
        rating: response.data.rating || 0,
        totalDeliveries: response.data.total_deliveries || 0,
        isOnline: response.data.is_available || response.data.is_online || false,
        profileImage: response.data.profile_image || response.data.avatar,
        vehicleInfo: response.data.vehicle ? {
          type: response.data.vehicle.type,
          model: response.data.vehicle.model,
          licensePlate: response.data.vehicle.license_plate
        } : undefined
      };

      return {
        success: true,
        data: driver,
        message: response.message
      };
    }

    return response;
  }

  async updateDriverStatus(isOnline: boolean): Promise<ApiResponse<void>> {
    // Get the current driver ID
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
        data: null as any,
        error: 'Driver ID not found'
      };
    }

    // Use the new update_status endpoint with comprehensive online status
    // Set both is_available and is_on_duty to ensure orders appear when online
    return this.client.post<void>(`/api/v1/auth/drivers/${driverId}/update_status/`, {
      is_online: isOnline,
      is_available: isOnline,  // Required for available_orders endpoint
      is_on_duty: isOnline     // Required for available_orders endpoint
    });
  }

  // Orders
  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    // Get available orders for the driver to accept (unassigned/broadcast orders)
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/available_orders/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      console.log('🔍 DEBUG: available_orders raw response:');
      response.data.forEach((item, index) => {
        console.log(`Order ${index}:`, {
          id: item.id,
          order_id: item.order?.id,
          order_number: item.order?.order_number || item.order_number,
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
  }

  async getOrderHistory(filter?: string): Promise<ApiResponse<Order[]>> {
    // Use the correct ViewSet endpoint for deliveries with optional filtering
    const endpoint = filter ? `/api/v1/delivery/deliveries/?${filter}` : '/api/v1/delivery/deliveries/';
    const response = await this.client.get<any[]>(endpoint);

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
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/completed/');

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
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/failed/');

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

  async getDriverOrders(): Promise<ApiResponse<Order[]>> {
    console.log('📋 Fetching driver orders...');
    
    // Use by_driver endpoint as primary since it has complete order data
    // Based on backend testing, this endpoint includes ASSIGNED status deliveries
    console.log('🚛 Using by_driver endpoint (includes complete order data)...');
    
    try {
      const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/by_driver/');
      
      if (response.success && response.data) {
        console.log(`🔍 Raw backend response: ${response.data.length} delivery records`);
        
        const orders: Order[] = (response.data || []).map((backendItem, index) => {
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
      console.warn(`⚠️ by_driver endpoint failed: ${errorMessage}`);
      
      // If by_driver fails, try ongoing-deliveries as fallback (but it has incomplete data)
      if (errorMessage.includes('429') || errorMessage.includes('404') || errorMessage.includes('403')) {
        console.log('🔄 Falling back to ongoing-deliveries endpoint (incomplete data)...');
        
        try {
          const fallbackResponse = await this.client.get<any>('/api/v1/delivery/deliveries/ongoing-deliveries/');
          
          if (fallbackResponse.success && fallbackResponse.data) {
            // Extract deliveries array from the response
            const deliveriesData = fallbackResponse.data.deliveries || fallbackResponse.data;
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

  async getRouteOptimization(): Promise<ApiResponse<any>> {
    console.log('🗺️ Fetching route optimization from backend...');
    return this.client.get<any>('/api/v1/delivery/deliveries/route-optimization/');
  }

  async getOngoingDeliveries(): Promise<ApiResponse<Order[]>> {
    console.log('🚚 Fetching ongoing deliveries...');
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/ongoing-deliveries/');

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

  async updateDriverLocation(latitude: number, longitude: number): Promise<ApiResponse<void>> {
    console.log(`📍 Updating driver location: ${latitude}, ${longitude}`);
    return this.client.post<void>('/api/v1/auth/drivers/update-location/', {
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  }

  async smartAcceptOrder(orderId: string): Promise<ApiResponse<any>> {
    console.log(`🎯 Smart accepting order: ${orderId}`);
    return this.client.post<any>(`/api/v1/delivery/deliveries/${orderId}/smart_accept/`);
  }

  async getAvailableOrdersWithDistance(): Promise<ApiResponse<Order[]>> {
    console.log('📍 Fetching available orders with distance filtering...');
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/available_orders/');

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

  // Helper function to determine correct order status
  private transformOrderStatus = (delivery: any, order: any): string => {
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
  private transformOrder = (backendData: any): Order => {
    // Debug log to understand structure
    console.log('🔄 transformOrder input:', {
      hasId: !!backendData.id,
      hasOrder: !!(backendData.order && typeof backendData.order === 'object'),
      hasDriver: 'driver' in backendData,
      topLevelKeys: Object.keys(backendData).slice(0, 10)
    });

    // Check if this is a delivery object with nested order or a direct order object
    const isDelivery = backendData.order && typeof backendData.order === 'object';
    const order = isDelivery ? backendData.order : backendData;
    const delivery = isDelivery ? backendData : null;

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

    let customerData = {};
    
    // Handle case where customer is just an ID (needs to be fixed in backend)
    if (typeof order.customer === 'number' || typeof order.customer === 'string') {
      console.warn('⚠️ Customer field is just an ID, not an object. Backend should return customer_details.');
      customerData = {
        id: order.customer,
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email
      };
    } else {
      customerData = order.customer_details ||  // Use customer_details first (contains full object)
                    order.customer || 
                    delivery?.customer_details || 
                    delivery?.customer || 
                    {};
    }

    // Fallback customer data if missing
    const customer = {
      id: customerData.id || order.customer_id || delivery?.customer_id || order.customer || `customer_${order.id || 'unknown'}`,
      name: customerData.name || 
            customerData.full_name || 
            order.customer_name || 
            delivery?.customer_name ||
            `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() ||
            'Unknown Customer',
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
    const primaryId = backendData.id || delivery?.id || order.id || '';

    console.log('🆔 ID Resolution:', {
      primaryId,
      backendDataId: backendData.id,
      deliveryId: delivery?.id,
      orderId: order.id,
      isFromAvailableOrders: !delivery && backendData.id && backendData.order
    });

    return {
      id: primaryId,  // This must be the delivery ID for API calls
      deliveryId: delivery?.id || backendData.id || '', // Store delivery ID separately
      orderId: order.id || '', // Store order ID separately
      orderNumber: order.order_number || order.orderNumber || `#${order.id}`,
      customer,
      items: (order.items || order.order_items || []).map((item: any) => ({
        id: item.id || '',
        name: item.product_details?.name || item.product?.name || item.name || '',
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
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
      restaurantAddress: {
        id: '',
        street: '', // Restaurant info not in current backend
        city: '',
        state: '',
        zipCode: '',
        coordinates: undefined
      },
      // CRITICAL: Add coordinate fields that RouteNavigationScreen expects
      pickup_latitude: parseFloat(order.pickup_latitude) || null,
      pickup_longitude: parseFloat(order.pickup_longitude) || null,
      delivery_latitude: parseFloat(order.delivery_latitude) || null,
      delivery_longitude: parseFloat(order.delivery_longitude) || null,
      pickup_address: order.pickup_address || '',
      delivery_address: order.delivery_address || '',
      status: this.transformOrderStatus(delivery, order),
      paymentMethod: order.payment_method || 'cash',
      subtotal: parseFloat(order.subtotal) || 0,
      deliveryFee: parseFloat(order.delivery_fee) || 0,
      tax: parseFloat(order.tax) || 0,
      tip: 0, // Tip not in current backend
      total: parseFloat(order.total) || 0,
      estimatedDeliveryTime: delivery?.estimated_delivery_time || order.scheduled_delivery_time || '',
      specialInstructions: order.delivery_notes || '',
      orderTime: order.created_at ? new Date(order.created_at) : new Date(),
      acceptedTime: delivery?.created_at ? new Date(delivery.created_at) : undefined,
      pickedUpTime: delivery?.pickup_time ? new Date(delivery.pickup_time) : undefined,
      deliveredTime: delivery?.delivery_time ? new Date(delivery.delivery_time) : undefined,
      // Add delivery-specific fields if this is a delivery object
      driverId: delivery?.driver,
      driverName: delivery?.driver_name,
      // Debug info
      _rawDriverId: delivery?.driver,
      _hasDelivery: !!delivery
    };
  }

  async acceptOrder(orderId: string): Promise<ApiResponse<void>> {
    console.log(`🎯 Attempting to accept order: ${orderId}`);
    
    // Debug: Check current user info before making the request
    try {
      const userResponse = await this.client.get<any>('/whoami/');
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
    
    return this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/accept/`);
  }

  async declineOrder(orderId: string): Promise<ApiResponse<void>> {
    console.log(`🚫 API: Attempting to decline order/delivery: ${orderId}`);

    // Direct decline attempt
    const result = await this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/decline/`);

    if (!result.success) {
      console.error(`❌ Decline failed for ID ${orderId}:`, result.error);

      // If error mentions "you can only decline", it means backend needs fixing
      if (result.error?.toLowerCase().includes('you can only decline')) {
        console.error('⚠️ Backend decline logic needs update - see quick_backend_fix.py');
      }
    } else {
      console.log(`✅ Successfully declined order/delivery: ${orderId}`);
    }

    return result;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    // Use the custom action endpoint for updating delivery status
    return this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/update_status/`, { status });
  }

  // Smart assignment methods
  async getOngoingDeliveries(): Promise<ApiResponse<any>> {
    return this.client.get<any>('/api/v1/delivery/deliveries/ongoing-deliveries/');
  }

  async getRouteOptimization(): Promise<ApiResponse<any>> {
    return this.client.get<any>('/api/v1/delivery/deliveries/route-optimization/');
  }

  async smartAcceptDelivery(deliveryId: string, data: { location?: string; latitude?: number; longitude?: number; notes?: string }): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_accept/`, data);
  }

  async smartUpdateStatus(deliveryId: string, data: { status: string; location?: string; latitude?: number; longitude?: number; notes?: string }): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_update_status/`, data);
  }

  async getAvailableOrders(): Promise<ApiResponse<any[]>> {
    // Get smart-filtered available orders for the driver
    return this.client.get<any[]>('/api/v1/delivery/deliveries/available_orders/');
  }

  async declineDelivery(deliveryId: string, data: { location?: string; reason?: string }): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/decline/`, data);
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
  ): Promise<ApiResponse<any>> {
    const data = {
      driver_latitude: latitude,
      driver_longitude: longitude,
      transportation_mode: transportationMode
    };

    return this.client.post<any>(`/api/v1/delivery/deliveries/${deliveryId}/estimate_pickup/`, data);
  }

  // Get specific order details by ID
  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    const response = await this.client.get<any>(`/api/v1/delivery/deliveries/${orderId}/`);

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
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.client.get<any>('/whoami/');
  }

  // Balance Management
  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    return this.client.get<DriverBalance>('/api/v1/auth/drivers/balance/');
  }

  async addDeposit(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/driver/balance/deposit/', { amount });
  }

  async requestWithdrawal(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/driver/balance/withdraw/', { amount });
  }

  async recordCashCollection(orderId: string, amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/driver/cash/collect/', { orderId, amount });
  }

  async getTransactionHistory(): Promise<ApiResponse<BalanceTransaction[]>> {
    return this.client.get<BalanceTransaction[]>('/api/v1/driver/balance/transactions/');
  }

  // Location tracking
  async updateLocation(latitude: number, longitude: number): Promise<ApiResponse<void>> {
    console.log(`📍 API: Updating location to ${latitude}, ${longitude}`);

    // Get the current driver ID
    const cachedDriver = await Storage.getItem<Driver>(STORAGE_KEYS.DRIVER_DATA);
    let driverId = cachedDriver?.id;

    console.log('Cached driver ID:', driverId);

    if (!driverId) {
      console.log('No cached driver ID, trying to extract from token...');
      const token = await SecureStorage.getAuthToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
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
      console.error('❌ Cannot update location: Driver ID not found');
      return {
        success: false,
        data: null as any,
        error: 'Driver ID not found'
      };
    }

    const endpoint = `/api/v1/auth/drivers/${driverId}/update_location/`;
    console.log(`🎯 Calling location endpoint: ${endpoint}`);

    const result = await this.client.post<void>(endpoint, {
      latitude: latitude,
      longitude: longitude
    });

    if (result.success) {
      console.log('✅ Location update API call successful');
    } else {
      console.error('❌ Location update API call failed:', result.error);
    }

    return result;
  }

  // Real-time order updates
  async pollNewOrders(): Promise<ApiResponse<Order[]>> {
    console.log('🔄 Polling for new available orders...');

    // Get available broadcast orders that drivers can accept
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/available_orders/');

    if (response.success && response.data) {
      console.log(`📦 Raw response data:`, response.data);
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const orders: Order[] = dataArray.map(this.transformOrder);
      console.log(`📎 Found ${orders?.length || 0} available orders`);

      orders.forEach((order, index) => {
        console.log(`  📄 Order ${index + 1}: ${order.id} - ${order.customer.name} - $${order.total}`);
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
  }

  async getNearbyDrivers(latitude: number, longitude: number, radius: number = 5): Promise<ApiResponse<Driver[]>> {
    const response = await this.client.get<any[]>(`/api/v1/auth/drivers/nearby_drivers/?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);

    if (response.success && response.data) {
      const dataArray = Array.isArray(response.data) ? response.data : [response.data];
      const drivers: Driver[] = dataArray.map((driverData: any) => ({
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
          type: driverData.vehicle.type,
          model: driverData.vehicle.model,
          licensePlate: driverData.vehicle.license_plate
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
        data: null as any,
        error: 'Driver ID not found'
      };
    }

    const endpoint = `/api/v1/auth/drivers/${driverId}/update_fcm_token/`;
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
        data: null as any,
        error: error instanceof Error ? error.message : 'Network error updating FCM token'
      };
    }
  }


  // Test polling endpoint
  async testPollingEndpoint(): Promise<ApiResponse<Order[]>> {
    console.log('🧪 Testing polling endpoint...');

    try {
      const result = await this.client.get<any[]>('/api/v1/delivery/deliveries/available_orders/');

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
}

// Production API Service
export const apiService = new ApiService();

// Export delivery-specific methods for convenience
export const deliveryApi = {
  getOngoingDeliveries: () => apiService.getOngoingDeliveries(),
  getRouteOptimization: () => apiService.getRouteOptimization(),
  getAvailableOrders: () => apiService.getAvailableOrders(),
  getOrderDetails: (orderId: string) => apiService.getOrderDetails(orderId),
  smartAcceptDelivery: (deliveryId: string, data: any) => apiService.smartAcceptDelivery(deliveryId, data),
  smartUpdateStatus: (deliveryId: string, data: any) => apiService.smartUpdateStatus(deliveryId, data),
  declineDelivery: (deliveryId: string, data: any) => apiService.declineDelivery(deliveryId, data),
};
