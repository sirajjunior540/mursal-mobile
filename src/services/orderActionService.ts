/**
 * Centralized Order Action Service
 * Handles all order-related actions (accept, decline, status updates)
 * Eliminates duplicated logic across components
 */

import { Alert } from 'react-native';
import { deliveryApi } from './api';
import { soundService } from './soundService';
import { getDeliveryIdForApi, extractOrderApiIds, getOrderDisplayId } from '../types';

export interface OrderActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface StatusUpdateData {
  status: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface AcceptOrderData {
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface DeclineOrderData {
  location?: string;
  reason?: string;
}

class OrderActionService {
  /**
   * Accept an order with enhanced feedback
   */
  async acceptOrder(
    deliveryId: string, // ⚠️ This should be the delivery ID, not order ID
    data: AcceptOrderData = {},
    options: {
      showConfirmation?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = true, onSuccess, onError } = options;

    try {
      console.log(`📋 Accepting order (delivery ID: ${deliveryId})...`);
      
      // ⚠️ CRITICAL: deliveryApi.smartAcceptDelivery expects a DELIVERY ID, not order ID
      // This deliveryId parameter should come from order.id (which contains the delivery ID)
      const response = await deliveryApi.smartAcceptDelivery(deliveryId, {
        location: data.location || 'Driver location',
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes || 'Order accepted via mobile app',
      });

      if (response.success) {
        // Play success sound
        soundService.playSuccessSound();
        
        const successMessage = 'Order accepted successfully!';
        
        if (showConfirmation) {
          Alert.alert(
            'Order Accepted! 🎉',
            successMessage,
            [
              {
                text: 'Navigate to Pickup',
                onPress: () => {
                  // Navigation will be handled by the calling component
                  onSuccess?.();
                },
              },
              {
                text: 'OK',
                onPress: onSuccess,
                style: 'default',
              },
            ]
          );
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error: any) {
      console.error('❌ Error accepting order:', error);
      
      // Play error sound
      soundService.playErrorSound();
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to accept order';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Skip an order (mark as viewed) - prevents future notifications
   */
  async skipOrder(
    deliveryId: string, // ⚠️ This should be the delivery ID, not order ID
    options: {
      showConfirmation?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = false, onSuccess, onError } = options;

    try {
      console.log(`⏭️ Skipping order (delivery ID: ${deliveryId}) (marking as viewed)...`);
      
      // ⚠️ CRITICAL: markDeliveryViewed expects a DELIVERY ID
      const response = await deliveryApi.markDeliveryViewed(deliveryId);

      if (response.success) {
        const successMessage = 'Order skipped - won\'t appear again';
        
        if (showConfirmation) {
          Alert.alert('Order Skipped', successMessage, [
            { text: 'OK', onPress: onSuccess }
          ]);
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to skip order');
      }
    } catch (error: any) {
      console.error('❌ Error skipping order:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to skip order';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Decline an order with reason
   */
  async declineOrder(
    deliveryId: string, // ⚠️ This should be the delivery ID, not order ID
    data: DeclineOrderData = {},
    options: {
      showConfirmation?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = true, onSuccess, onError } = options;

    try {
      console.log(`❌ Declining order (delivery ID: ${deliveryId})...`);
      
      // ⚠️ CRITICAL: declineDelivery expects a DELIVERY ID
      const response = await deliveryApi.declineDelivery(deliveryId, {
        location: data.location || 'Driver location',
        reason: data.reason || 'Driver declined via mobile app',
      });

      if (response.success) {
        const successMessage = 'Order declined';
        
        if (showConfirmation) {
          Alert.alert('Order Declined', successMessage, [
            { text: 'OK', onPress: onSuccess }
          ]);
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error: any) {
      console.error('❌ Error declining order:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to decline order';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update order status with workflow validation
   */
  async updateOrderStatus(
    deliveryId: string, // ⚠️ This should be the delivery ID, not order ID
    data: StatusUpdateData,
    options: {
      showConfirmation?: boolean;
      validateWorkflow?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = true, validateWorkflow = true, onSuccess, onError } = options;

    try {
      console.log(`🔄 Updating order (delivery ID: ${deliveryId}) status to ${data.status}...`);
      
      // Validate workflow if requested
      if (validateWorkflow) {
        const isValidTransition = this.validateStatusTransition(data.status);
        if (!isValidTransition.valid) {
          throw new Error(isValidTransition.error);
        }
      }

      // ⚠️ CRITICAL: smartUpdateStatus expects a DELIVERY ID
      const response = await deliveryApi.smartUpdateStatus(deliveryId, {
        status: data.status,
        location: data.location || 'Driver location',
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes || `Status updated to ${data.status} by driver`,
      });

      if (response.success) {
        // Play appropriate sound based on status
        if (data.status === 'delivered') {
          soundService.playSuccessSound();
        }
        
        const statusLabel = this.getStatusLabel(data.status);
        const successMessage = `Order status updated to: ${statusLabel}`;
        
        if (showConfirmation) {
          Alert.alert(
            'Status Updated',
            successMessage,
            [{ text: 'OK', onPress: onSuccess }]
          );
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('❌ Error updating order status:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update order status';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate if a status transition is allowed
   */
  private validateStatusTransition(newStatus: string): { valid: boolean; error?: string } {
    const validTransitions = {
      assigned: ['accepted'],
      accepted: ['en_route_to_pickup'],
      en_route_to_pickup: ['arrived_at_pickup'],
      arrived_at_pickup: ['picked_up'],
      picked_up: ['en_route_to_delivery'],
      en_route_to_delivery: ['arrived_at_delivery'],
      arrived_at_delivery: ['delivered'],
      delivered: [], // Final state
    };

    // For now, allow any transition (can be enhanced with current status check)
    return { valid: true };
  }

  /**
   * Get human-readable status label
   */
  private getStatusLabel(status: string): string {
    const labels = {
      assigned: 'Assigned',
      accepted: 'Accepted',
      en_route_to_pickup: 'En Route to Pickup',
      arrived_at_pickup: 'Arrived at Pickup',
      picked_up: 'Picked Up',
      en_route_to_delivery: 'En Route to Customer',
      arrived_at_delivery: 'Arrived at Customer',
      delivered: 'Delivered',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };

    return labels[status as keyof typeof labels] || status.replace('_', ' ');
  }

  /**
   * Get next action in workflow
   */
  getNextAction(currentStatus: string): { status: string; label: string; description: string } | null {
    const workflow = {
      assigned: {
        status: 'accepted',
        label: 'Accept Order',
        description: 'Accept this delivery order',
      },
      accepted: {
        status: 'en_route_to_pickup',
        label: 'Start Pickup',
        description: 'Head to pickup location',
      },
      en_route_to_pickup: {
        status: 'arrived_at_pickup',
        label: 'Arrived at Pickup',
        description: 'Mark as arrived at pickup location',
      },
      arrived_at_pickup: {
        status: 'picked_up',
        label: 'Picked Up',
        description: 'Confirm order is picked up',
      },
      picked_up: {
        status: 'en_route_to_delivery',
        label: 'Start Delivery',
        description: 'Head to delivery location',
      },
      en_route_to_delivery: {
        status: 'arrived_at_delivery',
        label: 'Arrived at Customer',
        description: 'Mark as arrived at customer location',
      },
      arrived_at_delivery: {
        status: 'delivered',
        label: 'Complete Delivery',
        description: 'Mark order as delivered',
      },
    };

    return workflow[currentStatus as keyof typeof workflow] || null;
  }

  /**
   * Batch process multiple order actions
   */
  async batchProcessOrders(
    actions: Array<{
      deliveryId: string; // ⚠️ Changed from orderId to deliveryId for clarity
      action: 'accept' | 'decline' | 'skip' | 'updateStatus';
      data?: any;
    }>
  ): Promise<OrderActionResult[]> {
    const results: OrderActionResult[] = [];

    for (const action of actions) {
      let result: OrderActionResult;
      
      console.log(`🔄 Batch processing ${action.action} for delivery ID: ${action.deliveryId}`);

      switch (action.action) {
        case 'accept':
          result = await this.acceptOrder(action.deliveryId, action.data, { showConfirmation: false });
          break;
        case 'decline':
          result = await this.declineOrder(action.deliveryId, action.data, { showConfirmation: false });
          break;
        case 'skip':
          result = await this.skipOrder(action.deliveryId, { showConfirmation: false });
          break;
        case 'updateStatus':
          result = await this.updateOrderStatus(action.deliveryId, action.data, { showConfirmation: false });
          break;
        default:
          result = { success: false, error: 'Unknown action' };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Accept a batch order or route
   */
  async acceptBatchOrder(
    batchId: string,
    data: AcceptOrderData = {},
    options: {
      showConfirmation?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = true, onSuccess, onError } = options;

    try {
      console.log(`🎯 Accepting batch order ${batchId}...`);
      
      // Import API service
      const { apiService } = await import('./api');
      const response = await apiService.acceptBatchOrder(batchId);

      if (response.success) {
        // Play success sound
        soundService.playSuccessSound();
        
        const successMessage = 'Batch order accepted successfully!';
        
        if (showConfirmation) {
          Alert.alert('Batch Accepted', successMessage, [
            { text: 'OK', onPress: onSuccess }
          ]);
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to accept batch order');
      }
    } catch (error: any) {
      console.error('❌ Error accepting batch order:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to accept batch order';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Accept a route
   */
  async acceptRoute(
    routeId: string,
    data: AcceptOrderData = {},
    options: {
      showConfirmation?: boolean;
      onSuccess?: () => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<OrderActionResult> {
    const { showConfirmation = true, onSuccess, onError } = options;

    try {
      console.log(`🗺️ Accepting route ${routeId}...`);
      
      // Import API service
      const { apiService } = await import('./api');
      const response = await apiService.acceptRoute(routeId);

      if (response.success) {
        // Play success sound
        soundService.playSuccessSound();
        
        const successMessage = 'Route accepted successfully!';
        
        if (showConfirmation) {
          Alert.alert('Route Accepted', successMessage, [
            { text: 'OK', onPress: onSuccess }
          ]);
        } else {
          onSuccess?.();
        }

        return {
          success: true,
          message: successMessage,
        };
      } else {
        throw new Error(response.error || 'Failed to accept route');
      }
    } catch (error: any) {
      console.error('❌ Error accepting route:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to accept route';
      
      if (showConfirmation) {
        Alert.alert('Error', errorMessage);
      }
      
      onError?.(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const orderActionService = new OrderActionService();
export default orderActionService;