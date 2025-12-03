/**
 * Simplified OrderProvider for testing the refactored structure
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { Order, OrderContextType, OrderStatus } from '../../../types';
import { apiService } from '../../../services/api';
import { realtimeService } from '../../../services/realtimeService';
import { useAuth } from '../../../contexts/AuthContext';
import { useDriver } from '../../../contexts/DriverContext';
import { orderActionService } from '../../../services/orderActionService';
import { 
  cacheService, 
  getCachedAvailableOrders, 
  getCachedDriverOrders, 
  getCachedOrderHistory 
} from '../../../services/comprehensiveCacheService';

// Context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Simple provider component
interface OrderProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
  websocketUrl?: string;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({
  children,
}) => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { driver } = useDriver();
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverOrders, setDriverOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  const [seenBatchIds, setSeenBatchIds] = useState<Set<string>>(new Set());
  
  // Store the notification callback
  const notificationCallbackRef = useRef<((order: Order) => void) | null>(null);
  
  // Actions - Define these before the effects that use them
  const refreshOrders = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use cached data if available and not forcing refresh
      const newOrders = await getCachedAvailableOrders(
        async () => {
          const response = await apiService.getAvailableOrders();
          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch orders');
          }
          return response.data;
        },
        forceRefresh
      );
      
      // Check if data has actually changed
      const hasChanged = await cacheService.hasChanged('availableOrders', newOrders);
      
      if (hasChanged) {
        // Check for new orders that weren't seen before
        const batchesToNotify = new Map<string, Order>(); // Map to store first order of each batch
        
        newOrders.forEach(order => {
          const batchId = order.current_batch?.id;
          
          if (!seenOrderIds.has(order.id) && driver?.isOnline) {
            if (batchId) {
              // For batch orders, only notify once per batch
              if (!seenBatchIds.has(batchId) && !batchesToNotify.has(batchId)) {
                console.log('🆕 [OrderProvider] New batch detected during refresh:', batchId);
                batchesToNotify.set(batchId, order); // Store first order of batch
              }
            } else {
              // For non-batch orders, notify immediately
              if (notificationCallbackRef.current) {
                console.log('🆕 [OrderProvider] New single order detected during refresh:', order.order_number);
                notificationCallbackRef.current(order);
              }
            }
          }
        });
        
        // Trigger notifications for new batches (one per batch)
        batchesToNotify.forEach((order, batchId) => {
          if (notificationCallbackRef.current) {
            console.log('🔔 [OrderProvider] Triggering notification for batch:', batchId);
            notificationCallbackRef.current(order);
          }
          setSeenBatchIds(prev => new Set([...prev, batchId]));
        });
        
        // Update seen order IDs - only add new orders, don't replace the whole set
        setSeenOrderIds(prev => {
          const newSet = new Set(prev);
          newOrders.forEach(order => newSet.add(order.id));
          return newSet;
        });
      }
      
      // Always update orders (even if not changed) to ensure UI is in sync
      setOrders(newOrders);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setOrders([]); // Clear orders on error
    } finally {
      setIsLoading(false);
    }
  }, [seenOrderIds, driver?.isOnline]);

  // Initialize realtime service when user is logged in
  useEffect(() => {
    // Only initialize when user is logged in and not still loading auth
    if (!isLoggedIn || authLoading) {
      return;
    }

    const initializeRealtimeService = async () => {
      try {
        // Set up notification service callbacks for push notifications
        console.log('[OrderProvider] Setting up notification service callbacks');
        const { notificationService } = await import('../../../services/notificationService');
        notificationService.setNotificationCallbacks({
          // Callback to check if driver is active/online - used to filter notifications BEFORE sound/vibration
          isDriverActive: () => {
            // Check isOnline - this is the main toggle for receiving orders
            // isAvailable and status are optional additional checks
            const isOnline = driver?.isOnline === true;
            const isAvailable = driver?.isAvailable !== false; // Default to true if not set
            const statusOk = !driver?.status || driver?.status === 'available' || driver?.status === 'online' || driver?.status === 'active';
            const result = isOnline && isAvailable && statusOk;
            console.log(`[OrderProvider] isDriverActive check: isOnline=${driver?.isOnline}, isAvailable=${driver?.isAvailable}, status=${driver?.status}, result=${result}`);
            return result;
          },
          onNewOrder: (order: Order) => {
            console.log('[OrderProvider] New order from push notification:', order.order_number);
            // Note: Driver status check is already done by notificationService.checkDriverActiveStatus()
            // before this callback is called. No need to double-check here.

            // Handle batch notifications
            const batchId = order.current_batch?.id;
            if (batchId) {
              // Check if we've already seen this batch
              if (!seenBatchIds.has(batchId)) {
                console.log('[OrderProvider] New batch from push notification:', batchId);
                setSeenBatchIds(prev => new Set([...prev, batchId]));
                
                // Trigger the incoming order modal
                if (notificationCallbackRef.current) {
                  notificationCallbackRef.current(order);
                }
              }
            } else {
              // Single order - trigger modal immediately
              if (notificationCallbackRef.current) {
                notificationCallbackRef.current(order);
              }
            }
            
            // Add to orders list
            setOrders(prev => {
              const exists = prev.some(o => o.id === order.id);
              if (!exists) {
                return [...prev, order];
              }
              return prev;
            });
            
            // Mark as seen
            setSeenOrderIds(prev => new Set([...prev, order.id]));
          }
        });
        
        // Set up realtime service callbacks
        realtimeService.setCallbacks({
          onNewOrder: (order: Order) => {
            // Note: The realtime service only runs when driver is online (checked in start())
            // so we don't need to double-check here. This fixes stale closure issues.
            if (__DEV__) {
              console.log('[OrderProvider] New order received from realtime service:', {
                orderNumber: order.order_number,
                orderId: order.id
              });
            }

            // Check if this order is part of a batch
            const batchId = order.current_batch?.id;
            if (batchId) {
              // Check if we've already seen this batch
              setSeenBatchIds(prev => {
                const batchAlreadySeen = prev.has(batchId);
                if (batchAlreadySeen) {
                  if (__DEV__) {
                    console.log('[OrderProvider] Batch already seen, skipping notification for order:', order.order_number);
                  }
                  return prev;
                }
                
                if (__DEV__) {
                  console.log('🆕 [OrderProvider] New batch detected:', batchId);
                }
                // Mark batch as seen
                return new Set([...prev, batchId]);
              });
              
              // If this is the first order from a batch, trigger the notification
              const isBatchAlreadySeen = seenBatchIds.has(batchId);
              if (!isBatchAlreadySeen && notificationCallbackRef.current) {
                if (__DEV__) {
                  console.log('🔔 [OrderProvider] Triggering IncomingOrderModal for batch:', batchId);
                }
                notificationCallbackRef.current(order);
              }
            } else {
              // For non-batch orders, trigger notification immediately
              if (notificationCallbackRef.current) {
                if (__DEV__) {
                  console.log('🔔 [OrderProvider] Triggering IncomingOrderModal for single order');
                }
                notificationCallbackRef.current(order);
              }
            }
            
            // Add to orders if not already present
            setOrders(prev => {
              const exists = prev.some(o => o.id === order.id);
              if (!exists) {
                if (__DEV__) {
                  console.log('✅ [OrderProvider] Adding new order to state');
                }
                return [...prev, order];
              }
              if (__DEV__) {
                console.log('⚠️ [OrderProvider] Order already exists in state');
              }
              return prev;
            });
            
            // Mark order as seen
            setSeenOrderIds(prev => new Set([...prev, order.id]));
          },
          onOrderUpdate: (order: Order) => {
            setOrders(prev => prev.map(o => o.id === order.id ? order : o));
          },
          onConnectionChange: (connected: boolean) => {
            // Connection status changed
          },
          onError: (error: string) => {
            // Only set error if it's not a generic authentication error from realtime service
            // The realtime service may fail to connect but API calls can still work
            if (!error.toLowerCase().includes('authentication failed') && __DEV__) {
              console.log('[OrderProvider] Realtime error:', error);
              // Don't set error state for realtime connection issues
              // as they don't affect the ability to fetch orders via API
            }
          }
        });
        
        // Enable initialization after login
        realtimeService.enableInitialization();
        
        // Initialize the service
        await realtimeService.initialize();
        
        // Only start the service if driver is online
        if (driver?.isOnline) {
          console.log('🚀 [OrderProvider] Driver is online, starting realtime service...');
          realtimeService.start();
        } else {
          console.log('⏸️ [OrderProvider] Driver is offline, not starting realtime service');
        }
      } catch (error) {
        setError('Failed to initialize real-time updates');
      }
    };
    
    initializeRealtimeService();
    
    // Cleanup on unmount or logout
    return () => {
      realtimeService.stop();
    };
  }, [isLoggedIn, authLoading, driver]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`📱 [OrderProvider] App state changed to: ${nextAppState}`);
      
      if (nextAppState === 'active' && isLoggedIn && !authLoading) {
        console.log('🔄 [OrderProvider] App returned to foreground, reinitializing services...');
        
        // Stop existing connections
        realtimeService.stop();
        
        // Small delay to ensure clean shutdown
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Reinitialize realtime service with fresh token
          await realtimeService.retryInitialization();
          
          // Start service if driver is online
          if (driver?.isOnline) {
            realtimeService.start();
          }
          
          // Force refresh all data by calling API directly
          // We can't use refreshOrders here because it's defined later
          setIsLoading(true);
          try {
            const response = await apiService.getAvailableOrders();
            if (response.success && response.data) {
              setOrders(response.data);
            }
            // Fetch driver orders directly
            const driverResponse = await apiService.getDriverOrders();
            if (driverResponse.success && driverResponse.data) {
              setDriverOrders(driverResponse.data);
            }
          } finally {
            setIsLoading(false);
          }
          
          console.log('✅ [OrderProvider] Services reinitialized after app resume');
        } catch (error) {
          console.error('❌ [OrderProvider] Failed to reinitialize after app resume:', error);
          
          // Try to refresh token explicitly
          try {
            await apiService.refreshToken();
            // Retry initialization after token refresh
            await realtimeService.retryInitialization();
            if (driver?.isOnline) {
              realtimeService.start();
            }
          } catch (tokenError) {
            console.error('❌ [OrderProvider] Token refresh failed:', tokenError);
            // User might need to re-login
          }
        }
      } else if (nextAppState === 'background') {
        console.log('📴 [OrderProvider] App going to background, stopping realtime service...');
        // Stop realtime connections when app goes to background
        realtimeService.stop();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, authLoading, driver?.isOnline]);

  // Load initial orders when user is logged in
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      refreshOrders();
    }
  }, [isLoggedIn, authLoading, refreshOrders]);
  
  // Set up periodic refresh for available orders when driver is online
  // DISABLED: Using realtime service polling instead to avoid duplicate requests
  /*
  useEffect(() => {
    if (!isLoggedIn || authLoading || !driver?.isOnline) {
      console.log('[OrderProvider] Skipping periodic refresh - driver offline or not logged in');
      return;
    }
    
    console.log('⏰ [OrderProvider] Setting up periodic refresh for available orders');
    
    // Initial refresh
    refreshOrders();
    
    // Set up interval for periodic refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      console.log('🔄 [OrderProvider] Periodic refresh triggered');
      refreshOrders();
    }, 30000); // 30 seconds
    
    return () => {
      console.log('🛑 [OrderProvider] Clearing periodic refresh interval');
      clearInterval(intervalId);
    };
  }, [isLoggedIn, authLoading, driver?.isOnline, refreshOrders]);
  */
  
  // Listen for driver status changes to refresh orders immediately
  useEffect(() => {
    if (driver?.isOnline) {
      console.log('🎯 [OrderProvider] Driver is online, starting realtime service and refreshing orders...');
      
      // Start realtime service when driver goes online
      if (!realtimeService.isConnectedToServer()) {
        console.log('🔄 Starting realtime service for online driver...');
        realtimeService.start();
      }
      
      // Small delay to ensure status is updated in backend
      const timer = setTimeout(async () => {
        // Fetch driver orders directly
        try {
          const response = await apiService.getDriverOrders();
          if (response.success && response.data) {
            setDriverOrders(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch driver orders:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (driver && !driver.isOnline) {
      console.log('🛑 [OrderProvider] Driver is offline, stopping realtime service...');
      
      // Stop realtime service when driver goes offline to prevent polling errors
      if (realtimeService.isConnectedToServer()) {
        realtimeService.stop();
      }
    }
  }, [driver?.isOnline]);

  const getOrderDetails = useCallback(async (orderId: string) => {
    // First check driver orders (accepted orders)
    const driverOrder = driverOrders.find(o => o.id === orderId);
    if (driverOrder) {
      console.log('[OrderProvider] Found order in driverOrders:', {
        orderId,
        hasCoordinates: !!(driverOrder.pickup_latitude && driverOrder.delivery_latitude),
        coordinates: {
          pickup: { lat: driverOrder.pickup_latitude, lng: driverOrder.pickup_longitude },
          delivery: { lat: driverOrder.delivery_latitude, lng: driverOrder.delivery_longitude }
        }
      });
      return driverOrder;
    }
    
    // Then check available orders
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log('[OrderProvider] Found order in orders:', {
        orderId,
        hasCoordinates: !!(order.pickup_latitude && order.delivery_latitude),
        coordinates: {
          pickup: { lat: order.pickup_latitude, lng: order.pickup_longitude },
          delivery: { lat: order.delivery_latitude, lng: order.delivery_longitude }
        }
      });
      return order;
    }
    
    // Fetch from API if needed
    try {
      console.log('[OrderProvider] Fetching order details from API:', orderId);
      const response = await apiService.getOrderDetails(orderId);
      if (response.success && response.data) {
        console.log('[OrderProvider] API response:', {
          orderId,
          hasCoordinates: !!(response.data.pickup_latitude && response.data.delivery_latitude),
          coordinates: {
            pickup: { lat: response.data.pickup_latitude, lng: response.data.pickup_longitude },
            delivery: { lat: response.data.delivery_latitude, lng: response.data.delivery_longitude }
          }
        });
        return response.data;
      }
    } catch (error) {
      console.error('[OrderProvider] Error fetching order details:', error);
    }
    
    throw new Error('Order not found');
  }, [orders, driverOrders]);

  const acceptOrder = useCallback(async (orderId: string): Promise<boolean> => {
    console.log('[OrderProvider] acceptOrder called with ID:', orderId);

    // Find the order in our current orders to debug
    const order = orders.find(o => o.id === orderId);

    // If order is not in state (e.g., from push notification), make a direct API call
    if (!order) {
      console.log('[OrderProvider] Order not found in state, attempting direct API accept:', orderId);
      console.log('[OrderProvider] Available order IDs:', orders.map(o => o.id));

      try {
        // Direct API call for orders from push notifications
        const response = await apiService.acceptOrder(orderId);

        if (response.success) {
          console.log('[OrderProvider] Order accepted via direct API call');

          // Invalidate caches when order is accepted
          await cacheService.invalidateByEvent('orderAccepted');

          // Wait for backend to process
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Refresh orders
          await getDriverOrders(true);
          await refreshOrders(true);

          return true;
        } else {
          console.log('[OrderProvider] Direct API accept failed:', response.error);
          Alert.alert(
            'Accept Order Failed',
            response.error || 'Failed to accept order. Please try again.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } catch (error: any) {
        console.error('[OrderProvider] Direct API accept exception:', error);
        Alert.alert(
          'Accept Order Failed',
          error.message || 'Failed to accept order. Please try again.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    console.log('[OrderProvider] Order found in state:', {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      customer: order.customer?.name || 'Unknown'
    });

    try {
      console.log('[OrderProvider] Calling orderActionService.acceptUnifiedOrder...');
      // Use the new unified order action service
      const response = await orderActionService.acceptUnifiedOrder(order, orderId);
      
      console.log('[OrderProvider] Response received:', {
        success: response.success,
        error: response.error,
        hasData: !!response.data
      });

      if (response.success) {
        console.log('[OrderProvider] Order accepted successfully, removing from available orders');
        // Remove the accepted order from available orders
        setOrders(prev => prev.filter(o => o.id !== orderId));

        // Invalidate caches when order is accepted
        await cacheService.invalidateByEvent('orderAccepted');

        // Add a small delay to ensure backend has updated the order status
        console.log('[OrderProvider] Waiting for backend to process order acceptance...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay

        // Refresh driver orders to get the newly accepted order
        console.log('[OrderProvider] Refreshing driver orders after acceptance');
        await getDriverOrders(true); // Force refresh

        // Also refresh available orders to ensure consistency
        console.log('[OrderProvider] Refreshing available orders after acceptance');
        await refreshOrders(true); // Force refresh

        return true;
      } else {
        console.log('[OrderProvider] Order acceptance failed:', response.error);
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error: any) {
      console.error('[OrderProvider] Exception in acceptOrder:', error);
      console.log('[OrderProvider] Error details:', {
        message: error.message,
        status: error.response?.status,
        type: typeof error,
        hasResponseData: !!error.response?.data
      });

      // Check if it's a 404 error (order not found)
      if (error.response?.status === 404 || error.message?.includes('404')) {
        console.log('[OrderProvider] 404 error - removing order from state');
        // Remove the order from local state since it doesn't exist in backend
        setOrders(prev => prev.filter(o => o.id !== orderId));
        
        // Show user-friendly error
        Alert.alert(
          'Order Not Available',
          'This order is no longer available. It may have been accepted by another driver.',
          [{ text: 'OK' }]
        );
      } else {
        // Show generic error for other failures
        Alert.alert(
          'Accept Order Failed',
          `Failed to accept order: ${error.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
      
      return false;
    }
  }, [orders, getDriverOrders, refreshOrders]);

  const declineOrder = useCallback(async (orderId: string, reason?: string) => {
    // Check if order exists in state
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      Alert.alert(
        'Order Not Available',
        'This order is not available. Please refresh the order list.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      const response = await apiService.declineOrder(orderId, reason);
      if (response.success) {
        // Remove the declined order from available orders
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error: any) {
      // Handle 404 error
      if (error.response?.status === 404 || error.message?.includes('404')) {
        // Remove from local state since it doesn't exist in backend
        setOrders(prev => prev.filter(o => o.id !== orderId));
        Alert.alert(
          'Order Not Available',
          'This order is no longer available.',
          [{ text: 'OK' }]
        );
      } else {
        throw error;
      }
    }
  }, [orders]);

  const updateOrderStatus = useCallback(async (deliveryId: string, status: OrderStatus, photoId?: string): Promise<boolean> => {
    try {
      const response = await apiService.updateOrderStatus(deliveryId, status, photoId);
      if (response.success) {
        // Update order in both orders and driverOrders state
        // (using delivery ID since order.id contains delivery ID)
        setOrders(prev => prev.map(o =>
          o.id === deliveryId ? { ...o, status } : o
        ));

        // Also update driverOrders state to ensure UI reflects the change immediately
        setDriverOrders(prev => prev.map(o =>
          o.id === deliveryId ? { ...o, status } : o
        ));

        // Invalidate caches when status changes
        await cacheService.invalidateByEvent('orderStatusChanged');

        // If order is completed, invalidate history cache too
        if (status === 'delivered' || status === 'failed') {
          await cacheService.invalidateByEvent('orderCompleted');
        }

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, []);

  const getOrderHistory = useCallback(async (filters?: any, forceRefresh = false) => {
    setIsLoading(true);
    try {
      // Use cached data if available
      const history = await getCachedOrderHistory(
        async () => {
          const response = await apiService.getOrderHistory();
          if (!response.success) {
            throw new Error(response.error || 'Failed to load order history');
          }
          return response.data || [];
        },
        forceRefresh
      );
      
      setOrderHistory(history);
    } catch (error) {
      console.error('[OrderProvider] Failed to get order history:', error);
      // Don't clear history on error to prevent flickering
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOrders = useCallback(() => {
    setOrders([]);
    setOrderHistory([]);
    setLastUpdated(null);
    setSeenOrderIds(new Set());
    setSeenBatchIds(new Set());
  }, []);

  const setOrderNotificationCallback = useCallback((callback: ((order: Order) => void) | null) => {
    notificationCallbackRef.current = callback;
  }, []);

  const setOrderAcceptedCallback = useCallback((callback: ((orderId: string) => void) | null) => {
    // Not implemented yet but required by interface
  }, []);

  const getDriverOrders = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[OrderProvider] Fetching driver orders...');
      
      // Use cached data if available
      const orders = await getCachedDriverOrders(
        async () => {
          const response = await apiService.getDriverOrders(forceRefresh);
          if (!response.success) {
            throw new Error(response.error || 'Failed to load orders');
          }
          return response.data || [];
        },
        forceRefresh
      );
      
      console.log('[OrderProvider] Setting driver orders:', orders.length, 'orders');
      setDriverOrders(orders);
      setError(null);
    } catch (error) {
      console.error('[OrderProvider] Exception caught:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to get driver orders';
      setError(errorMsg);
      setDriverOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRouteOptimization = useCallback(async () => {
    // Not implemented yet but required by interface
    return null;
  }, []);

  const canAcceptOrder = useCallback((order: Order) => {
    // Check if the order can be accepted by the driver
    // Basic validation: order should be pending/assigned and not already assigned to another driver
    const validStatuses: OrderStatus[] = ['pending', 'assigned'];
    const hasValidStatus = validStatuses.includes(order.status!);
    
    // You can add more business logic here, such as:
    // - Driver availability checks
    // - Location proximity checks
    // - Driver capacity checks
    // - Time constraints
    
    return hasValidStatus;
  }, []);

  // Create the context value
  const contextValue: OrderContextType = {
    // State
    orders,
    driverOrders,
    orderHistory,
    isLoading,
    error,
    
    // Actions
    refreshOrders,
    getOrderDetails,
    acceptOrder,
    declineOrder,
    updateOrderStatus,
    getOrderHistory,
    getDriverOrders,
    getRouteOptimization,
    setOrderNotificationCallback,
    setOrderAcceptedCallback,
    canAcceptOrder,
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

// Hook to use order context
export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};