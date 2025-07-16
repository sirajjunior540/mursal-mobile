/**
 * Unified Order Service
 * 
 * This service provides a unified interface for handling both regular orders and batch legs.
 * It automatically detects the order type and routes to the appropriate API endpoint.
 */

import { apiService } from './api';
import { ApiResponse, Order } from '../types';
import { BatchLeg, BatchLegListResponse } from '../types/batchLeg';
import { ApiTransformers } from './apiTransformers';

export interface UnifiedOrder {
  id: string;
  type: 'regular' | 'batch_leg';
  displayName: string;
  status: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  customerName?: string;
  customerPhone?: string;
  estimatedEarnings?: number;
  distance?: number;
  originalData: Order | BatchLeg;
}

class UnifiedOrderService {
  /**
   * Get all available orders (both regular and batch legs) in a unified format
   */
  async getAvailableOrders(): Promise<ApiResponse<UnifiedOrder[]>> {
    try {
      
      // Check if the backend has a unified feed endpoint
      // If the available_orders endpoint returns both types, we need to detect them
      const regularOrdersResponse = await apiService.getAvailableOrders();
      const unifiedOrders: UnifiedOrder[] = [];

      // Process orders from available_orders endpoint
      if (regularOrdersResponse.success && regularOrdersResponse.data) {
        for (const item of regularOrdersResponse.data) {
          // Check if this is actually a batch leg based on its structure
          if (this.isOrderBatchLeg(item)) {
            const unifiedOrder = this.convertBackendToUnified(item);
            if (unifiedOrder) {
              unifiedOrders.push(unifiedOrder);
            }
          } else {
            // Regular order
            const unifiedOrder = this.transformToUnifiedOrder(item, 'regular');
            unifiedOrders.push(unifiedOrder);
          }
        }
      }

      // Also fetch batch legs from dedicated endpoint if available
      try {
        const batchLegsResponse = await apiService.getAvailableBatchLegs();
        if (batchLegsResponse.success && batchLegsResponse.data) {
          const batchLegs = batchLegsResponse.data.legs.map(leg => this.transformToUnifiedOrder(leg, 'batch_leg'));
          
          // Avoid duplicates by checking IDs
          const existingIds = new Set(unifiedOrders.map(o => o.id));
          const uniqueBatchLegs = batchLegs.filter(leg => !existingIds.has(leg.id));
          unifiedOrders.push(...uniqueBatchLegs);
        }
      } catch (error) {
        // Batch legs endpoint might not exist, continue with regular orders
      }

      // Sort by distance if available
      unifiedOrders.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      return {
        success: true,
        data: unifiedOrders,
        message: 'Unified orders fetched successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: 'Failed to fetch available orders'
      };
    }
  }

  /**
   * Transform regular order or batch leg to unified format
   */
  private transformToUnifiedOrder(data: Order | BatchLeg, type: 'regular' | 'batch_leg'): UnifiedOrder {
    if (type === 'regular') {
      const order = data as Order;
      return {
        id: order.id,
        type: 'regular',
        displayName: order.order_number || `Order #${order.id}`,
        status: order.status || 'pending',
        pickupAddress: order.pickup_address,
        deliveryAddress: order.delivery_address,
        pickupLatitude: order.pickup_latitude,
        pickupLongitude: order.pickup_longitude,
        deliveryLatitude: order.delivery_latitude,
        deliveryLongitude: order.delivery_longitude,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phone,
        estimatedEarnings: order.delivery_fee,
        distance: order.distance,
        originalData: order
      };
    } else {
      const leg = data as BatchLeg;
      return {
        id: leg.id,
        type: 'batch_leg',
        displayName: `${leg.batch.name} - ${leg.leg_number}`,
        status: leg.status,
        pickupAddress: leg.origin_location.address,
        deliveryAddress: leg.destinations[0]?.address, // First destination for display
        pickupLatitude: leg.origin_location.latitude,
        pickupLongitude: leg.origin_location.longitude,
        deliveryLatitude: leg.destinations[0]?.latitude,
        deliveryLongitude: leg.destinations[0]?.longitude,
        customerName: leg.batch.customer.name,
        customerPhone: leg.origin_location.contact?.phone,
        estimatedEarnings: leg.estimated_earnings,
        distance: leg.distance_km,
        originalData: leg
      };
    }
  }

  /**
   * Accept a unified order (automatically routes to correct endpoint)
   */
  async acceptOrder(unifiedOrder: UnifiedOrder): Promise<ApiResponse<void>> {
    try {
      if (unifiedOrder.type === 'regular') {
        // Regular order - use deliveries endpoint
        return await apiService.acceptOrder(unifiedOrder.id);
      } else {
        // Batch leg - use batch-legs endpoint
        const response = await apiService.acceptBatchLeg(unifiedOrder.id);
        return {
          success: response.success,
          data: undefined,
          message: response.message,
          error: response.error
        };
      }
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to accept order'
      };
    }
  }

  /**
   * Decline a unified order
   */
  async declineOrder(unifiedOrder: UnifiedOrder, reason?: string): Promise<ApiResponse<void>> {
    try {
      if (unifiedOrder.type === 'regular') {
        // Regular order
        return await apiService.declineOrder(unifiedOrder.id);
      } else {
        // Batch leg - for now, use same decline endpoint
        // TODO: Add specific batch leg decline endpoint when available
        return await apiService.declineOrder(unifiedOrder.id);
      }
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to decline order'
      };
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(unifiedOrder: UnifiedOrder): Promise<ApiResponse<UnifiedOrder>> {
    try {
      if (unifiedOrder.type === 'regular') {
        const response = await apiService.getOrderDetails(unifiedOrder.id);
        if (response.success && response.data) {
          return {
            success: true,
            data: this.transformToUnifiedOrder(response.data, 'regular'),
            message: response.message
          };
        }
        return response as ApiResponse<UnifiedOrder>;
      } else {
        const response = await apiService.getBatchLegDetails(unifiedOrder.id);
        if (response.success && response.data) {
          return {
            success: true,
            data: this.transformToUnifiedOrder(response.data, 'batch_leg'),
            message: response.message
          };
        }
        return response as ApiResponse<UnifiedOrder>;
      }
    } catch (error) {
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Failed to get order details'
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(unifiedOrder: UnifiedOrder, status: string): Promise<ApiResponse<void>> {
    try {
      if (unifiedOrder.type === 'regular') {
        return await apiService.updateOrderStatus(unifiedOrder.id, status as any);
      } else {
        // Batch leg status update
        if (status === 'completed') {
          return await apiService.completeBatchLeg(unifiedOrder.id);
        }
        // For other statuses, use regular update endpoint for now
        return await apiService.updateOrderStatus(unifiedOrder.id, status as any);
      }
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to update order status'
      };
    }
  }

  /**
   * Check if an order is a batch leg based on its data structure
   */
  isOrderBatchLeg(orderData: any): boolean {
    // Check for batch leg specific fields
    return !!(
      orderData.leg_number || 
      orderData.leg_type || 
      orderData.stops_count ||
      orderData.origin_type ||
      orderData.destinations
    );
  }

  /**
   * Convert backend order data to unified format
   */
  convertBackendToUnified(backendData: any): UnifiedOrder | null {
    try {
      if (this.isOrderBatchLeg(backendData)) {
        // Transform as batch leg
        const batchLeg = ApiTransformers.transformBatchLeg(backendData);
        return this.transformToUnifiedOrder(batchLeg, 'batch_leg');
      } else {
        // Transform as regular order
        const order = ApiTransformers.transformOrder(backendData);
        return this.transformToUnifiedOrder(order, 'regular');
      }
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const unifiedOrderService = new UnifiedOrderService();
export default unifiedOrderService;