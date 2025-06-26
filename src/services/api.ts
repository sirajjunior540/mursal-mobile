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
import { Storage } from '../utils';

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
    const url = `${this.baseURL}${endpoint}`;

    // Get auth token and tenant ID
    const [token, tenantId] = await Promise.all([
      Storage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN),
      Storage.getItem<string>(TENANT_CONFIG.TENANT_STORAGE_KEY) || TENANT_CONFIG.DEFAULT_TENANT
    ]);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      [TENANT_CONFIG.TENANT_HEADER]: tenantId,
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Add timeout using AbortController
      signal: AbortSignal.timeout(this.timeout),
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error',
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
}

/**
 * API Service for DriverApp
 */
class ApiService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient(API_CONFIG.BASE_URL, API_CONFIG.TIMEOUT);
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Store tenant ID if provided
    if (credentials.tenantId) {
      await Storage.setItem(TENANT_CONFIG.TENANT_STORAGE_KEY, credentials.tenantId);
    }
    return this.client.post<LoginResponse>('/auth/login', credentials);
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.client.post<void>('/auth/logout');
  }

  // Driver Profile
  async getDriverProfile(): Promise<ApiResponse<Driver>> {
    return this.client.get<Driver>('/driver/profile');
  }

  async updateDriverStatus(isOnline: boolean): Promise<ApiResponse<void>> {
    return this.client.put<void>('/driver/status', { isOnline });
  }

  // Orders
  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    return this.client.get<Order[]>('/driver/orders');
  }

  async getOrderHistory(filter?: string): Promise<ApiResponse<Order[]>> {
    const endpoint = filter ? `/driver/orders/history?filter=${filter}` : '/driver/orders/history';
    return this.client.get<Order[]>(endpoint);
  }

  async acceptOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/driver/orders/${orderId}/accept`);
  }

  async declineOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/driver/orders/${orderId}/decline`);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    return this.client.put<void>(`/driver/orders/${orderId}/status`, { status });
  }

  // Balance Management
  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    return this.client.get<DriverBalance>('/driver/balance');
  }

  async addDeposit(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/driver/balance/deposit', { amount });
  }

  async requestWithdrawal(amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/driver/balance/withdraw', { amount });
  }

  async recordCashCollection(orderId: string, amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/driver/cash/collect', { orderId, amount });
  }

  async getTransactionHistory(): Promise<ApiResponse<BalanceTransaction[]>> {
    return this.client.get<BalanceTransaction[]>('/driver/balance/transactions');
  }
}

// Mock Data Service for Development
class MockApiService extends ApiService {
  private mockDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

  private generateMockOrders(): Order[] {
    return [
      {
        id: '1',
        orderNumber: 'ORD-2024-001',
        customer: {
          id: 'c1',
          name: 'John Smith',
          phone: '+1-555-0123',
          email: 'john@example.com',
        },
        items: [
          { id: 'i1', name: 'Chicken Burger', quantity: 2, price: 12.99 },
          { id: 'i2', name: 'French Fries', quantity: 1, price: 4.99 },
        ],
        deliveryAddress: {
          id: 'a1',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          apartmentUnit: 'Apt 4B',
          deliveryInstructions: 'Ring doorbell twice',
        },
        restaurantAddress: {
          id: 'a2',
          street: '456 Restaurant Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
        },
        status: 'pending',
        paymentMethod: 'cash',
        subtotal: 30.97,
        deliveryFee: 3.99,
        tax: 2.78,
        tip: 5.00,
        total: 42.74,
        estimatedDeliveryTime: '25 min',
        specialInstructions: 'Extra napkins please',
        orderTime: new Date(),
      },
    ];
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    await this.mockDelay();

    // Store tenant ID if provided
    if (credentials.tenantId) {
      await Storage.setItem(TENANT_CONFIG.TENANT_STORAGE_KEY, credentials.tenantId);
    }

    if (credentials.email === 'driver@test.com' && credentials.password === 'password') {
      const tenantId = credentials.tenantId || TENANT_CONFIG.DEFAULT_TENANT;

      const mockUser: AuthUser = {
        id: '1',
        email: credentials.email,
        firstName: 'John',
        lastName: 'Driver',
        phone: '+1-555-0123',
        token: 'mock-jwt-token-12345',
        tenantId: tenantId,
      };

      const mockDriver: Driver = {
        id: '1',
        firstName: 'John',
        lastName: 'Driver',
        email: credentials.email,
        phone: '+1-555-0123',
        rating: 4.8,
        totalDeliveries: 247,
        isOnline: true,
      };

      const mockTenant: Tenant = {
        id: tenantId,
        name: tenantId === 'restaurant1' ? 'Restaurant One' : 
              tenantId === 'restaurant2' ? 'Restaurant Two' : 
              'Default Restaurant',
        logo: `https://api.mursal.com/tenants/${tenantId}/logo.png`,
        primaryColor: tenantId === 'restaurant1' ? '#FF5722' : 
                      tenantId === 'restaurant2' ? '#2196F3' : 
                      '#4CAF50',
      };

      return {
        success: true,
        data: { 
          user: mockUser, 
          driver: mockDriver,
          tenant: mockTenant
        },
      };
    }

    return {
      success: false,
      data: null as any,
      error: 'Invalid credentials',
    };
  }

  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    await this.mockDelay(500);
    return {
      success: true,
      data: this.generateMockOrders(),
    };
  }

  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    await this.mockDelay(500);
    return {
      success: true,
      data: {
        cashOnHand: 145.50,
        depositBalance: 500.00,
        totalEarnings: 2847.30,
        pendingPayouts: 234.75,
        todayEarnings: 85.25,
        weekEarnings: 456.80,
        monthEarnings: 1234.50,
      },
    };
  }
}

// Export appropriate service based on environment
const isDevelopment = __DEV__;
export const apiService = isDevelopment ? new MockApiService() : new ApiService();
