import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
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
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  console.log('🏗️ OrderProvider: Creating OrderProvider instance');
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const [authReady, setAuthReady] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // Get auth context - hooks must always be called in the same order
  const authContext = useAuth();
  const isLoggedIn = authContext?.isLoggedIn || false;

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authReady]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

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
              name: order.customer.name,
              phone: order.customer.phone
            } : 'No customer data',
            address: order.deliveryAddress ? 
              (typeof order.deliveryAddress === 'string' ? 
                order.deliveryAddress : 
                order.deliveryAddress.street) : 
              'No address data',
            total: order.total,
            status: order.status
          });

          // Add the order to the state
          dispatch({ type: 'ADD_NEW_ORDER', payload: order });

          // Play notification sound
          console.log('🔔 Playing notification sound for new order');
          soundService.playOrderNotification();
        },
        onOrderUpdate: (order: Order) => {
          console.log('📝 Order update received via realtime:', order.id);
          dispatch({ type: 'UPDATE_ORDER', payload: order });
        },
        onConnectionChange: (connected: boolean) => {
          console.log('🔗 Realtime connection status:', connected ? 'Connected' : 'Disconnected');
        },
        onError: (error: string) => {
          console.error('❌ Realtime service error:', error);
          // If authentication fails, it means token is invalid
          if (error.includes('authentication') || error.includes('token')) {
            console.log('🔑 Authentication failed - user may need to re-login');
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

  const refreshOrders = async (isInitialLoad: boolean = false): Promise<void> => {
    if (state.isLoading) {
      console.log('⏳ Orders already loading, skipping refresh');
      return;
    }

    if (!isLoggedIn) {
      console.log('🚫 Cannot refresh orders: user not logged in');
      return;
    }

    console.log('🔄 Refreshing orders from API...');
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

        // Initialize realtime service ONLY after successful API call
        if (isInitialLoad) {
          console.log('🚀 First successful API call - now initializing realtime service');
          // Delay realtime initialization to ensure API is fully working
          setTimeout(() => {
            initializeRealtimeService();
          }, 1000);
        }
      } else {
        console.error('❌ Failed to fetch orders:', response.error);
        // Don't throw error during login process
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
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const acceptOrder = async (orderId: string): Promise<boolean> => {
    try {
      const response = await apiService.acceptOrder(orderId);

      if (response.success) {
        // Remove accepted order from active orders list (driver moves to order details)
        const updatedOrders = state.orders.filter(order => order.id !== orderId);

        dispatch({ type: 'SET_ORDERS', payload: updatedOrders });

        // Update cache
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);

        // Mark order as handled to stop notifications
        realtimeService.markOrderAsHandled(orderId);
        console.log(`✅ Order ${orderId} accepted and removed from active list - notifications stopped`);

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
  };

  const declineOrder = async (orderId: string): Promise<void> => {
    try {
      const response = await apiService.declineOrder(orderId);

      if (response.success) {
        // Remove order from active orders
        dispatch({ type: 'REMOVE_ORDER', payload: orderId });

        // Update cache
        const updatedOrders = state.orders.filter(order => order.id !== orderId);
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);

        // Mark order as handled to stop notifications
        realtimeService.markOrderAsHandled(orderId);
        console.log(`❌ Order ${orderId} declined - notifications stopped`);
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decline order';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<boolean> => {
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
  };

  const getOrderDetails = async (orderId: string): Promise<Order | null> => {
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
  };

  const getOrderHistory = async (filter?: HistoryFilter): Promise<void> => {
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
