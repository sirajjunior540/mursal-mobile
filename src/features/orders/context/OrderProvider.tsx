/**
 * Simplified OrderProvider for testing the refactored structure
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Order, OrderContextType } from '../../../shared/types';

// Mock data for testing
const mockOrders: Order[] = [];

// Simple context value
const mockContextValue: OrderContextType = {
  orders: mockOrders,
  orderHistory: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  refreshOrders: async () => {},
  getOrderDetails: async (orderId: string) => mockOrders[0],
  acceptOrder: async (orderId: string) => {},
  declineOrder: async (orderId: string, reason?: string) => {},
  updateOrderStatus: async (orderId: string, status: any) => {},
  getOrderHistory: async (filters?: any) => {},
  clearOrders: () => {},
};

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
  const contextValue = useMemo(() => mockContextValue, []);

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