/**
 * Simplified OrderProvider for testing the refactored structure
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Order, OrderContextType, OrderStatus } from '../../../types';
import { apiService } from '../../../services/api';
import { realtimeService } from '../../../services/realtimeService';
import { useAuth } from '../../../contexts/AuthContext';

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
  
  // Initialize realtime service when user is logged in
  useEffect(() => {
    // Only initialize when user is logged in and not still loading auth
    if (!isLoggedIn || authLoading) {
      console.log('🔌 OrderProvider: Waiting for authentication...', { isLoggedIn, authLoading });
      return;
    }

    const initializeRealtimeService = async () => {
      try {
        console.log('🔌 OrderProvider: Initializing realtime service after login...');
        
        // Set up realtime service callbacks
        realtimeService.setCallbacks({
          onNewOrder: (order: Order) => {
            console.log('🔔 OrderProvider: New order received from realtime service:', order.id);
            
            // Add to orders if not already present
            setOrders(prev => {
              const exists = prev.some(o => o.id === order.id);
              if (!exists) {
                console.log('📦 Adding new order to orders list:', order.id);
                return [...prev, order];
              }
              return prev;
            });
            
            // Trigger notification callback for IncomingOrderModal
            if (notificationCallbackRef.current) {
              console.log('🔔 Triggering notification callback for order:', order.id);
              notificationCallbackRef.current(order);
            } else {
              console.warn('⚠️ No notification callback set, order will not show modal');
            }
          },
          onOrderUpdate: (order: Order) => {
            console.log('📝 OrderProvider: Order update received:', order.id);
            setOrders(prev => prev.map(o => o.id === order.id ? order : o));
          },
          onConnectionChange: (connected: boolean) => {
            console.log('🔌 OrderProvider: Realtime connection status:', connected);
          },
          onError: (error: string) => {
            console.error('❌ OrderProvider: Realtime service error:', error);
            setError(error);
          }
        });
        
        // Initialize the service
        await realtimeService.initialize();
        
        // Start the service
        realtimeService.start();
        
        console.log('✅ OrderProvider: Realtime service initialized and started');
      } catch (error) {
        console.error('❌ OrderProvider: Failed to initialize realtime service:', error);
        setError('Failed to initialize real-time updates');
      }
    };
    
    initializeRealtimeService();
    
    // Cleanup on unmount or logout
    return () => {
      console.log('🧹 OrderProvider: Cleaning up realtime service');
      realtimeService.stop();
    };
  }, [isLoggedIn, authLoading]);

  // Load initial orders when user is logged in
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      console.log('🔄 OrderProvider: Loading initial orders for logged in user...');
      refreshOrders();
    }
  }, [isLoggedIn, authLoading, refreshOrders]);

  // Actions
  const refreshOrders = useCallback(async () => {
    console.log('🔄 OrderProvider: refreshOrders called');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getActiveOrders();
      console.log('📦 OrderProvider: Received orders response:', response);
      
      if (response.success) {
        setOrders(response.data);
        setLastUpdated(new Date().toISOString());
        console.log(`✅ OrderProvider: Set ${response.data.length} orders`);
      } else {
        setError(response.error || 'Failed to fetch orders');
        console.error('❌ OrderProvider: Failed to fetch orders:', response.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('❌ OrderProvider: Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getOrderDetails = useCallback(async (orderId: string) => {
    console.log('OrderProvider: getOrderDetails called:', orderId);
    // For now, find from current orders
    const order = orders.find(o => o.id === orderId);
    if (order) return order;
    
    // Could fetch from API if needed
    try {
      const response = await apiService.getOrderDetails(orderId);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Failed to get order details:', error);
    }
    
    throw new Error('Order not found');
  }, [orders]);

  const acceptOrder = useCallback(async (orderId: string): Promise<boolean> => {
    console.log('🔥 OrderProvider: acceptOrder called with ID:', orderId);
    
    // Find the order in our current orders to debug
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log('🔍 Found order in state:', {
        id: order.id,
        deliveryId: order.deliveryId,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status
      });
    } else {
      console.warn('⚠️ Order not found in current state with ID:', orderId);
      console.log('📋 Current orders in state:', orders.map(o => ({ id: o.id, orderNumber: o.orderNumber })));
    }
    
    try {
      console.log('🎯 Calling apiService.acceptOrder with ID:', orderId);
      const response = await apiService.acceptOrder(orderId);
      if (response.success) {
        // Remove the accepted order from available orders
        setOrders(prev => prev.filter(o => o.id !== orderId));
        console.log('✅ Order accepted successfully');
        return true;
      } else {
        console.error('❌ API returned error:', response.error);
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error) {
      console.error('❌ Failed to accept order:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        orderId,
        orderExists: !!order
      });
      return false;
    }
  }, [orders]);

  const declineOrder = useCallback(async (orderId: string, reason?: string) => {
    console.log('OrderProvider: declineOrder called:', orderId, reason);
    try {
      const response = await apiService.declineOrder(orderId, reason);
      if (response.success) {
        // Remove the declined order from available orders
        setOrders(prev => prev.filter(o => o.id !== orderId));
        console.log('✅ Order declined successfully');
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error) {
      console.error('❌ Failed to decline order:', error);
      throw error;
    }
  }, []);

  const updateOrderStatus = useCallback(async (deliveryId: string, status: OrderStatus): Promise<boolean> => {
    console.log('OrderProvider: updateOrderStatus called with delivery ID:', deliveryId, status);
    try {
      const response = await apiService.updateOrderStatus(deliveryId, status);
      if (response.success) {
        // Update order in state (using delivery ID since order.id contains delivery ID)
        setOrders(prev => prev.map(o => 
          o.id === deliveryId ? { ...o, status } : o
        ));
        console.log('✅ Order status updated successfully for delivery ID:', deliveryId);
        return true;
      } else {
        console.error('❌ API returned failure for delivery ID:', deliveryId, response.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to update order status for delivery ID:', deliveryId, error);
      return false;
    }
  }, []);

  const getOrderHistory = useCallback(async (filters?: any) => {
    console.log('OrderProvider: getOrderHistory called:', filters);
    setIsLoading(true);
    try {
      const response = await apiService.getOrderHistory();
      if (response.success) {
        setOrderHistory(response.data);
        console.log(`✅ Loaded ${response.data.length} historical orders`);
      }
    } catch (error) {
      console.error('❌ Failed to get order history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOrders = useCallback(() => {
    console.log('OrderProvider: clearOrders called');
    setOrders([]);
    setOrderHistory([]);
    setLastUpdated(null);
  }, []);

  const setOrderNotificationCallback = useCallback((callback: ((order: Order) => void) | null) => {
    console.log('OrderProvider: setOrderNotificationCallback called:', callback ? 'with callback' : 'with null');
    notificationCallbackRef.current = callback;
  }, []);

  const setOrderAcceptedCallback = useCallback((callback: ((orderId: string) => void) | null) => {
    console.log('OrderProvider: setOrderAcceptedCallback called:', callback ? 'with callback' : 'with null');
    // Not implemented yet but required by interface
  }, []);

  const getDriverOrders = useCallback(async () => {
    console.log('OrderProvider: getDriverOrders called');
    setIsLoading(true);
    try {
      const response = await apiService.getDriverOrders();
      if (response.success) {
        setDriverOrders(response.data);
        console.log(`✅ Loaded ${response.data.length} driver orders`);
      } else {
        console.error('❌ Failed to get driver orders:', response.error);
      }
    } catch (error) {
      console.error('❌ Failed to get driver orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRouteOptimization = useCallback(async () => {
    console.log('OrderProvider: getRouteOptimization called');
    // Not implemented yet but required by interface
    return null;
  }, []);

  const canAcceptOrder = useCallback((order: Order) => {
    // Check if the order can be accepted by the driver
    // Basic validation: order should be pending/assigned and not already assigned to another driver
    const validStatuses = [OrderStatus.PENDING, OrderStatus.ASSIGNED];
    const hasValidStatus = validStatuses.includes(order.status);
    
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