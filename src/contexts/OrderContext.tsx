import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { OrderContextType, Order, OrderStatus, HistoryFilter } from '../types';
import { STORAGE_KEYS, APP_SETTINGS } from '../constants';
import { Storage } from '../utils';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

// Action Types
type OrderAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_ORDER_HISTORY'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'REMOVE_ORDER'; payload: string }
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
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const { isLoggedIn } = useAuth();

  // Load cached data on mount
  useEffect(() => {
    if (isLoggedIn) {
      loadCachedData();
    } else {
      dispatch({ type: 'CLEAR_DATA' });
    }
  }, [isLoggedIn]);

  // Auto-refresh orders
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      refreshOrders();
    }, APP_SETTINGS.ORDER_REFRESH_INTERVAL);

    return () => clearInterval(interval);
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

  const refreshOrders = async (): Promise<void> => {
    if (state.isLoading) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await apiService.getActiveOrders();

      if (response.success && response.data) {
        dispatch({ type: 'SET_ORDERS', payload: response.data });
        
        // Cache the data
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch orders');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orders';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const acceptOrder = async (orderId: string): Promise<void> => {
    try {
      const response = await apiService.acceptOrder(orderId);

      if (response.success) {
        // Update order status locally
        const updatedOrders = state.orders.map(order =>
          order.id === orderId 
            ? { ...order, status: 'accepted' as OrderStatus, acceptedTime: new Date() }
            : order
        );
        
        dispatch({ type: 'SET_ORDERS', payload: updatedOrders });
        
        // Update cache
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);
      } else {
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept order';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
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
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decline order';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);

      if (response.success) {
        // Update order status locally
        const now = new Date();
        const updatedOrders = state.orders.map(order => {
          if (order.id === orderId) {
            const updatedOrder = { ...order, status };
            
            // Set appropriate timestamp based on status
            switch (status) {
              case 'picked_up':
                updatedOrder.pickedUpTime = now;
                break;
              case 'delivered':
                updatedOrder.deliveredTime = now;
                break;
            }
            
            return updatedOrder;
          }
          return order;
        });
        
        dispatch({ type: 'SET_ORDERS', payload: updatedOrders });
        
        // Update cache
        await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);
        
        // If delivered, move to history
        if (status === 'delivered') {
          getOrderHistory();
        }
      } else {
        throw new Error(response.error || 'Failed to update order status');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
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
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

// Hook
export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};