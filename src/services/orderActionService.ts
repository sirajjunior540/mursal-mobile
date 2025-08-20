/**
 * Order Action Service
 * Handles order actions with unified order detection
 */

import { apiService } from './api';
import { unifiedOrderService } from './unifiedOrderService';
import { ApiResponse } from '../types';

class OrderActionService {
  /**
   * Accept any order - automatically detects if it's a regular order or batch leg
   */
  async acceptUnifiedOrder(orderData: any, orderId: string): Promise<ApiResponse<void>> {
    try {
      // Convert to unified order to detect type
      const unifiedOrder = unifiedOrderService.convertBackendToUnified(orderData);
      
      if (!unifiedOrder) {
        // Fallback to regular order acceptance if conversion fails
        return await apiService.acceptOrder(orderId);
      }
      
      // Use unified service which routes to correct endpoint
      return await unifiedOrderService.acceptOrder(unifiedOrder);
      
    } catch (error) {
      // If unified approach fails, try regular order acceptance as fallback
      try {
        return await apiService.acceptOrder(orderId);
      } catch (fallbackError) {
        return {
          success: false,
          data: undefined,
          error: error instanceof Error ? error.message : 'Failed to accept order'
        };
      }
    }
  }
  
  /**
   * Decline any order
   */
  async declineUnifiedOrder(orderData: any, orderId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      // Convert to unified order to detect type
      const unifiedOrder = unifiedOrderService.convertBackendToUnified(orderData);
      
      if (!unifiedOrder) {
        // Fallback to regular order decline
        return await apiService.declineOrder(orderId);
      }
      
      return await unifiedOrderService.declineOrder(unifiedOrder, reason);
      
    } catch (error) {
      // Fallback to regular decline
      return await apiService.declineOrder(orderId);
    }
  }
  
  /**
   * Skip any order
   */
  async skipUnifiedOrder(orderData: any, orderId: string): Promise<ApiResponse<void>> {
    try {
      // Convert to unified order to detect type
      const unifiedOrder = unifiedOrderService.convertBackendToUnified(orderData);
      
      if (!unifiedOrder) {
        // For regular orders, skip is same as decline
        return await apiService.declineOrder(orderId);
      }
      
      // For batch legs, use the skip endpoint if available, otherwise decline
      if (unifiedOrder.isBatchLeg) {
        try {
          // Try skip endpoint first
          const response = await apiService.getClient().post<void>(
            `/api/v1/delivery/batch-legs/${orderId}/skip/`
          );
          return response;
        } catch (error) {
          // If skip endpoint doesn't exist, fall back to decline
          return await unifiedOrderService.declineOrder(unifiedOrder);
        }
      }
      
      // For regular orders, skip is same as decline
      return await unifiedOrderService.declineOrder(unifiedOrder);
      
    } catch (error) {
      // Fallback to regular decline
      return await apiService.declineOrder(orderId);
    }
  }
  
  /**
   * Get the correct accept endpoint for an order
   */
  getAcceptEndpoint(orderData: any, orderId: string): string {
    if (unifiedOrderService.isOrderBatchLeg(orderData)) {
      return `/api/v1/delivery/batch-legs/${orderId}/assign_driver/`;
    }
    return `/api/v1/delivery/deliveries/${orderId}/accept/`;
  }
  
  /**
   * Skip order (mark as viewed) - for incoming order modal
   */
  async skipOrder(deliveryId: string, options?: {
    showConfirmation?: boolean;
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }): Promise<ApiResponse<void>> {
    try {
      // Skip is implemented as mark_viewed in the backend
      const response = await apiService.getClient().post<void>(
        `/api/v1/delivery/deliveries/${deliveryId}/mark_viewed/`
      );
      
      if (options?.onSuccess) {
        options.onSuccess();
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to skip order';
      if (options?.onError) {
        options.onError(errorMessage);
      }
      return {
        success: false,
        data: undefined,
        error: errorMessage
      };
    }
  }

  /**
   * Accept route (for batch orders)
   */
  async acceptRoute(routeId: string, data?: any, options?: {
    showConfirmation?: boolean;
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }): Promise<ApiResponse<void>> {
    try {
      // Check if the data contains batch information
      const isBatchOrder = data?.current_batch?.id || data?.isBatch;
      let response: ApiResponse<void>;
      
      if (isBatchOrder) {
        // For batch orders, use the batch accept endpoint with the batch ID
        const batchId = data?.current_batch?.id || routeId;
        response = await apiService.getClient().post<void>(
          `/api/v1/delivery/batches/${batchId}/accept/`
        );
      } else {
        // For regular orders, use the delivery accept endpoint
        response = await apiService.getClient().post<void>(
          `/api/v1/delivery/deliveries/${routeId}/accept/`
        );
      }
      
      if (options?.onSuccess) {
        options.onSuccess();
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept route';
      if (options?.onError) {
        options.onError(errorMessage);
      }
      return {
        success: false,
        data: undefined,
        error: errorMessage
      };
    }
  }

  /**
   * Get the next action for an order based on its status
   */
  getNextAction(status?: string): { label: string; status: string; action: string } | null {
    if (!status) return null;
    
    const statusActions: Record<string, { label: string; status: string; action: string }> = {
      'pending': { label: 'Accept Order', status: 'accepted', action: 'accept' },
      'accepted': { label: 'Start Pickup', status: 'en_route_to_pickup', action: 'start_pickup' },
      'en_route_to_pickup': { label: 'Arrived at Pickup', status: 'arrived_at_pickup', action: 'arrive_pickup' },
      'arrived_at_pickup': { label: 'Confirm Pickup', status: 'picked_up', action: 'confirm_pickup' },
      'picked_up': { label: 'Start Delivery', status: 'en_route_to_delivery', action: 'start_delivery' },
      'en_route_to_delivery': { label: 'Arrived at Delivery', status: 'arrived_at_delivery', action: 'arrive_delivery' },
      'arrived_at_delivery': { label: 'Complete Delivery', status: 'delivered', action: 'complete' },
      'delivered': null,
      'cancelled': null,
    };
    
    return statusActions[status] || null;
  }
}

export const orderActionService = new OrderActionService();
export default orderActionService;