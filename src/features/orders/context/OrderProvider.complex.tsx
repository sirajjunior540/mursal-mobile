/**
 * Refactored OrderProvider with proper separation of concerns
 */
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { Order, OrderStatus, OrderContextType, OrderActionType, OrderState } from '../../../shared/types';
import { logger } from '../../../infrastructure/logging/logger';
import { useOrderAPI } from '../hooks/useOrderAPI';
import { useOrderSync } from '../hooks/useOrderSync';
import { useAuth } from '../../auth/context/AuthContext';

// Initial state
const initialState: OrderState = {
  orders: [],
  orderHistory: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Reducer
const orderReducer = (state: OrderState, action: OrderActionType): OrderState => {
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
        lastUpdated: new Date().toISOString(),
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
        lastUpdated: new Date().toISOString(),
      };

    case 'REMOVE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
      };

    case 'ADD_NEW_ORDER':
      // Prevent duplicates and only add valid orders
      const orderExists = state.orders.some(order => order.id === action.payload.id);
      const isValidOrder = [OrderStatus.PENDING, OrderStatus.ASSIGNED].includes(action.payload.status);

      if (orderExists || !isValidOrder) {
        logger.debug(`Skipping order ${action.payload.id}`, { 
          exists: orderExists, 
          valid: isValidOrder,
          status: action.payload.status 
        });
        return state;
      }

      logger.orderReceived(action.payload.id, action.payload.status);
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        lastUpdated: new Date().toISOString(),
      };

    case 'CLEAR_DATA':
      return {
        ...state,
        orders: [],
        orderHistory: [],
        error: null,
      };

    case 'SET_LAST_UPDATED':
      return {
        ...state,
        lastUpdated: action.payload,
      };

    default:
      return state;
  }
};

// Context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Provider component
interface OrderProviderProps {
  children: React.ReactNode;
  websocketUrl: string;
  apiBaseUrl: string;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({
  children,
  websocketUrl,
  apiBaseUrl,
}) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const { getToken } = useAuth();

  // Initialize API hook
  const orderAPI = useOrderAPI({
    baseURL: apiBaseUrl,
    getAuthToken: getToken,
    onError: (error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    },
  });

  // WebSocket event handlers
  const handleOrderReceived = useCallback((order: Order) => {
    dispatch({ type: 'ADD_NEW_ORDER', payload: order });
  }, []);

  const handleOrderUpdated = useCallback((order: Order) => {
    dispatch({ type: 'UPDATE_ORDER', payload: order });
  }, []);

  const handleOrderRemoved = useCallback((orderId: string) => {
    dispatch({ type: 'REMOVE_ORDER', payload: orderId });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    logger.info(`Order sync connection ${connected ? 'established' : 'lost'}`);
  }, []);

  // Initialize sync hook
  const orderSync = useOrderSync({
    websocketUrl,
    pollInterval: 30000, // 30 seconds
    maxReconnectAttempts: 5,
    getAuthToken: getToken,
    onOrderReceived: handleOrderReceived,
    onOrderUpdated: handleOrderUpdated,
    onOrderRemoved: handleOrderRemoved,
    onConnectionChange: handleConnectionChange,
    enabled: true,
  });

  // Action creators
  const refreshOrders = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const orders = await orderAPI.getOrders();
      dispatch({ type: 'SET_ORDERS', payload: orders });
    } catch (error) {
      logger.error('Failed to refresh orders', error as Error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, [orderAPI]);

  const getOrderDetails = useCallback(async (orderId: string): Promise<Order> => {
    try {
      return await orderAPI.getOrderDetails(orderId);
    } catch (error) {
      logger.error(`Failed to get order details for ${orderId}`, error as Error);
      throw error;
    }
  }, [orderAPI]);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      const updatedOrder = await orderAPI.acceptOrder(orderId);
      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
    } catch (error) {
      logger.error(`Failed to accept order ${orderId}`, error as Error);
      throw error;
    }
  }, [orderAPI]);

  const declineOrder = useCallback(async (orderId: string, reason?: string) => {
    try {
      await orderAPI.declineOrder(orderId, reason);
      dispatch({ type: 'REMOVE_ORDER', payload: orderId });
    } catch (error) {
      logger.error(`Failed to decline order ${orderId}`, error as Error);
      throw error;
    }
  }, [orderAPI]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const updatedOrder = await orderAPI.updateOrderStatus(orderId, status);
      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
    } catch (error) {
      logger.error(`Failed to update order ${orderId} status to ${status}`, error as Error);
      throw error;
    }
  }, [orderAPI]);

  const getOrderHistory = useCallback(async (filters?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const history = await orderAPI.getOrderHistory(filters);
      dispatch({ type: 'SET_ORDER_HISTORY', payload: history });
    } catch (error) {
      logger.error('Failed to get order history', error as Error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, [orderAPI]);

  const clearOrders = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  // Memoized context value
  const contextValue = useMemo<OrderContextType>(() => ({
    ...state,
    refreshOrders,
    getOrderDetails,
    acceptOrder,
    declineOrder,
    updateOrderStatus,
    getOrderHistory,
    clearOrders,
  }), [
    state,
    refreshOrders,
    getOrderDetails,
    acceptOrder,
    declineOrder,
    updateOrderStatus,
    getOrderHistory,
    clearOrders,
  ]);

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