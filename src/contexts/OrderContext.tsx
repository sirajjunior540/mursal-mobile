import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { OrderContextType, Order, OrderStatus, HistoryFilter } from '../types';
import { STORAGE_KEYS, APP_SETTINGS } from '../constants';
import { Storage, SecureStorage } from '../utils';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import { realtimeService } from '../services/realtimeService';
import { soundService } from '../services/soundService';

// Action Types
type OrderAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_ORDER_HISTORY'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'REMOVE_ORDER'; payload: string }
  | { type: 'ADD_NEW_ORDER'; payload: Order }
  | { type: 'CLEAR_DATA' };

// State Type
interface OrderState {
  orders: Order[];
  orderHistory: Order[];
  isLoading: boolean;
  error: string | null;
}

// Initial State
const initialState: OrderState = {
  orders: [],
  orderHistory: [],
  isLoading: false,
  error: null,
};

// Reducer
const orderReducer = (state: OrderState, action: OrderAction): OrderState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_ORDER_HISTORY':
      return {
        ...state,
        orderHistory: action.payload,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id ? action.payload : order
        ),
        orderHistory: state.orderHistory.map(order =>
          order.id === action.payload.id ? action.payload : order
        ),
      };
    case 'REMOVE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
      };
    case 'ADD_NEW_ORDER':
      // Add new order if it doesn't already exist and is pending/available
      const orderExists = state.orders.some(order => order.id === action.payload.id);
      const isAvailableOrder = action.payload.status === 'pending' || action.payload.status === 'assigned';

      if (orderExists || !isAvailableOrder) {
        console.log(`⚠️ Skipping duplicate or non-available order: ${action.payload.id}, status: ${action.payload.status}`);
        return state;
      }

      console.log(`✅ Adding new available order: ${action.payload.id}`);
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };
    case 'CLEAR_DATA':
      return {
        ...state,
        orders: [],
        orderHistory: [],
        error: null,
      };
    default:
      return state;
  }
};

// Context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider Component
interface OrderProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
  websocketUrl?: string;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children, apiBaseUrl, websocketUrl }) => {
  console.log('🏗️ OrderProvider: Creating OrderProvider instance with config:', { apiBaseUrl, websocketUrl });
  
  // Initialize all hooks first - these must always be called in the same order
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const [authReady, setAuthReady] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [notificationCallback, setNotificationCallback] = useState<((order: Order) => void) | null>(null);
  const [acceptedCallback, setAcceptedCallback] = useState<((orderId: string) => void) | null>(null);

  // Use refs for values that shouldn't trigger re-renders
  const isLoadingRef = useRef(false);
  const ordersRef = useRef<Order[]>([]);
  const realtimeInitializedRef = useRef(false);

  // Get auth context - this hook must always be called
  const authContext = useAuth();
  const isLoggedIn = authContext?.isLoggedIn || false;
  
  console.log('🔄 OrderProvider: Auth state check - isLoggedIn:', isLoggedIn, 'authContext exists:', !!authContext);

  // Mark auth as ready if we got a valid context
  useEffect(() => {
    if (authContext && !authReady) {
      setAuthReady(true);
    }
  }, [authContext, authReady]);

  // Load cached data on mount only if authenticated and auth is ready
  useEffect(() => {
    if (!authReady) {
      console.log('⏳ Waiting for auth context to be ready...');
      return;
    }

    if (isLoggedIn) {
      console.log('🔑 User is logged in, loading cached orders');
      loadCachedData();

      // Delay API refresh to ensure authentication is fully complete
      const timer = setTimeout(() => {
        console.log('🔄 Starting initial order refresh (will also initialize realtime)');
        refreshOrders(true).catch(error => {
          console.error('⚠️ Initial order refresh failed:', error);
          // Don't throw - just log the error
        });
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    } else {
      console.log('🚪 User not logged in, clearing order data');
      dispatch({ type: 'CLEAR_DATA' });
      realtimeInitializedRef.current = false; // Reset realtime flag
    }
  }, [isLoggedIn, authReady]); // Remove refreshOrders from dependencies

  // Auto-refresh orders with delay after login
  useEffect(() => {
    if (!isLoggedIn) return;

    // Wait 5 seconds after login before starting auto-refresh
    const startTimer = setTimeout(() => {
      console.log('🔄 Starting auto-refresh timer');

      const interval = setInterval(() => {
        console.log('⏰ Auto-refreshing orders...');
        refreshOrders(false).catch(error => {
          console.error('⚠️ Auto-refresh failed:', error);
        });
      }, APP_SETTINGS.ORDER_REFRESH_INTERVAL);

      // Store interval ID for cleanup
      return () => {
        console.log('🛑 Stopping auto-refresh timer');
        clearInterval(interval);
      };
    }, 5000);

    return () => {
      clearTimeout(startTimer);
    };
  }, [isLoggedIn]); // Remove refreshOrders from dependencies

  // Initialize realtime service ONLY after successful authentication
  const initializeRealtimeService = async (): Promise<void> => {
    try {
      console.log('🚀 Initializing realtime service after authentication...');
      console.log('🔍 OrderContext: User logged in status:', isLoggedIn);

      // Verify user is still logged in
      if (!isLoggedIn) {
        console.log('⚠️ User no longer logged in, aborting realtime setup');
        return;
      }

      // Double-check we have a valid token before proceeding
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        console.log('❌ No auth token available in OrderContext, cannot initialize realtime');
        return;
      }

      console.log('✅ OrderContext: Valid token found, proceeding with realtime initialization');

      // Initialize the service (AuthContext already enabled initialization)
      await realtimeService.initialize();

      // Set up callbacks for new orders
      realtimeService.setCallbacks({
        onNewOrder: (order: Order) => {
          console.log('🆕 New order received via realtime:', order.id);

          // Ensure order data is valid before dispatching
          if (!order || !order.id) {
            console.error('❌ Invalid order data received:', order);
            return;
          }

          // Log order details for debugging
          console.log('📦 Order details:', {
            id: order.id,
            orderNumber: order.orderNumber,
            customer: order.customer ? {
              id: order.customer.id,
              name: order.customer.name || 'Unknown Customer',
              phone: order.customer.phone || 'No phone'
            } : 'No customer data',
            address: order.deliveryAddress ? 
              (typeof order.deliveryAddress === 'string' ? 
                order.deliveryAddress : 
                order.deliveryAddress.street || 'No street address') : 
              'No address data',
            total: order.total || 0,
            status: order.status,
            rawCustomerData: order.customer  // Add raw data for debugging
          });

          // Add the order to the state
          dispatch({ type: 'ADD_NEW_ORDER', payload: order });

          // Play notification sound
          console.log('🔔 Playing notification sound for new order');
          soundService.playOrderNotification();
          
          // Trigger notification callback if set
          if (notificationCallback) {
            console.log('📱 Triggering notification callback for new order');
            notificationCallback(order);
          }
        },
        onOrderUpdate: (order: Order) => {
          console.log('📝 Order update received via realtime:', order.id);
          dispatch({ type: 'UPDATE_ORDER', payload: order });
        },
        onConnectionChange: (connected: boolean) => {
          console.log('🔗 Realtime connection status:', connected ? 'Connected' : 'Disconnected');
        },
        onError: (error: string) => {
          console.log('❌ Realtime service error:', error);
          // If authentication fails, it means token is invalid or expired
          if (error.includes('authentication') || error.includes('token') || 
              error.includes('expired') || error.includes('invalid')) {
            console.log('🔑 Authentication error detected in realtime service');
            console.log('🔄 The API service will automatically handle token refresh');
            // Don't trigger logout here - let the API service handle token refresh
            // The realtime service will be reinitialized after successful token refresh
          } else if (error.includes('Network Error') || error.includes('Failed to fetch')) {
            console.log('🌐 Network error in realtime service - will retry automatically');
          } else {
            console.log('⚠️ Realtime service error (non-critical):', error);
          }
        }
      });

      // Enable and start the service (default to polling mode)
      console.log('🔧 Configuring realtime service...');
      await realtimeService.setConfig({ 
        enabled: true, 
        mode: 'polling',
        pollingInterval: 10000 // 10 seconds
      });

      console.log('▶️ Starting realtime service...');
      realtimeService.start();

      // Verify service is running
      const isRunning = realtimeService.isRunning();
      const isConnected = realtimeService.isConnectedToServer();
      console.log(`🔍 Realtime service status: running=${isRunning}, connected=${isConnected}`);

      console.log('✅ Realtime service initialized and started successfully');
    } catch (error) {
      console.error('💥 Failed to setup realtime service:', error);
      // Don't throw - just log the error and continue
    }
  };

  // Stop realtime service when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('🛑 Stopping realtime service - user not logged in');
      realtimeService.disableInitialization();
      realtimeService.stop();
    }
  }, [isLoggedIn]);

  const loadCachedData = async () => {
    try {
      const [cachedOrders, cachedHistory] = await Promise.all([
        Storage.getItem<Order[]>(STORAGE_KEYS.ACTIVE_ORDERS),
        Storage.getItem<Order[]>(STORAGE_KEYS.ORDER_HISTORY),
      ]);

      if (cachedOrders) {
        dispatch({ type: 'SET_ORDERS', payload: cachedOrders });
      }

      if (cachedHistory) {
        dispatch({ type: 'SET_ORDER_HISTORY', payload: cachedHistory });
      }
    } catch (error) {
      console.error('Error loading cached order data:', error);
    }
  };

  // Update refs when state changes
  useEffect(() => {
    isLoadingRef.current = state.isLoading;
    ordersRef.current = state.orders;
  }, [state.isLoading, state.orders]);

  const refreshOrders = useCallback(async (isInitialLoad: boolean = false): Promise<void> => {
    if (isLoadingRef.current) {
      console.log('⏳ Orders already loading, skipping refresh');
      return;
    }

    if (!isLoggedIn) {
      console.log('🚫 Cannot refresh orders: user not logged in');
      return;
    }

    console.log('🔄 Refreshing orders from API...');
    isLoadingRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await apiService.getActiveOrders();

      if (response.success && response.data) {
        console.log('✅ Orders fetched successfully:', response.data.length, 'orders');

        // Filter to only show available orders (pending/assigned) for driver to accept
        const availableOrders = response.data.filter(order => 
          order.status === 'pending' || order.status === 'assigned'
        );

        console.log(`📋 Filtered to ${availableOrders.length} available orders from ${response.data.length} total`);
        dispatch({ type: 'SET_ORDERS', payload: availableOrders });

        // Cache the filtered data
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, availableOrders);

        // Clear any previous errors
        dispatch({ type: 'SET_ERROR', payload: null });

        // Initialize realtime service ONLY after successful API call and only once
        if (isInitialLoad && !realtimeInitializedRef.current) {
          console.log('🚀 First successful API call - now initializing realtime service');
          realtimeInitializedRef.current = true;
          // Delay realtime initialization to ensure API is fully working
          setTimeout(() => {
            initializeRealtimeService();
          }, 1000);
        }
      } else {
        console.error('❌ Failed to fetch orders:', response.error);
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to fetch orders' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orders';
      console.error('💥 Order refresh error:', message);

      // Only show error if not a network/auth related error during startup
      if (!message.includes('Network') && !message.includes('401') && !message.includes('403')) {
        dispatch({ type: 'SET_ERROR', payload: message });
      } else {
        console.log('🔕 Suppressing network/auth error during startup:', message);
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    } finally {
      isLoadingRef.current = false;
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isLoggedIn]); // Only depend on isLoggedIn, which is stable

  const acceptOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const response = await apiService.acceptOrder(orderId);

      if (response.success) {
        // Remove accepted order from active orders list (driver moves to order details)
        const updatedOrders = ordersRef.current.filter(order => order.id !== orderId);

        dispatch({ type: 'SET_ORDERS', payload: updatedOrders });

        // Update cache
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);

        // Mark order as handled to stop notifications
        realtimeService.markOrderAsHandled(orderId);
        console.log(`✅ Order ${orderId} accepted and removed from active list - notifications stopped`);
        
        // Trigger accepted callback if set (for ongoing deliveries refresh)
        if (acceptedCallback) {
          console.log('📋 Triggering accepted callback for ongoing deliveries refresh');
          acceptedCallback(orderId);
        }

        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to accept order' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept order';
      dispatch({ type: 'SET_ERROR', payload: message });
      return false;
    }
  }, [acceptedCallback]); // Remove state.orders dependency

  const declineOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      console.log(`🙅 Attempting to decline order: ${orderId}`);
      const response = await apiService.declineOrder(orderId);

      if (response.success) {
        // Remove order from active orders
        dispatch({ type: 'REMOVE_ORDER', payload: orderId });

        // Update cache
        const updatedOrders = ordersRef.current.filter(order => order.id !== orderId);
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);

        // Mark order as handled to stop notifications
        realtimeService.markOrderAsHandled(orderId);
        console.log(`✅ Order ${orderId} declined successfully - removed from list`);
      } else {
        console.error(`❌ Decline failed for order ${orderId}:`, response.error);
        
        // If backend has permission issues, still remove from local state
        // This is a workaround for the backend decline permission bug
        if (response.error?.toLowerCase().includes('you can only decline')) {
          console.warn('⚠️ Backend decline permission issue detected - removing order locally');
          
          // Remove order from local state anyway
          dispatch({ type: 'REMOVE_ORDER', payload: orderId });
          const updatedOrders = ordersRef.current.filter(order => order.id !== orderId);
          await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);
          realtimeService.markOrderAsHandled(orderId);
          
          console.log(`📱 Order ${orderId} removed from app (backend needs fixing)`);
          return; // Don't throw error, just warn user
        }
        
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decline order';
      console.error(`🚨 Decline order error:`, message);
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []); // Remove state.orders dependency completely

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<boolean> => {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);

      if (response.success) {
        console.log(`✅ Order ${orderId} status updated to: ${status}`);

        // If delivered, remove from active orders as it's completed
        if (status === 'delivered') {
          const updatedOrders = state.orders.filter(order => order.id !== orderId);
          dispatch({ type: 'SET_ORDERS', payload: updatedOrders });
          await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);

          // Refresh order history to include the completed order
          getOrderHistory();
        }

        return true;
      } else {
        throw new Error(response.error || 'Failed to update order status');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      console.error('❌ Error updating order status:', message);
      dispatch({ type: 'SET_ERROR', payload: message });
      return false;
    }
  }, [state.orders, getOrderHistory]); // Include dependencies

  const getOrderDetails = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const response = await apiService.getOrderDetails(orderId);

      if (response.success && response.data) {
        return response.data;
      } else {
        console.error('❌ Failed to get order details:', response.error);
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get order details';
      console.error('❌ Error getting order details:', message);
      return null;
    }
  }, []); // No dependencies needed

  const getOrderHistory = useCallback(async (filter?: HistoryFilter): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await apiService.getOrderHistory(filter);

      if (response.success && response.data) {
        dispatch({ type: 'SET_ORDER_HISTORY', payload: response.data });

        // Cache the data
        await Storage.setItem(STORAGE_KEYS.ORDER_HISTORY, response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch order history');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch order history';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // Empty dependency array since this function doesn't depend on any state

  const getDriverOrders = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await apiService.getDriverOrders();

      if (response.success && response.data) {
        dispatch({ type: 'SET_ORDERS', payload: response.data });

        // Cache the data
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch driver orders');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch driver orders';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // Empty dependency array since this function doesn't depend on any state

  const setOrderNotificationCallback = useCallback((callback: ((order: Order) => void) | null) => {
    setNotificationCallback(() => callback);
  }, []);
  
  const setOrderAcceptedCallback = useCallback((callback: ((orderId: string) => void) | null) => {
    setAcceptedCallback(() => callback);
  }, []);

  // Function to check if driver can accept an order (capacity management)
  const canAcceptOrder = (order: Order): boolean => {
    if (!order) return false;
    
    // Get current accepted orders count by type
    const currentAcceptedOrders = state.orders.filter(o => 
      o.status === 'assigned' || o.status === 'accepted'
    );
    
    const foodOrders = currentAcceptedOrders.filter(o => 
      o.deliveryType === 'food' || o.deliveryType === 'fast'
    );
    const regularOrders = currentAcceptedOrders.filter(o => 
      o.deliveryType === 'regular' || !o.deliveryType
    );
    
    // Check capacity limits
    if (order.deliveryType === 'food' || order.deliveryType === 'fast') {
      return foodOrders.length < 1; // Max 1 food/fast order
    } else {
      return regularOrders.length < 5; // Max 5 regular orders
    }
  };

  const contextValue: OrderContextType = {
    orders: state.orders,
    orderHistory: state.orderHistory,
    isLoading: state.isLoading,
    error: state.error,
    refreshOrders,
    acceptOrder,
    declineOrder,
    updateOrderStatus,
    getOrderHistory,
    getOrderDetails,
    getDriverOrders,
    setOrderNotificationCallback,
    setOrderAcceptedCallback,
    canAcceptOrder,
  };

  console.log('🎯 OrderProvider: Rendering with context value ready');

  // If there's a context error, render a fallback
  if (contextError) {
    console.error('❌ OrderProvider: Rendering error state due to context error:', contextError);
    return (
      <OrderContext.Provider value={contextValue}>
        {children}
      </OrderContext.Provider>
    );
  }

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

// Hook with better error handling
export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    console.error('❌ useOrders called outside OrderProvider context');
    console.error('📍 Stack trace:', new Error().stack);
    console.error('🔍 Make sure the component using useOrders is wrapped with <OrderProvider>');
    console.error('🏗️ Provider hierarchy should be: AuthProvider > TenantProvider > DriverProvider > OrderProvider');
    throw new Error('useOrders must be used within an OrderProvider. Check that your component is properly wrapped with context providers.');
  }
  return context;
};
