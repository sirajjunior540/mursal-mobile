/**
 * Hook for managing unified orders (regular orders and batch legs)
 */

import { useState, useEffect, useCallback } from 'react';
import { unifiedOrderService, UnifiedOrder } from '../services/unifiedOrderService';
import { orderActionService } from '../services/orderActionService';
import { locationService } from '../services/locationService';
import { apiDebug } from '../config/environment';

interface UseUnifiedOrdersResult {
  availableOrders: UnifiedOrder[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  acceptOrder: (order: UnifiedOrder) => Promise<boolean>;
  declineOrder: (order: UnifiedOrder, reason?: string) => Promise<boolean>;
}

export function useUnifiedOrders(): UseUnifiedOrdersResult {
  const [availableOrders, setAvailableOrders] = useState<UnifiedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available orders
  const refreshOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Update location before fetching orders
      try {
        const location = await locationService.getCurrentLocation();
        await locationService.updateDriverLocation(location.latitude, location.longitude);
      } catch (locationError) {
        apiDebug('⚠️ Could not update location before fetching orders:', locationError);
      }

      const response = await unifiedOrderService.getAvailableOrders();
      
      if (response.success && response.data) {
        setAvailableOrders(response.data);
        apiDebug(`✅ Loaded ${response.data.length} unified orders`);
      } else {
        throw new Error(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      apiDebug('❌ Error fetching unified orders:', errorMessage);
      setError(errorMessage);
      setAvailableOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Accept an order
  const acceptOrder = useCallback(async (order: UnifiedOrder): Promise<boolean> => {
    try {
      const location = await locationService.getCurrentLocation();
      
      const result = await orderActionService.acceptUnifiedOrder(order, {
        latitude: location.latitude,
        longitude: location.longitude,
        location: 'Driver location'
      }, {
        showConfirmation: true,
        onSuccess: () => {
          // Remove from available orders
          setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
        }
      });

      if (result.success) {
        // Refresh orders to get updated list
        await refreshOrders();
      }

      return result.success;
    } catch (err) {
      apiDebug('❌ Error accepting order:', err);
      return false;
    }
  }, [refreshOrders]);

  // Decline an order
  const declineOrder = useCallback(async (order: UnifiedOrder, reason?: string): Promise<boolean> => {
    try {
      const response = await unifiedOrderService.declineOrder(order, reason);
      
      if (response.success) {
        // Remove from available orders
        setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
        
        // Refresh orders
        await refreshOrders();
      }

      return response.success;
    } catch (err) {
      apiDebug('❌ Error declining order:', err);
      return false;
    }
  }, [refreshOrders]);

  // Initial load
  useEffect(() => {
    refreshOrders();
  }, []);

  return {
    availableOrders,
    isLoading,
    error,
    refreshOrders,
    acceptOrder,
    declineOrder
  };
}