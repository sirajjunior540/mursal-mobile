/**
 * Centralized API client with proper error handling and retry logic
 */
import { 
  ApiResponse, 
  ApiError, 
  RequestConfig, 
  ApiClientConfig,
  HttpStatus 
} from '../../shared/types';
import { logger } from '../logging/logger';

export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = [];
  private responseInterceptors: Array<(response: any) => any> = [];

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: (response: any) => any) {
    this.responseInterceptors.push(interceptor);
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    return processedConfig;
  }

  // Apply response interceptors
  private applyResponseInterceptors(response: any): any {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = interceptor(processedResponse);
    }
    
    return processedResponse;
  }

  // Check if error should be retried
  private shouldRetry(error: ApiError, attempt: number): boolean {
    if (attempt >= this.config.retryConfig.maxRetries) {
      return false;
    }

    return this.config.retryConfig.retryCondition(error);
  }

  // Delay for retry
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Make HTTP request with retry logic
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    let lastError: ApiError;
    
    // Apply request interceptors
    const processedConfig = await this.applyRequestInterceptors(config);
    
    for (let attempt = 1; attempt <= this.config.retryConfig.maxRetries + 1; attempt++) {
      try {
        const url = `${this.config.baseURL}${processedConfig.url}`;
        
        const requestInit: RequestInit = {
          method: processedConfig.method,
          headers: {
            ...this.config.defaultHeaders,
            ...processedConfig.headers,
          },
          body: processedConfig.data ? JSON.stringify(processedConfig.data) : undefined,
        };

        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        requestInit.signal = controller.signal;

        logger.apiRequest(processedConfig.method, url, processedConfig.data);

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        // Parse response
        let data = null;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }

        logger.apiResponse(processedConfig.method, url, response.status, data);

        // Handle HTTP errors
        if (!response.ok) {
          const error: ApiError = {
            message: data?.message || `HTTP ${response.status}`,
            status: response.status,
            code: data?.code,
            details: data,
          };

          // Check if we should retry
          if (this.shouldRetry(error, attempt)) {
            lastError = error;
            logger.warn(`Request failed, retrying (${attempt}/${this.config.retryConfig.maxRetries})`, { error });
            await this.delay(this.config.retryConfig.retryDelay * attempt);
            continue;
          }

          throw error;
        }

        // Apply response interceptors
        const processedResponse = this.applyResponseInterceptors({
          success: true,
          data,
        });

        return processedResponse;

      } catch (error: any) {
        lastError = {
          message: error.message || 'Network error',
          status: error.status || 0,
          code: error.code,
          details: error,
        };

        logger.apiError(processedConfig.method, processedConfig.url, error);

        // Check if we should retry
        if (this.shouldRetry(lastError, attempt)) {
          logger.warn(`Request failed, retrying (${attempt}/${this.config.retryConfig.maxRetries})`, { error });
          await this.delay(this.config.retryConfig.retryDelay * attempt);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError!;
  }

  // Convenience methods
  async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      ...config,
    });
  }

  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  }

  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  }

  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  }

  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...config,
    });
  }
}

// Default retry condition
const defaultRetryCondition = (error: ApiError): boolean => {
  // Retry on network errors and specific HTTP status codes
  return (
    error.status === 0 || // Network error
    error.status >= HttpStatus.INTERNAL_SERVER_ERROR || // 5xx errors
    error.status === HttpStatus.BAD_GATEWAY ||
    error.status === HttpStatus.SERVICE_UNAVAILABLE ||
    error.status === HttpStatus.GATEWAY_TIMEOUT
  );
};

// Create configured API client
export const createApiClient = (baseURL: string): ApiClient => {
  const config: ApiClientConfig = {
    baseURL,
    timeout: 30000, // 30 seconds
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      retryCondition: defaultRetryCondition,
    },
  };

  return new ApiClient(config);
};