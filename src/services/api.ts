import { STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { ENV, getTenantHost } from '../config/environment';
import { ApiEndpoints } from './apiEndpoints';
import { ApiResponse } from '../types';
import { authService } from './api/authService';

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
    
    // Log the configuration for debugging
    console.log('[HttpClient] Initialized with:', {
      baseUrl: this.baseUrl,
      tenantHost: this.tenantHost,
      serverIP: ENV.SERVER_IP,
      serverPort: ENV.SERVER_PORT,
      protocol: ENV.SERVER_PROTOCOL
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
      console.log('[API] Auth token present, length:', authToken.length);
    } else {
      console.log('[API] No auth token found!');
    }

    const tenantId = await Storage.getItem(STORAGE_KEYS.TENANT_ID);
    if (tenantId && typeof tenantId === 'string') {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  private handleError(error: unknown): ApiResponse<never> {
    if (error instanceof Error) {
      // Network error or fetch failure
      console.error('[HttpClient] Network error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message || 'Network error occurred',
        data: null as never,
        statusCode: 0, // Network error, no HTTP status
        message: `Network Error: ${error.message}`
      };
    }
    
    console.error('[HttpClient] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null as never,
      statusCode: 0,
      message: 'Unexpected error'
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
      // Ensure endpoint has a leading slash
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${this.baseUrl}${cleanEndpoint}`;
      const headers = await this.getAuthHeaders();

      // Log the full URL for debugging
      console.log(`[HttpClient] Making ${options.method || 'GET'} request to: ${url}`);


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


      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        const refreshToken = await SecureStorage.getRefreshToken();
        if (refreshToken && endpoint !== '/api/v1/auth/refresh/') {
          console.log('[HttpClient] Got 401, attempting token refresh...');

          // Try to refresh the token using authService
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            console.log('[HttpClient] Token refreshed, retrying request...');
            // Retry the original request with new token
            return this.request<T>(endpoint, options);
          }
        }
        
        // If refresh failed or no refresh token, return error
        console.log('[HttpClient] Token refresh failed, user needs to re-login');
        return {
          success: false,
          data: null as T,
          error: (data as { detail?: string })?.detail || 'Authentication failed',
          statusCode: 401,
          message: 'Authentication required'
        };
      }

      if (!response.ok) {
        // Enhanced error information for debugging
        const errorInfo = {
          success: false,
          data: null as T,
          error: (data as { detail?: string; error?: string })?.detail || (data as { detail?: string; error?: string })?.error || `Request failed with status ${response.status}`,
          statusCode: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
        
        // Log additional error details
        console.error('[HttpClient] Request failed:', {
          url,
          status: response.status,
          statusText: response.statusText,
          endpoint,
          responseData: data
        });
        
        return errorInfo;
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

      // Use delivery-service refresh endpoint
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          await SecureStorage.setAuthToken(data.access_token);
          if (data.refresh_token) {
            await SecureStorage.setRefreshToken(data.refresh_token);
          }
          return {
            success: true,
            data: { access: data.access_token }
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