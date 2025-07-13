/**
 * Order API hooks with proper error handling and caching
 */
import { useCallback, useRef } from 'react';
import { Order, OrderStatus } from '../../../types';

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

interface OrderListOptions {
  filters?: {
    status?: OrderStatus[];
    priority?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
  page?: number;
  limit?: number;
}

interface UseOrderAPIConfig {
  baseURL: string;
  getAuthToken: () => Promise<string | null>;
  onError?: (error: Error) => void;
}

export const useOrderAPI = (config: UseOrderAPIConfig) => {
  const { baseURL, getAuthToken, onError } = config;
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const createRequest = useCallback(async <T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const token = await getAuthToken();
      const url = `${baseURL}${endpoint}`;
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const requestConfig: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: abortControllerRef.current.signal,
      };

      console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body);

      const response = await fetch(url, requestConfig);
      
      let data = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      console.log(`API Response: ${options.method || 'GET'} ${url} ${response.status}`, data);

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
          throw error;
        }

        console.error(`API Error: ${options.method || 'GET'} ${endpoint}`, error);
        
        if (onError) {
          onError(error);
        }
        
        throw error;
      } else {
        // Handle non-Error objects
        const genericError = new Error('An unknown error occurred');
        console.error(`API Error: ${options.method || 'GET'} ${endpoint}`, error);
        
        if (onError) {
          onError(genericError);
        }
        
        throw genericError;
      }
    }
  }, [baseURL, getAuthToken, onError]);

  const getOrders = useCallback(async (options?: OrderListOptions): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    
    if (options?.filters?.status) {
      queryParams.append('status', options.filters.status.join(','));
    }
    
    if (options?.filters?.priority) {
      queryParams.append('priority', options.filters.priority.join(','));
    }
    
    if (options?.page) {
      queryParams.append('page', options.page.toString());
    }
    
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    const endpoint = `/orders/active${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await createRequest<Order[]>(endpoint);
    
    return response.data || [];
  }, [createRequest]);

  const getOrderDetails = useCallback(async (orderId: string): Promise<Order> => {
    const response = await createRequest<Order>(`/orders/${orderId}`);
    return response.data;
  }, [createRequest]);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: OrderStatus,
    location?: { latitude: number; longitude: number }
  ): Promise<Order> => {
    const payload = {
      status,
      ...(location && { 
        current_latitude: location.latitude,
        current_longitude: location.longitude,
      }),
      timestamp: new Date().toISOString(),
    };

    const response = await createRequest<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    console.log(`Order status changed: ${orderId} -> ${status}`);
    return response.data;
  }, [createRequest]);

  const acceptOrder = useCallback(async (orderId: string): Promise<Order> => {
    const response = await createRequest<Order>(`/orders/${orderId}/accept`, {
      method: 'POST',
    });

    console.log(`Order accepted: ${orderId} pending -> assigned`);
    return response.data;
  }, [createRequest]);

  const declineOrder = useCallback(async (
    orderId: string, 
    reason?: string
  ): Promise<void> => {
    const payload = {
      reason: reason || 'Driver declined',
      timestamp: new Date().toISOString(),
    };

    await createRequest(`/orders/${orderId}/decline`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log(`Order declined: ${orderId} pending -> cancelled`);
  }, [createRequest]);

  const getOrderHistory = useCallback(async (options?: OrderListOptions): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    
    if (options?.filters?.date_range) {
      queryParams.append('start_date', options.filters.date_range.start);
      queryParams.append('end_date', options.filters.date_range.end);
    }
    
    if (options?.page) {
      queryParams.append('page', options.page.toString());
    }
    
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    const endpoint = `/orders/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await createRequest<Order[]>(endpoint);
    
    return response.data || [];
  }, [createRequest]);

  const uploadDeliveryProof = useCallback(async (
    orderId: string,
    imageUri: string,
    signature?: string
  ): Promise<void> => {
    // Define proper type for React Native file upload
    interface FileUpload {
      uri: string;
      type: string;
      name: string;
    }

    const formData = new FormData();
    const file: FileUpload = {
      uri: imageUri,
      type: 'image/jpeg',
      name: `delivery_${orderId}_${Date.now()}.jpg`,
    };
    formData.append('delivery_proof', file as unknown as Blob);
    
    if (signature) {
      formData.append('signature', signature);
    }

    await createRequest(`/orders/${orderId}/delivery-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
  }, [createRequest]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    acceptOrder,
    declineOrder,
    getOrderHistory,
    uploadDeliveryProof,
    cancelRequest,
  };
};