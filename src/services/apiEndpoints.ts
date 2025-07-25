import { 
  ApiResponse, 
  AuthUser, 
  Driver, 
  DriverBalance, 
  Order,
  BatchOrder, 
  OrderStatus,
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
import { STORAGE_KEYS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { ApiTransformers } from './apiTransformers';
import { 
  BackendDelivery, 
  BackendOrder, 
  BackendDriver,
  BackendBatch,
  BackendTransactionData,
  BackendTransactionResponse,
  BackendBatchLeg,
  BackendBatchLegResponse,
  TokenResponse,
  UserInfoResponse,
  SmartDeliveryData,
  SmartStatusUpdateData,
  DeclineDeliveryData,
  SmartAcceptResponse,
  EstimatePickupResponse,
  RouteOptimizationResponse
} from './apiTypes';

// Define HttpClient interface to avoid circular dependency
interface HttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
  uploadFile(endpoint: string, file: File | Blob, additionalData?: Record<string, string>): Promise<ApiResponse<unknown>>;
  get<T>(endpoint: string): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}

/**
 * API Endpoint Methods
 * 
 * This class contains all the API endpoint methods organized by feature area.
 * It uses the HttpClient for making requests and ApiTransformers for data transformation.
 */

// Request tracking to prevent duplicate calls
const requestTracker = {
  lastAvailableOrdersCall: 0,
  lastRouteOptimizationCall: 0,
  minRequestInterval: 2000, // 2 seconds
  pendingAvailableOrders: null as Promise<ApiResponse<Order[]>> | null,
  pendingRouteOptimization: null as Promise<ApiResponse<any>> | null,
};

export class ApiEndpoints {
  constructor(protected client: HttpClient) {}

  // ==================== Authentication ====================
  
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      // Convert camelCase tenantId to snake_case tenant_id for backend
      const requestBody = {
        username: credentials.username,
        password: credentials.password,
        ...(credentials.tenantId && { tenant_id: credentials.tenantId })
      };
      
      const response = await this.client.request<TokenResponse>('/api/v1/auth/token/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.success && response.data) {
        const { access, refresh, ...userData } = response.data;
        
        if (access && refresh) {
          // Store tokens securely
          await SecureStorage.setAuthToken(access);
          await SecureStorage.setRefreshToken(refresh);
          
          // Store user data
          const userInfo: AuthUser = {
            id: String(userData.user_id || ''),
            username: userData.username || credentials.username,
            email: userData.email || '',
            firstName: '',
            lastName: '',
            phone: '',
            token: access,
            role: userData.role || '',
            is_active: true,
            is_staff: userData.is_staff || false,
            is_superuser: userData.is_superuser || false
          };
          
          await Storage.setItem(STORAGE_KEYS.USER_DATA, userInfo);
          
          
          // Create driver data from user info
          const driverInfo: Driver = {
            id: String(userData.user_id || ''),
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            rating: userData.rating || 0,
            totalDeliveries: userData.total_deliveries || 0,
            isOnline: userData.is_online || false,
            profileImage: userData.profile_image || undefined
          };
          
          return {
            success: true,
            data: {
              user: userInfo,
              driver: driverInfo
            }
          };
        }
      }
      
      return {
        success: false,
        data: {} as LoginResponse,
        error: 'Invalid response from server'
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear all stored data
      await SecureStorage.removeAuthToken();
      await SecureStorage.removeRefreshToken();
      await Storage.removeItem(STORAGE_KEYS.USER_DATA);
      await Storage.removeItem(STORAGE_KEYS.DRIVER_DATA);
      await Storage.removeItem(STORAGE_KEYS.TENANT_ID);
      
    } catch (error) {
      throw error;
    }
  }

  async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await this.client.request<{ access: string }>('/api/v1/auth/token/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.success && response.data?.access) {
        await SecureStorage.setAuthToken(response.data.access);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // ==================== Driver Management ====================

  async getDriverInfo(driverId?: string): Promise<ApiResponse<Driver>> {
    
    // Try to get driver ID from various sources
    if (!driverId) {
      const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
      if (cachedDriver && (cachedDriver as Driver).id) {
        driverId = (cachedDriver as Driver).id;
      } else {
        // Try to extract from token
        const token = await SecureStorage.getAuthToken();
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            driverId = payload.user_id?.toString();
          } catch (error) {
          }
        }
      }
    }

    // For driver profile, always use the 'me' endpoint for current driver
    // For admin operations, use the admin/drivers endpoint
    const endpoint = '/api/v1/auth/drivers/me/';

    let response = await this.client.get<unknown>(endpoint);
    
    // If the 'me' endpoint fails, try the driver-profile endpoint as fallback
    if (!response.success && response.error?.includes('404')) {
      response = await this.client.get<unknown>('/api/v1/auth/driver-profile/');
    }

    // Transform backend response to match our Driver type
    if (response.success && response.data) {
      const driverData = response.data as BackendDriver;
      
      const driver: Driver = ApiTransformers.transformDriver(driverData);
      
      // Cache driver data
      await Storage.setItem(STORAGE_KEYS.DRIVER_DATA, driver);
      
      return {
        success: true,
        data: driver,
        message: response.message
      };
    }

    return response as ApiResponse<Driver>;
  }

  async updateDriverStatus(isOnline: boolean): Promise<ApiResponse<void>> {
    console.log(`📱 [API] Updating driver status to: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    
    // Get driver ID
    const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
    const driverId = (cachedDriver as Driver)?.id || await this.extractDriverIdFromToken();
    
    if (!driverId) {
      console.error('❌ [API] Driver ID not found');
      return {
        success: false,
        data: undefined,
        error: 'Driver ID not found'
      };
    }
    
    console.log(`🔄 [API] Sending status update for driver ${driverId}`);
    
    try {
      const response = await this.client.post<void>('/api/v1/auth/drivers/update_my_status/', {
        is_online: isOnline,
        is_available: isOnline,
        is_on_duty: isOnline
      });
      
      if (response.success) {
        console.log(`✅ [API] Driver status updated successfully to: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      } else {
        console.error(`❌ [API] Failed to update driver status:`, response.error);
      }
      
      if (!response.success && response.error?.includes('404')) {
        await Storage.removeItem(STORAGE_KEYS.DRIVER_DATA);
        return {
          success: false,
          data: undefined,
          error: 'Driver not found. Please log in again.'
        };
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  }

  async updateLocation(latitude: number, longitude: number): Promise<ApiResponse<void>> {

    // Use the new update_my_location endpoint that doesn't require driver ID
    // Validate coordinates before sending
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error(`❌ [API] Invalid coordinates: lat=${latitude}, lon=${longitude}`);
      return {
        success: false,
        data: undefined,
        error: 'Invalid coordinates provided'
      };
    }
    
    const endpoint = `/api/v1/auth/drivers/update_my_location/`;
    console.log(`📍 [API] Updating location to: ${latitude}, ${longitude}`);

    try {
      const response = await this.client.post<void>(endpoint, {
        latitude: Number(latitude),
        longitude: Number(longitude)
      });

      if (response.success) {
        console.log(`✅ [API] Location updated successfully`);
      } else {
        console.error(`❌ [API] Failed to update location:`, response.error);
      }

      return response;
    } catch (error) {
      console.error(`💥 [API] Exception updating location:`, error);
      throw error;
    }
  }

  async updateFCMToken(fcmToken: string): Promise<ApiResponse<void>> {
    const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
    const driverId = (cachedDriver as Driver)?.id || await this.extractDriverIdFromToken();
    
    if (!driverId) {
      return {
        success: false,
        data: undefined,
        error: 'Driver ID not found'
      };
    }

    const endpoint = '/api/v1/auth/drivers/update_my_fcm_token/';
    return this.client.post<void>(endpoint, { fcm_token: fcmToken });
  }

  private async extractDriverIdFromToken(): Promise<string | null> {
    const token = await SecureStorage.getAuthToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id?.toString() || null;
    } catch {
      return null;
    }
  }

  // ==================== Orders & Deliveries ====================

  async getAvailableOrders(): Promise<ApiResponse<Order[]>> {
    // Prevent duplicate calls within 2 seconds
    const now = Date.now();
    const timeSinceLastCall = now - requestTracker.lastAvailableOrdersCall;
    
    if (timeSinceLastCall < requestTracker.minRequestInterval) {
      if (requestTracker.pendingAvailableOrders) {
        console.log('[API] Returning pending available_orders request');
        return requestTracker.pendingAvailableOrders;
      }
      console.log('[API] Skipping duplicate available_orders request');
      return { success: true, data: [] };
    }
    
    // Get available orders for the driver to accept (unassigned/broadcast orders + assigned orders)
    const promise = (async () => {
      try {
      let apiUrl = '/api/v1/delivery/deliveries/available_orders/';
      
      // Try to get current location for nearby orders (optional)
      try {
        const locationService = await import('../services/locationService');
        console.log('[API] Location service imported successfully');
        
        let currentLocation = null;
        
        // First try to get last known location
        currentLocation = locationService.locationService.getLastKnownLocation();
        console.log('[API] Last known location:', currentLocation);
        
        // If no last known location, try to get fresh location with timeout
        if (!currentLocation) {
          console.log('[API] No last known location, attempting to get fresh location...');
          
          // Add a timeout wrapper to prevent hanging
          const locationPromise = locationService.locationService.getCurrentLocation();
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 3000) // Reduced to 3 seconds
          );
          
          currentLocation = await Promise.race([locationPromise, timeoutPromise]).catch(err => {
            console.log('[API] Location fetch failed or timed out:', err);
            return null;
          });
        }
        
        console.log('[API] Final location result:', currentLocation);
        
        if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
          apiUrl += `?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
          console.log('[API] Using location for available orders:', currentLocation);
        } else {
          console.log('[API] No valid location available');
        }
      } catch (locationError: any) {
        console.warn('[API] Could not get location, error details:', {
          message: locationError?.message,
          code: locationError?.code,
          stack: locationError?.stack
        });
        // Continue without location parameters
      }
      
      console.log('[API] Fetching available orders from:', apiUrl);
      
      // Check driver status before making request
      const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
      const driverStatus = cachedDriver ? (cachedDriver as Driver) : null;
      console.log('🚗 [API] Driver status check:', {
        isOnline: driverStatus?.isOnline,
        isAvailable: driverStatus?.is_available,
        isOnDuty: driverStatus?.is_on_duty,
        lastLocation: driverStatus?.last_location_update
      });
      
      const response = await this.client.get<any>(apiUrl);
      
      console.log('📦 [API] Available orders raw response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        error: response.error
      });
      
      // Debug ApiTransformers availability
      console.log('🔍 [API] ApiTransformers check:', {
        hasApiTransformers: !!ApiTransformers,
        hasTransformOrder: !!(ApiTransformers && ApiTransformers.transformOrder),
        typeOfTransformOrder: ApiTransformers && ApiTransformers.transformOrder ? typeof ApiTransformers.transformOrder : 'undefined'
      });
      
      // Log the actual structure
      if (response.data && !Array.isArray(response.data)) {
        console.log('📋 [API] Response data structure:', {
          hasOrders: !!response.data.orders,
          ordersCount: response.data.orders?.length || 0,
          totalCount: response.data.total_count,
          batchCount: response.data.batch_count,
          singleCount: response.data.single_count,
          hasResults: !!response.data.results,
          resultsCount: response.data.results?.length || 0
        });
      }
      
      let availableOrders: Order[] = [];
      
      if (response.success && response.data) {
        // Handle both array and paginated responses
        const orderData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.orders || response.data.results || response.data.data || []);
        
        console.log('[API] Order data extracted:', {
          isArray: Array.isArray(orderData),
          count: orderData.length,
          firstItem: orderData[0] ? {
            id: orderData[0].id,
            status: orderData[0].status,
            driver: orderData[0].driver,
            order: orderData[0].order ? 'has order' : 'no order'
          } : null
        });
        
        if (Array.isArray(orderData)) {
          availableOrders = orderData.map(item => {
            try {
              return ApiTransformers.transformOrder(item);
            } catch (error) {
              console.error('❌ [API] Failed to transform order:', error);
              console.error('📋 [API] Problematic order data:', item);
              throw error;
            }
          });
          console.log('[API] Successfully fetched', availableOrders.length, 'available orders from primary endpoint');
          
          // Log transformed first order
          if (availableOrders.length > 0) {
            console.log('🎯 [API] First transformed order:', {
              id: availableOrders[0].id,
              orderNumber: availableOrders[0].order_number,
              status: availableOrders[0].status,
              customer: availableOrders[0].customer?.name,
              pickup: `${availableOrders[0].pickup_latitude}, ${availableOrders[0].pickup_longitude}`,
              delivery: `${availableOrders[0].delivery_latitude}, ${availableOrders[0].delivery_longitude}`
            });
          }
        } else {
          console.warn('[API] Unexpected data format from available_orders endpoint:', response.data);
        }
      } else {
        console.error('❌ [API] Failed to get available orders:', {
          error: response.error,
          message: response.message,
          statusCode: response.statusCode,
          url: apiUrl,
          data: response.data
        });
        // Log more details if available
        if (response.error && typeof response.error === 'object') {
          console.error('📱 [API] Error details:', response.error);
        }
      }
      
      // Also get assigned orders for this driver from by_driver endpoint
      try {
        console.log('[API] Fetching assigned orders that need acceptance...');
        const byDriverResponse = await this.client.get<any>('/api/v1/delivery/deliveries/by_driver/');
        
        if (byDriverResponse.success && byDriverResponse.data) {
          // Handle both array and paginated responses
          const driverDeliveryData = Array.isArray(byDriverResponse.data) 
            ? byDriverResponse.data 
            : (byDriverResponse.data.results || byDriverResponse.data.data || []);
          
          if (Array.isArray(driverDeliveryData)) {
            // Get only pending orders that belong in Available Orders
            // 'assigned' status means the driver has already accepted it
            const pendingOrders = driverDeliveryData
              .filter(delivery => {
                const status = delivery.status?.toLowerCase();
                return status === 'pending';
              })
              .map(ApiTransformers.transformOrder);
          
            console.log('[API] Found', pendingOrders.length, 'pending orders to add to available orders');
            
            // Merge pending orders with available orders, avoiding duplicates
            pendingOrders.forEach(pendingOrder => {
              const exists = availableOrders.some(order => order.id === pendingOrder.id);
              if (!exists) {
                availableOrders.push(pendingOrder);
              }
            });
          }
        }
      } catch (assignedError) {
        console.warn('[API] Could not fetch assigned orders:', assignedError);
      }
      
      console.log('[API] Total available orders (including assigned):', availableOrders.length);
      
      if (availableOrders.length > 0 || response.success) {
        return {
          success: true,
          data: availableOrders,
          message: response.message
        };
      }
      
      return response as ApiResponse<Order[]>;
    } catch (error) {
      console.error('[API] Error fetching available orders:', error);
      
      // Try fallback endpoints
      try {
        console.log('[API] Trying fallback endpoints for available orders...');
        
        // 1. Try pending-deliveries endpoint
        const pendingResponse = await this.client.get<any>('/api/v1/delivery/deliveries/pending-deliveries/');
        if (pendingResponse.success && pendingResponse.data) {
          // Handle both array and paginated responses
          const deliveryData = Array.isArray(pendingResponse.data) 
            ? pendingResponse.data 
            : (pendingResponse.data.results || pendingResponse.data.data || []);
          
          if (Array.isArray(deliveryData)) {
            const orders: Order[] = deliveryData.map(ApiTransformers.transformOrder);
            console.log('[API] Got', orders.length, 'orders from pending-deliveries fallback');
            return {
              success: true,
              data: orders,
              message: 'Retrieved via pending-deliveries fallback'
            };
          }
        }
        
        // 2. Try general deliveries endpoint
        const generalResponse = await this.client.get<any>('/api/v1/delivery/deliveries/');
        if (generalResponse.success && generalResponse.data) {
          // Handle both array and paginated responses
          const deliveryData = Array.isArray(generalResponse.data) 
            ? generalResponse.data 
            : (generalResponse.data.results || generalResponse.data.data || []);
          
          if (Array.isArray(deliveryData)) {
            // Filter for unassigned orders
            const unassignedOrders = deliveryData
              .filter(delivery => !delivery.assigned_driver || delivery.status === 'pending')
              .map(ApiTransformers.transformOrder);
            console.log('[API] Got', unassignedOrders.length, 'orders from general deliveries fallback');
            return {
              success: true,
              data: unassignedOrders,
              message: 'Retrieved via general deliveries fallback'
            };
          }
        }
        
      } catch (fallbackError) {
        console.error('[API] Fallback endpoints also failed:', fallbackError);
      }
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch available orders'
      };
    } finally {
      // Clear pending promise after completion
      requestTracker.pendingAvailableOrders = null;
    }
    })();
    
    // Store the promise and update timestamp
    requestTracker.pendingAvailableOrders = promise;
    requestTracker.lastAvailableOrdersCall = now;
    
    return promise;
  }

  async getAvailableOrdersWithDistance(): Promise<ApiResponse<Order[]>> {
    try {
      const ordersResponse = await this.getAvailableOrders();
      if (!ordersResponse.success || !ordersResponse.data) {
        return ordersResponse;
      }

      // Import location service dynamically to avoid circular dependencies
      const locationService = await import('../services/locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      // Import distance service dynamically
      const { calculateDistance } = await import('../utils/locationUtils');
      
      // Add distance to each order
      const ordersWithDistance = ordersResponse.data.map(order => {
        if (order.pickup_latitude && order.pickup_longitude) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            order.pickup_latitude,
            order.pickup_longitude
          );
          return { ...order, distance };
        }
        return order;
      });

      // Sort by distance (closest first)
      ordersWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      return {
        success: true,
        data: ordersWithDistance,
        message: ordersResponse.message
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: 'Failed to fetch available orders'
      };
    }
  }


  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    // Alias for getDriverOrders for backward compatibility
    return this.getDriverOrders();
  }

  async getDriverOrders(): Promise<ApiResponse<Order[]>> {
    // Use by_driver endpoint as primary since it has complete order data
    // Filter out ASSIGNED status deliveries - these should appear in Available Orders until driver accepts them
    
    try {
      // Import SmartOrderCache dynamically to avoid circular dependencies
      const { SmartOrderCache } = await import('./smartOrderCache');
      
      // Check if we have valid cached data first
      const cachedOrders = await SmartOrderCache.getCachedOrders();
      if (cachedOrders) {
        console.log('[API] Returning cached driver orders');
        return {
          success: true,
          data: cachedOrders,
          message: 'Cached driver orders'
        };
      }
      
      // Get current location for caching purposes
      let currentLocation: { latitude: number; longitude: number } | undefined;
      try {
        const locationService = await import('../services/locationService');
        const location = locationService.locationService.getLastKnownLocation();
        if (location && location.latitude && location.longitude) {
          currentLocation = location;
        }
      } catch (error) {
        console.log('[API] Could not get location for caching:', error);
      }
      
      console.log('[API] Fetching fresh driver orders from /api/v1/delivery/deliveries/by_driver/');
      const response = await this.client.get<any>('/api/v1/delivery/deliveries/by_driver/');
      console.log('[API] Driver orders response:', response);
      
      if (response.success && response.data) {
        // Handle both array and paginated responses
        const deliveryData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.results || response.data.data || []);
        
        if (Array.isArray(deliveryData)) {
          console.log('[API] Processing', deliveryData.length, 'deliveries');
          
          // Include orders that the driver has accepted and is working on
          // Filter out only 'pending' orders - 'assigned' means driver accepted it
          // Valid statuses for active deliveries: assigned, accepted, picked_up, in_transit, etc.
          const acceptedDeliveries = deliveryData.filter(delivery => {
          const status = delivery.status?.toLowerCase();
          // Only exclude pending orders - all other statuses are active deliveries
          const isActiveDelivery = status !== 'pending';
          
          if (!isActiveDelivery) {
            console.log('[API] Filtering out delivery with status:', status, 'for delivery ID:', delivery.id);
          }
          
          return isActiveDelivery;
        });
        
          console.log('[API] Filtered to', acceptedDeliveries.length, 'accepted deliveries from', deliveryData.length, 'total');
        
        const orders: Order[] = acceptedDeliveries.map((backendItem, index) => {
          try {
            console.log('[API] Transforming delivery', index, ':', backendItem);
            const transformedOrder = ApiTransformers.transformOrder(backendItem);
            console.log('[API] Transformed order', index, ':', transformedOrder);
            return transformedOrder;
          } catch (transformError) {
            console.error('[API] Error transforming delivery', index, ':', transformError);
            throw transformError;
          }
        });
        
          console.log('[API] Successfully transformed', orders.length, 'orders');
          
          // Cache the orders for future use with current location
          await SmartOrderCache.cacheOrders(orders, currentLocation);
          
          return {
            success: true,
            data: orders,
            message: response.message
          };
        }
      }

      return {
        success: false,
        data: [],
        message: 'No order data available'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[API] Error fetching driver orders:', error);
      console.error('[API] Error message:', errorMessage);
      
      // Log authentication status for debugging
      const token = await SecureStorage.getAuthToken();
      console.log('[API] Token exists:', !!token);
      
      // If by_driver fails, try ongoing-deliveries as fallback (but it has incomplete data)
      if (errorMessage.includes('429') || errorMessage.includes('404') || errorMessage.includes('403')) {
        
        try {
          const fallbackResponse = await this.client.get<any>('/api/v1/delivery/deliveries/ongoing_deliveries/');
          
          if (fallbackResponse.success && fallbackResponse.data) {
            // Handle both array and paginated responses
            const deliveriesData = Array.isArray(fallbackResponse.data) 
              ? fallbackResponse.data 
              : (fallbackResponse.data.results || fallbackResponse.data.data || []);
            
            if (Array.isArray(deliveriesData)) {
              const orders: Order[] = deliveriesData.map(ApiTransformers.transformOrder);
              return {
                success: true,
                data: orders,
                message: 'Retrieved via fallback endpoint (incomplete order data)'
              };
            }
          }
          
          return fallbackResponse as ApiResponse<Order[]>;
          
        } catch (fallbackError) {
          return {
            success: false,
            data: [],
            error: 'Failed to fetch driver orders from both endpoints'
          };
        }
      }
      
      return {
        success: false,
        data: [],
        error: errorMessage
      };
    }
  }

  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    
    // First try the orders endpoint (has full order data)
    try {
      const orderResponse = await this.client.get<BackendOrder>(`/api/v1/delivery/orders/${orderId}/`);
      if (orderResponse.success && orderResponse.data) {
        const order = ApiTransformers.transformOrder(orderResponse.data);
        return {
          success: true,
          data: order,
          message: orderResponse.message
        };
      }
    } catch (orderError) {
    }
    
    // If orders endpoint fails, try deliveries endpoint (for backward compatibility)
    try {
      const response = await this.client.get<BackendDelivery>(`/api/v1/delivery/deliveries/${orderId}/`);
      
      if (response.success && response.data) {
        const order = ApiTransformers.transformOrder(response.data);
        
        return {
          success: true,
          data: order,
          message: response.message
        };
      }
      
      return response as ApiResponse<Order>;
    } catch (error) {
      return {
        success: false,
        data: null!,
        error: 'Failed to fetch order details'
      };
    }
  }

  async acceptOrder(deliveryId: string): Promise<ApiResponse<void>> {
    
    // Debug: Check current user info before making the request
    try {
      const userResponse = await this.client.get<UserInfoResponse>('/whoami/');
    } catch (error) {
    }
    
    const endpoint = `/api/v1/delivery/deliveries/${deliveryId}/accept/`;
    
    const response = await this.client.post<void>(endpoint, {});
    
    if (response.success) {
      // Invalidate cache when order is accepted
      const { SmartOrderCache } = await import('./smartOrderCache');
      await SmartOrderCache.invalidateOnOrderAccepted(deliveryId);
    } else {
    }
    
    return response;
  }

  private async extractDriverIdFromToken(): Promise<string | null> {
    try {
      const token = await SecureStorage.getAuthToken();
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || payload.sub || null;
    } catch (error) {
      return null;
    }
  }

  // ==================== Notification Settings ====================
  
  async getNotificationChannels(): Promise<ApiResponse<{
    channels: string[];
    fcm_configured: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
    persistence_seconds: number;
  }>> {
    return this.client.get('/api/v1/tenants/notification-channels/');
  }

  // ==================== Batch Leg Operations ====================
  
  async getAvailableBatchLegs(): Promise<ApiResponse<BatchLegListResponse>> {
    const response = await this.client.get<BackendBatchLegResponse>('/api/v1/delivery/batch-legs/?status=available');
    
    if (response.success && response.data) {
      const transformedData: BatchLegListResponse = {
        count: response.data.count || 0,
        legs: (response.data.results || []).map(ApiTransformers.transformBatchLeg)
      };
      
      return {
        success: true,
        data: transformedData,
        message: response.message
      };
    }
    
    return {
      success: false,
      data: { count: 0, legs: [] },
      error: response.error || 'Failed to fetch batch legs'
    };
  }

  async acceptBatchLeg(legId: string): Promise<ApiResponse<BatchLeg>> {
    
    // Try the assign_driver endpoint first (as seen in backend code)
    const assignResponse = await this.client.post<BackendBatchLeg>(
      `/api/v1/delivery/batch-legs/${legId}/assign_driver/`,
      { driver_id: await this.extractDriverIdFromToken() }
    );
    
    if (assignResponse.success && assignResponse.data) {
      const transformedLeg = ApiTransformers.transformBatchLeg(assignResponse.data);
      return {
        success: true,
        data: transformedLeg,
        message: 'Batch leg accepted successfully'
      };
    }
    
    // If assign_driver fails, try accept_leg endpoint (might exist)
    const acceptResponse = await this.client.post<BackendBatchLeg>(
      `/api/v1/delivery/batch-legs/${legId}/accept_leg/`,
      {}
    );
    
    if (acceptResponse.success && acceptResponse.data) {
      const transformedLeg = ApiTransformers.transformBatchLeg(acceptResponse.data);
      return {
        success: true,
        data: transformedLeg,
        message: 'Batch leg accepted successfully'
      };
    }
    
    return {
      success: false,
      data: null as any,
      error: assignResponse.error || acceptResponse.error || 'Failed to accept batch leg'
    };
  }

  async getBatchLegDetails(legId: string): Promise<ApiResponse<BatchLeg>> {
    const response = await this.client.get<BackendBatchLeg>(`/api/v1/delivery/batch-legs/${legId}/`);
    
    if (response.success && response.data) {
      const transformedLeg = ApiTransformers.transformBatchLeg(response.data);
      return {
        success: true,
        data: transformedLeg,
        message: response.message
      };
    }
    
    return {
      success: false,
      data: null as any,
      error: response.error || 'Failed to fetch batch leg details'
    };
  }

  async completeBatchLeg(legId: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<void>(`/api/v1/delivery/batch-legs/${legId}/complete/`, {});
    
    if (response.success) {
    } else {
    }
    
    return response;
  }

  async declineOrder(orderId: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<void>(`/api/v1/delivery/deliveries/${orderId}/decline/`, {});
    
    if (response.success) {
      // Invalidate cache when order is declined
      const { SmartOrderCache } = await import('./smartOrderCache');
      await SmartOrderCache.invalidateOnOrderDeclined(orderId);
    }
    
    return response;
  }

  async getOrderHistory(filter?: 'today' | 'week' | 'month' | 'all'): Promise<ApiResponse<Order[]>> {
    try {
      // Use the new dedicated order_history endpoint
      const params = new URLSearchParams();
      if (filter) {
        params.append('filter', filter);
      }
      
      const endpoint = `/api/v1/delivery/deliveries/order_history/?${params.toString()}`;
      const response = await this.client.get<{
        orders: BackendDelivery[],
        count: number,
        filter: string,
        driver_id: number
      }>(endpoint);
      
      if (response.success && response.data) {
        // Transform orders from the new endpoint format
        const orders = (response.data.orders || [])
          .map(ApiTransformers.transformOrder)
          .sort((a, b) => {
            // Sort by delivery time, most recent first
            const dateA = a.delivery_time || a.updated_at || a.created_at;
            const dateB = b.delivery_time || b.updated_at || b.created_at;
            return dateB.getTime() - dateA.getTime();
          });
          
        return {
          success: true,
          data: orders,
          message: `Found ${response.data.count} completed orders`,
          metadata: {
            count: response.data.count,
            filter: response.data.filter,
            driverId: response.data.driver_id
          }
        };
      }
      
      return response as ApiResponse<Order[]>;
      
    } catch (error) {
      return {
        success: false,
        data: [],
        error: 'Failed to fetch order history'
      };
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, photoId?: string): Promise<ApiResponse<void>> {
    // Map our frontend status to backend expected values
    const statusMap: Record<OrderStatus, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'assigned': 'assigned',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned',
      'failed': 'failed'
    };

    // Get current location if available
    let locationData: SmartStatusUpdateData = {
      status: statusMap[status] || status
    };
    
    // Add photo ID if provided (for delivered status with photo)
    if (photoId) {
      (locationData as any).photo_id = photoId;
    }

    try {
      // Try to get current location from locationService
      const { locationService } = await import('../services/locationService');
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        locationData.latitude = location.latitude;
        locationData.longitude = location.longitude;
        locationData.location = `${location.latitude},${location.longitude}`;
      }
    } catch (error) {
      console.log('[API] Could not get location for status update:', error);
    }

    // Use smart_update_status endpoint for better handling
    const response = await this.smartUpdateStatus(orderId, locationData);
    
    if (response.success) {
      // Invalidate cache when order status changes
      const { SmartOrderCache } = await import('./smartOrderCache');
      await SmartOrderCache.invalidateOnStatusChange(orderId, statusMap[status] || status);
    }
    
    return response;
  }

  async updateBatchStatus(batchId: string, status: string, data?: Record<string, unknown>): Promise<ApiResponse<void>> {
    
    // Try the batches endpoint first (newer API)
    try {
      const result = await this.client.post<void>(`/api/v1/delivery/batches/${batchId}/update_status/`, {
        status,
        ...data
      });
      
      if (result.success) {
        return result;
      }
    } catch (error) {
    }
    
    // Fallback to delivery endpoint
    return this.updateOrderStatus(batchId, status as OrderStatus);
  }

  async getAvailableBatches(): Promise<ApiResponse<BatchOrder[]>> {
    
    try {
      const response = await this.client.get<BackendBatch[]>('/api/v1/delivery/batches/available/');
      
      if (response.success && response.data) {
        const batches = response.data.map((batch: BackendBatch) => ApiTransformers.transformBatchOrder(batch));
        return {
          success: true,
          data: batches,
          message: response.message
        };
      }
      
      return response as ApiResponse<BatchOrder[]>;
    } catch (error) {
      return {
        success: false,
        data: [],
        error: 'Failed to fetch available batches'
      };
    }
  }

  async getBatchDetails(batchId: string): Promise<ApiResponse<BatchOrder>> {
    
    const response = await this.client.get<BackendBatch>(`/api/v1/delivery/batches/${batchId}/`);
    
    if (response.success && response.data) {
      // Transform to BatchOrder type
      const batch = ApiTransformers.transformBatchOrder(response.data);
      return {
        success: true,
        data: batch,
        message: response.message
      };
    }
    
    return response as ApiResponse<BatchOrder>;
  }

  async acceptBatchOrder(batchId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/batches/${batchId}/accept/`, {});
  }

  // ==================== Smart Assignment ====================

  async smartAcceptDelivery(deliveryId: string, data: SmartDeliveryData): Promise<ApiResponse<SmartAcceptResponse>> {
    return this.client.post<SmartAcceptResponse>(`/api/v1/delivery/deliveries/${deliveryId}/smart_accept/`, data);
  }

  async smartUpdateStatus(deliveryId: string, data: SmartStatusUpdateData): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_update_status/`, data);
  }

  async estimatePickupTime(deliveryId: string): Promise<ApiResponse<EstimatePickupResponse>> {
    return this.client.get<EstimatePickupResponse>(`/api/v1/delivery/deliveries/${deliveryId}/estimate_pickup/`);
  }

  async declineDelivery(deliveryId: string, data: DeclineDeliveryData): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/smart_decline/`, data);
  }

  async markDeliveryViewed(deliveryId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/mark_viewed/`, {});
  }

  // ==================== Route Optimization ====================

  async getOngoingDeliveries(): Promise<ApiResponse<Order[]>> {
    const response = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/ongoing_deliveries/');
    
    if (response.success && response.data) {
      const orders = response.data.map(ApiTransformers.transformOrder);
      return {
        success: true,
        data: orders,
        message: response.message
      };
    }
    
    return response as ApiResponse<Order[]>;
  }

  async getRouteOptimization(latitude?: number, longitude?: number): Promise<ApiResponse<any>> {
    // Prevent duplicate calls within 2 seconds
    const now = Date.now();
    const timeSinceLastCall = now - requestTracker.lastRouteOptimizationCall;
    
    if (timeSinceLastCall < requestTracker.minRequestInterval) {
      if (requestTracker.pendingRouteOptimization) {
        console.log('[API] Returning pending route-optimization request');
        return requestTracker.pendingRouteOptimization;
      }
      console.log('[API] Skipping duplicate route-optimization request');
      return { success: true, data: null };
    }
    
    const promise = (async () => {
      try {
      // Use the correct endpoint from backend
      const params = latitude && longitude ? `?latitude=${latitude}&longitude=${longitude}` : '';
      const response = await this.client.get<any>(`/api/v1/delivery/deliveries/route-optimization/${params}`);
      
      if (response.success && response.data) {
        // Update driver location in cache if coordinates were provided
        if (latitude && longitude) {
          const { SmartOrderCache } = await import('./smartOrderCache');
          const hasLocationChanged = await SmartOrderCache.hasLocationChangedSignificantly({ latitude, longitude });
          if (hasLocationChanged) {
            console.log('[API] Driver location changed significantly, cache will be invalidated on next getDriverOrders call');
          }
        }
        
        return {
          success: true,
          data: response.data,
          message: 'Route optimized successfully'
        };
      }
      
      // Fallback to driver orders formatted as route data
      console.log('[API] Route optimization failed, falling back to driver orders');
      const driverOrdersResponse = await this.getDriverOrders();
      
      if (driverOrdersResponse.success && driverOrdersResponse.data) {
        // Format driver orders as route optimization response
        const routeData = {
          assigned_deliveries: driverOrdersResponse.data.map(order => ({
            id: order.id,
            status: order.status,
            order: order
          })),
          available_deliveries: [],
          optimized_route: null
        };
        
        return {
          success: true,
          data: routeData,
          message: 'Using driver orders as route data'
        };
      }
      
      return this.getOngoingDeliveries();
    } catch (error) {
      console.log('[API] Route optimization error, falling back to driver orders', error);
      // Same fallback logic
      const driverOrdersResponse = await this.getDriverOrders();
      
      if (driverOrdersResponse.success && driverOrdersResponse.data) {
        const routeData = {
          assigned_deliveries: driverOrdersResponse.data.map(order => ({
            id: order.id,
            status: order.status,
            order: order
          })),
          available_deliveries: [],
          optimized_route: null
        };
        
        return {
          success: true,
          data: routeData,
          message: 'Using driver orders as route data'
        };
      }
      
      return this.getOngoingDeliveries();
    } finally {
      // Clear pending promise after completion
      requestTracker.pendingRouteOptimization = null;
    }
    })();
    
    // Store the promise and update timestamp
    requestTracker.pendingRouteOptimization = promise;
    requestTracker.lastRouteOptimizationCall = now;
    
    return promise;
  }

  // ==================== Financial & Earnings ====================

  async recordCashCollection(orderId: string, amount: number): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/v1/auth/drivers/record_cash_collection/', { orderId, amount });
  }

  async getBalanceTransactionsRaw(page: number = 1, pageSize: number = 20): Promise<ApiResponse<BalanceTransaction[]>> {
    
    try {
      let endpoint = '/api/v1/auth/drivers/transaction_history/';
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      
      // Try primary endpoint
      let response = await this.client.get<BackendTransactionResponse>(`${endpoint}?${params.toString()}`);
      
      // If 404, try driver balance endpoint which might have transaction data
      if (!response.success && response.error?.includes('404')) {
        endpoint = '/api/v1/auth/drivers/balance/';
        response = await this.client.get<BackendTransactionResponse>(endpoint);
        
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
              type: 'earning' as const,
              amount: 5.00,
              description: 'Customer tip - Order #12345',
              date: new Date(),
              status: 'completed',
              orderId: '12345'
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
        let transactionData = (response.data as BackendTransactionResponse).transactions || (response.data as BackendTransactionResponse).results || response.data || [];
        
        // If transactionData is not an array, try to extract transactions from it
        if (!Array.isArray(transactionData) && transactionData.transactions) {
          transactionData = transactionData.transactions;
        }
        
        // Ensure we have an array
        if (!Array.isArray(transactionData)) {
          transactionData = [];
        }
        
        const transactions = transactionData.map((transaction: BackendTransactionData): BalanceTransaction => 
          ApiTransformers.transformTransaction(transaction)
        );
        
        return {
          success: true,
          data: transactions,
          message: response.message
        };
      }
      
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch transactions'
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch transactions'
      };
    }
  }

  /**
   * Get driver balance and performance metrics
   */
  async getDriverBalance(): Promise<ApiResponse<DriverBalance>> {
    try {
      const response = await this.client.get<Record<string, unknown>>('/api/v1/auth/drivers/balance/');
      
      if (response.success && response.data) {
        const data = response.data as BackendTransactionResponse;
        
        const balance: DriverBalance = {
          // Financial data
          cashOnHand: data.cashOnHand || 0,
          depositBalance: data.depositBalance || 0,
          totalEarnings: data.totalEarnings || 0,
          pendingEarnings: data.pendingPayouts || 0,
          totalWithdrawals: data.totalWithdrawals || 0,
          availableBalance: data.availableBalance || data.cashOnHand || 0,
          pendingPayouts: data.pendingPayouts || 0,
          todayEarnings: data.todayEarnings || 0,
          weekEarnings: data.weekEarnings || 0,
          monthEarnings: data.monthEarnings || 0,
          
          // Performance metrics (these need to be added to the backend API)
          averageDeliveryTime: data.averageDeliveryTime,
          availableOrders: data.availableOrders || 0,
          completedOrders: data.completedOrders || 0,
          todayCompletedOrders: data.todayCompletedOrders || 0,
          totalDeliveries: data.totalDeliveries || 0,
          successfulDeliveries: data.successfulDeliveries || 0,
          successRate: data.successRate || 0,
          averageRating: data.averageRating || 0,
          
          lastUpdated: new Date().toISOString(),
          breakdown: {
            today: data.todayEarnings || 0,
            week: data.weekEarnings || 0,
            month: data.monthEarnings || 0,
            deliveryEarnings: data.totalEarnings || 0,
            tips: data.totalTips || 0,
            bonuses: data.totalBonuses || 0
          }
        };
        
        return {
          success: true,
          data: balance,
          message: 'Driver balance fetched successfully'
        };
      }
      
      return response as ApiResponse<DriverBalance>;
      
    } catch (error) {
      return {
        success: false,
        data: {} as DriverBalance,
        error: error instanceof Error ? error.message : 'Failed to fetch driver balance'
      };
    }
  }

  /**
   * Get driver earnings summary for a specific period
   */
  async getDriverEarnings(startDate?: string, endDate?: string): Promise<ApiResponse<DriverBalance>> {
    
    try {
      // Try multiple possible endpoints for earnings/balance
      let endpoint = '/api/v1/auth/drivers/balance/';
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      let response = await this.client.get<Record<string, unknown>>(endpoint);
      
      // If that fails, try the driver balance endpoint
      if (!response.success && response.error?.includes('404')) {
        endpoint = '/api/v1/auth/drivers/';
        response = await this.client.get<Record<string, unknown>>(endpoint);
      }
      
      if (response.success && response.data) {
        // Use custom period earnings if available, otherwise use total earnings
        const data = response.data as BackendTransactionResponse;
        const periodEarnings = data.customPeriodEarnings !== null && data.customPeriodEarnings !== undefined
          ? data.customPeriodEarnings 
          : data.totalEarnings || 0;

        const earnings: DriverBalance = {
          cashOnHand: data.cashOnHand || 0,
          depositBalance: data.depositBalance || 0,
          totalEarnings: periodEarnings,
          pendingEarnings: data.pendingPayouts || 0,
          totalWithdrawals: data.totalWithdrawals || 0,
          availableBalance: data.availableBalance || data.cashOnHand || 0,
          pendingPayouts: data.pendingPayouts || 0,
          todayEarnings: data.todayEarnings || 0,
          weekEarnings: data.weekEarnings || 0,
          monthEarnings: data.monthEarnings || 0,
          lastUpdated: new Date().toISOString(),
          breakdown: {
            today: data.todayEarnings || 0,
            week: data.weekEarnings || 0,
            month: data.monthEarnings || 0,
            deliveryEarnings: periodEarnings,
            tips: 0, // Will be available from transactions
            bonuses: 0 // Will be available from transactions
          },
          period: data.period || { start_date: startDate, end_date: endDate }
        };
        
        return {
          success: true,
          data: earnings,
          message: response.message
        };
      }
      
      throw new Error(response.error || 'No earnings data available');
      
    } catch (error) {
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
    
    try {
      let endpoint = `/api/v1/auth/drivers/transaction_history/?page=${page}&page_size=${pageSize}`;
      
      let response = await this.client.get<Record<string, unknown>>(endpoint);
      
      // If 404, try without pagination parameters
      if (!response.success && response.error?.includes('404')) {
        endpoint = '/api/v1/auth/drivers/transaction_history/';
        response = await this.client.get<Record<string, unknown>>(endpoint);
      }
      
      // If still 404, try driver balance endpoint which might have transaction data
      if (!response.success && response.error?.includes('404')) {
        endpoint = '/api/v1/auth/drivers/balance/';
        response = await this.client.get<Record<string, unknown>>(endpoint);
      }
      
      if (response.success && response.data) {
        // Handle different response formats
        let transactionData: BackendTransactionData[] = [];
        
        if (Array.isArray(response.data)) {
          // Direct array of transactions
          transactionData = response.data as BackendTransactionData[];
        } else if ((response.data as BackendTransactionResponse).transactions) {
          // Transactions in a property
          transactionData = (response.data as BackendTransactionResponse).transactions || [];
        } else if ((response.data as BackendTransactionResponse).results) {
          // Paginated response
          transactionData = (response.data as BackendTransactionResponse).results || [];
        } else {
          // No transactions found
          transactionData = [];
        }
        
        const transactions = transactionData.map((transaction: BackendTransactionData): BalanceTransaction => 
          ApiTransformers.transformTransaction(transaction)
        );
        
        return {
          success: true,
          data: transactions,
          message: response.message
        };
      }
      
      return {
        success: false,
        data: [],
        error: response.error || 'Failed to fetch transactions'
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get transactions'
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
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
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

  // ==================== Tenant Management ====================

  async getTenant(): Promise<ApiResponse<Tenant>> {
    const response = await this.client.get<Tenant>('/api/v1/tenant/info/');
    
    if (response.success && response.data) {
      await Storage.setItem(STORAGE_KEYS.TENANT_ID, response.data);
    }
    
    return response;
  }

  async getTenantSettings(): Promise<ApiResponse<TenantSettings>> {
    return this.client.get<TenantSettings>('/api/v1/tenant/settings/');
  }

  // ==================== Nearby Drivers ====================

  async getNearbyDrivers(latitude: number, longitude: number, radius: number = 5): Promise<ApiResponse<Driver[]>> {
    const response = await this.client.get<BackendDriver[]>(`/api/v1/auth/drivers/nearby_drivers/?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
    
    if (response.success && response.data) {
      const drivers = response.data.map(ApiTransformers.transformDriver);
      return {
        success: true,
        data: drivers,
        message: response.message
      };
    }
    
    return response as ApiResponse<Driver[]>;
  }

  // ==================== Diagnostics ====================

  async diagnoseMobileOrderIssue(): Promise<ApiResponse<Record<string, unknown>>> {
    const report: {
      timestamp: string;
      diagnostics: Record<string, unknown>;
    } = {
      timestamp: new Date().toISOString(),
      diagnostics: {}
    };

    try {
      // 1. Check authentication
      const token = await SecureStorage.getAuthToken();
      report.diagnostics['authentication'] = {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      };

      // 2. Check user info
      try {
        const userResponse = await this.client.get<UserInfoResponse>('/whoami/');
        report.diagnostics['userInfo'] = userResponse.data || 'Failed to get user info';
      } catch (error) {
        report.diagnostics['userInfo'] = `Error: ${error}`;
      }

      // 3. Check driver info
      const driverInfo = await this.getDriverInfo();
      report.diagnostics['driverData'] = {
        success: driverInfo.success,
        driverId: driverInfo.data?.id,
        isOnline: driverInfo.data?.isOnline,
        error: driverInfo.error
      };

      // 4. Check available orders endpoint
      try {
        const ordersResponse = await this.getAvailableOrdersWithDistance();
        report.diagnostics['availableOrders'] = {
          success: ordersResponse.success,
          count: ordersResponse.data?.length || 0,
          error: ordersResponse.error
        };
      } catch (error) {
        report.diagnostics['availableOrders'] = `Error: ${error}`;
      }

      // 5. Check driver orders endpoint
      try {
        const driverOrdersResponse = await this.getDriverOrders();
        report.diagnostics['driverOrders'] = {
          success: driverOrdersResponse.success,
          count: driverOrdersResponse.data?.length || 0,
          error: driverOrdersResponse.error
        };
      } catch (error) {
        report.diagnostics['driverOrders'] = `Error: ${error}`;
      }

      // 6. Check balance endpoint
      try {
        const balanceResponse = await this.getDriverEarnings();
        report.diagnostics['balance'] = {
          success: balanceResponse.success,
          totalEarnings: balanceResponse.data?.totalEarnings,
          error: balanceResponse.error
        };
      } catch (error) {
        report.diagnostics['balance'] = `Error: ${error}`;
      }

      // 7. Direct API test
      const directResponse = await this.client.get<BackendDelivery[]>('/api/v1/delivery/deliveries/available_orders/');
      report.diagnostics['directApiTest'] = {
        success: directResponse.success,
        dataLength: directResponse.data?.length || 0,
        error: directResponse.error
      };
      
      // 8. Check driver online status in backend
      const cachedDriver = await Storage.getItem(STORAGE_KEYS.DRIVER_DATA);
      const driverId = (cachedDriver as Driver)?.id || await this.extractDriverIdFromToken();
      
      if (driverId) {
        const statusResponse = await this.client.get<BackendDriver>('/api/v1/auth/drivers/me/');
        if (statusResponse.success) {
          report.diagnostics['driverStatus'] = {
            id: statusResponse.data.id,
            is_online: statusResponse.data.is_online,
            is_available: statusResponse.data.is_available,
            is_on_duty: statusResponse.data.is_on_duty
          };
        }
      }

      return {
        success: true,
        data: report,
        message: 'Diagnostics completed successfully'
      };

    } catch (error) {
      report.diagnostics.error = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: report,
        error: 'Diagnostics encountered an error'
      };
    }
  }

  // ==================== Batch Legs ====================

  async getAvailableBatchLegs(): Promise<ApiResponse<BatchLegListResponse>> {
    
    try {
      const locationService = await import('../services/locationService');
      const currentLocation = await locationService.locationService.getCurrentLocation();
      
      const url = `/api/v1/delivery/batch-legs/available_legs/?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`;
      return this.client.get<BatchLegListResponse>(url);
    } catch (locationError) {
      return this.client.get<BatchLegListResponse>('/api/v1/delivery/batch-legs/available_legs/');
    }
  }

  async getBatchLegDetails(legId: string): Promise<ApiResponse<BatchLeg>> {
    return this.client.get<BatchLeg>(`/api/v1/delivery/batch-legs/${legId}/leg_details/`);
  }

  async acceptBatchLeg(legId: string): Promise<ApiResponse<BatchLegAcceptResponse>> {
    return this.client.post<BatchLegAcceptResponse>(`/api/v1/delivery/batch-legs/${legId}/accept_leg/`, {});
  }

  async completeBatchLeg(legId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/api/v1/delivery/batch-legs/${legId}/complete_leg/`, {});
  }

  // ==================== Driver Profile ====================

  async getDriverProfileNew(): Promise<ApiResponse<DriverProfile>> {
    return this.client.get<DriverProfile>('/api/v1/drivers/driver-profile/');
  }

  async updateDriverProfile(profile: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    return this.client.put<DriverProfile>('/api/v1/drivers/driver-profile/', profile);
  }
}