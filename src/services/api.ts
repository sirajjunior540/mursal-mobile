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
  Tenant
} from '../types';
import { API_CONFIG, TENANT_CONFIG, STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';

/**
 * HTTP Client for API requests
 */
class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Get auth token from secure storage
    const token = await SecureStorage.getAuthToken();

    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Host': API_CONFIG.HOST, // Required for Django tenant resolution
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Log API calls for debugging
    console.log(`API Call: ${options.method || 'GET'} ${url}`);
    console.log('Host header:', API_CONFIG.HOST);
    if (token) {
      console.log('Using auth token:', token.substring(0, 20) + '...');
    } else {
      console.log('No auth token available');
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
      console.error(`API Error [${endpoint}]:`, error);
      console.error('Request details:', { url, headers: defaultHeaders });

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide user-friendly messages for common errors
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Connection failed. Please check if the server is running and try again.';
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
}

/**
 * API Service for DriverApp
 */
class ApiService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient(API_CONFIG.BASE_URL, API_CONFIG.TIMEOUT);
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return API_CONFIG.BASE_URL;
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
      token: token,
      tenantId: tenantId
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

    // Use the correct endpoint - toggle_availability action
    return this.client.patch<void>(`/api/v1/auth/drivers/${driverId}/toggle_availability/`);
  }

  // Orders
  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    // Use the custom action endpoint for active deliveries
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/active/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const orders: Order[] = response.data.map(this.transformOrder);
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
      const orders: Order[] = response.data.map(this.transformOrder);
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
      const orders: Order[] = response.data.map(this.transformOrder);
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
      const orders: Order[] = response.data.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  async getDriverOrders(): Promise<ApiResponse<Order[]>> {
    // Use the custom action endpoint for current driver's deliveries
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/by_driver/');

    // Transform backend response to match our Order type
    if (response.success && response.data) {
      const orders: Order[] = response.data.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  // Helper method to transform backend delivery/order to frontend Order type
  private transformOrder = (backendData: any): Order => {
    // Check if this is a delivery object with nested order or a direct order object
    const isDelivery = backendData.order && typeof backendData.order === 'object';
    const order = isDelivery ? backendData.order : backendData;
    const delivery = isDelivery ? backendData : null;

    return {
      id: order.id || '',
      orderNumber: order.order_number || order.orderNumber || '',
      customer: {
        id: order.customer?.id || order.customer_details?.id || '',
        name: order.customer?.name || order.customer_details?.name || order.customer_name || '',
        phone: order.customer?.phone || order.customer_details?.phone || '',
        email: order.customer?.email || order.customer_details?.email || ''
      },
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
      status: delivery?.status || order.status || 'pending',
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
      deliveryId: delivery?.id,
      driverId: delivery?.driver,
      driverName: delivery?.driver_name
    };
  }

  async acceptOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/accept/`);
  }

  async declineOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/decline/`);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    // Use the custom action endpoint for updating delivery status
    return this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/update_status/`, { status });
  }

  // Balance Management
  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    return this.client.get<DriverBalance>('/api/v1/driver/balance/');
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

    return this.client.post<void>(`/api/v1/auth/drivers/${driverId}/update_location/`, {
      latitude: latitude.toString(),
      longitude: longitude.toString()
    });
  }

  // Real-time order updates
  async pollNewOrders(): Promise<ApiResponse<Order[]>> {
    // Get new orders assigned to the current driver
    const response = await this.client.get<any[]>('/api/v1/delivery/deliveries/new_assignments/');
    
    if (response.success && response.data) {
      const orders: Order[] = response.data.map(this.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }

    return response as ApiResponse<Order[]>;
  }

  async getNearbyDrivers(latitude: number, longitude: number, radius: number = 5): Promise<ApiResponse<Driver[]>> {
    const response = await this.client.get<any[]>(`/api/v1/auth/drivers/nearby_drivers/?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
    
    if (response.success && response.data) {
      const drivers: Driver[] = response.data.map((driverData: any) => ({
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
}

// Production API Service
export const apiService = new ApiService();
