/**
 * Simplified OrderProvider for testing the refactored structure
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Order, OrderContextType, OrderStatus } from '../../../types';
import { apiService } from '../../../services/api';
import { realtimeService } from '../../../services/realtimeService';
import { useAuth } from '../../../contexts/AuthContext';
import { orderActionService } from '../../../services/orderActionService';

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
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverOrders, setDriverOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Store the notification callback
  const notificationCallbackRef = useRef<((order: Order) => void) | null>(null);
  
  // Actions - Define these before the effects that use them
  const refreshOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAvailableOrders();
      
      if (response.success) {
        setOrders(response.data);
        setLastUpdated(new Date().toISOString());
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize realtime service when user is logged in
  useEffect(() => {
    // Only initialize when user is logged in and not still loading auth
    if (!isLoggedIn || authLoading) {
      return;
    }

    const initializeRealtimeService = async () => {
      try {
        // Set up realtime service callbacks
        realtimeService.setCallbacks({
          onNewOrder: (order: Order) => {
            // Add to orders if not already present
            setOrders(prev => {
              const exists = prev.some(o => o.id === order.id);
              if (!exists) {
                return [...prev, order];
              }
              return prev;
            });
            
            // Trigger notification callback for IncomingOrderModal
            if (notificationCallbackRef.current) {
              notificationCallbackRef.current(order);
            }
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
            if (!error.toLowerCase().includes('authentication failed')) {
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
        
        // Start the service
        realtimeService.start();
      } catch (error) {
        setError('Failed to initialize real-time updates');
      }
    };
    
    initializeRealtimeService();
    
    // Cleanup on unmount or logout
    return () => {
      realtimeService.stop();
    };
  }, [isLoggedIn, authLoading]);

  // Load initial orders when user is logged in
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      refreshOrders();
    }
  }, [isLoggedIn, authLoading, refreshOrders]);

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
    // Find the order in our current orders to debug
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      // Don't try to accept an order that's not in our state
      Alert.alert(
        'Order Not Available',
        'This order is not available. Please refresh the order list.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    try {
      // Use the new unified order action service
      const response = await orderActionService.acceptUnifiedOrder(order, orderId);
      
      if (response.success) {
        // Remove the accepted order from available orders
        setOrders(prev => prev.filter(o => o.id !== orderId));
        return true;
      } else {
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error: any) {
      // Check if it's a 404 error (order not found)
      if (error.response?.status === 404 || error.message?.includes('404')) {
        // Remove the order from local state since it doesn't exist in backend
        setOrders(prev => prev.filter(o => o.id !== orderId));
        
        // Show user-friendly error
        Alert.alert(
          'Order Not Available',
          'This order is no longer available. It may have been accepted by another driver.',
          [{ text: 'OK' }]
        );
      }
      
      return false;
    }
  }, [orders]);

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

  const updateOrderStatus = useCallback(async (deliveryId: string, status: OrderStatus): Promise<boolean> => {
    try {
      const response = await apiService.updateOrderStatus(deliveryId, status);
      if (response.success) {
        // Update order in state (using delivery ID since order.id contains delivery ID)
        setOrders(prev => prev.map(o => 
          o.id === deliveryId ? { ...o, status } : o
        ));
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, []);

  const getOrderHistory = useCallback(async (filters?: any) => {
    setIsLoading(true);
    try {
      const response = await apiService.getOrderHistory();
      if (response.success) {
        setOrderHistory(response.data);
      }
    } catch (error) {
      // Failed to get order history
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOrders = useCallback(() => {
    setOrders([]);
    setOrderHistory([]);
    setLastUpdated(null);
  }, []);

  const setOrderNotificationCallback = useCallback((callback: ((order: Order) => void) | null) => {
    notificationCallbackRef.current = callback;
  }, []);

  const setOrderAcceptedCallback = useCallback((callback: ((orderId: string) => void) | null) => {
    // Not implemented yet but required by interface
  }, []);

  const getDriverOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[OrderProvider] Fetching driver orders...');
      const response = await apiService.getDriverOrders();
      console.log('[OrderProvider] Driver orders response:', response);
      
      if (response.success && response.data) {
        console.log('[OrderProvider] Setting driver orders:', response.data.length, 'orders');
        setDriverOrders(response.data);
        setError(null);
      } else {
        console.error('[OrderProvider] Failed response:', response);
        setError(response.error || 'Failed to load orders');
        setDriverOrders([]);
      }
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