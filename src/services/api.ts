import { STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { ENV, getTenantHost, apiDebug } from '../config/environment';
import { ApiEndpoints } from './apiEndpoints';
import { ApiResponse } from '../types';

// Re-export types and interfaces from the split modules
export * from './apiTypes';
export { ApiTransformers } from './apiTransformers';

/**
 * HTTP Client for making API requests
 */
export class HttpClient {
  private baseUrl: string;
  private tenantHost: string;
  private clientType: string = 'mobile';

  constructor() {
    this.tenantHost = getTenantHost();
    this.baseUrl = ENV.API_BASE_URL;
    apiDebug('API Service initialized with:', {
      tenantHost: this.tenantHost,
      baseUrl: this.baseUrl,
      env: ENV
    });
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Type': this.clientType,
      'Host': this.tenantHost,
    };

    const authToken = await SecureStorage.getAuthToken();
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const tenantId = await Storage.getItem(STORAGE_KEYS.TENANT_ID);
    if (tenantId && typeof tenantId === 'string') {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  private handleError(error: unknown): ApiResponse<never> {
    apiDebug('API Error:', error);
    
    if (error instanceof Error) {
      // Network error or fetch failure
      return {
        success: false,
        error: error.message || 'Network error occurred',
        data: null as never
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null as never
    };
  }

  // Helper methods for common HTTP verbs
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = await this.getAuthHeaders();

      apiDebug(`API Request: ${options.method || 'GET'} ${url}`);
      apiDebug('Request headers:', headers);
      if (options.body) {
        apiDebug('Request body:', options.body);
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } else {
        data = await response.text();
      }

      apiDebug(`API Response: ${response.status}`, data);

      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        const refreshToken = await SecureStorage.getRefreshToken();
        if (refreshToken && endpoint !== '/api/v1/auth/token/refresh/') {
          // Try to refresh the token
          const refreshResponse = await this.refreshAuthToken();
          if (refreshResponse.success) {
            // Retry the original request with new token
            return this.request<T>(endpoint, options);
          }
        }
        
        // If refresh failed or no refresh token, return error
        return {
          success: false,
          data: null as T,
          error: (data as { detail?: string })?.detail || 'Authentication failed'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          data: null as T,
          error: (data as { detail?: string; error?: string })?.detail || (data as { detail?: string; error?: string })?.error || `Request failed with status ${response.status}`
        };
      }

      return {
        success: true,
        data: data as T
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async refreshAuthToken(): Promise<ApiResponse<{ access: string }>> {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          data: null as unknown as { access: string },
          error: 'No refresh token available'
        };
      }

      const response = await fetch(`${this.baseUrl}/api/v1/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          await SecureStorage.setAuthToken(data.access);
          return {
            success: true,
            data: { access: data.access }
          };
        }
      }

      return {
        success: false,
        data: null as unknown as { access: string },
        error: 'Failed to refresh token'
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async uploadFile(
    endpoint: string,
    file: File | Blob,
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<unknown>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const headers = await this.getAuthHeaders();
      delete (headers as Record<string, string>)['Content-Type']; // Let browser set content-type for FormData

      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: null as unknown,
          error: (data as { detail?: string })?.detail || 'Upload failed'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * Main API Service
 * 
 * This is the main API service that applications should use.
 * It provides all API methods through the ApiEndpoints class.
 */
class ApiService extends ApiEndpoints {
  private static instance: ApiService;
  private readonly httpClient: HttpClient;

  constructor() {
    const client = new HttpClient();
    super(client);
    this.httpClient = client;
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Expose the HTTP client for any direct usage needs
  getClient(): HttpClient {
    return this.httpClient;
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();

// Legacy exports for backward compatibility
export const deliveryApi = {
  getMyOrders: () => apiService.getDriverOrders(),
  getAvailableOrders: () => apiService.getAvailableOrders(),
  getOrderDetails: (orderId: string) => apiService.getOrderDetails(orderId),
  acceptDelivery: (deliveryId: string) => apiService.acceptOrder(deliveryId),
  declineDelivery: (deliveryId: string, _reason?: string) => apiService.declineOrder(deliveryId),
  updateDeliveryStatus: (deliveryId: string, status: string, _location?: { latitude: number; longitude: number }, _notes?: string) => 
    apiService.updateOrderStatus(deliveryId, status as import('../types').OrderStatus),
  completeDelivery: (deliveryId: string, _signature?: string, _notes?: string) => 
    apiService.updateOrderStatus(deliveryId, 'delivered'),
  uploadProofOfDelivery: (deliveryId: string, file: File | Blob) => 
    apiService.getClient().uploadFile(`/api/v1/delivery/deliveries/${deliveryId}/proof/`, file),
};