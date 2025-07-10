/**
 * Reusable Order Action Components
 * 
 * These components provide consistent, well-tested order action functionality
 * with clear separation between order IDs and delivery IDs.
 */

import React from 'react';
import { Alert, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order, getDeliveryIdForApi, getOrderDisplayId, extractOrderApiIds } from '../types';
import { orderActionService } from '../services/orderActionService';
import { haptics } from '../utils/haptics';
import { Design } from '../constants/designSystem';

interface OrderActionButtonsProps {
  order: Order;
  onSuccess?: (action: 'accept' | 'decline' | 'skip') => void;
  onError?: (error: string, action: 'accept' | 'decline' | 'skip') => void;
  showLabels?: boolean;
  style?: any;
  disabled?: boolean;
}

/**
 * Reusable Order Action Buttons Component
 * 
 * Handles accept/decline/skip actions with proper ID management
 */
export const OrderActionButtons: React.FC<OrderActionButtonsProps> = ({
  order,
  onSuccess,
  onError,
  showLabels = true,
  style,
  disabled = false
}) => {
  const apiIds = extractOrderApiIds(order);
  const displayId = getOrderDisplayId(order);
  
  console.log(`🔍 OrderActionButtons for ${displayId}:`, {
    deliveryId: apiIds.deliveryId,
    orderId: apiIds.orderId,
    orderNumber: apiIds.orderNumber
  });

  const handleAccept = async () => {
    if (disabled) return;
    
    haptics.light();
    console.log(`✅ Accepting order ${displayId} (using delivery ID: ${apiIds.deliveryId})`);
    
    const result = await orderActionService.acceptOrder(
      apiIds.deliveryId, // Use delivery ID for API call
      {},
      {
        onSuccess: () => onSuccess?.('accept'),
        onError: (error) => onError?.(error, 'accept')
      }
    );
    
    if (!result.success && onError) {
      onError(result.error || 'Failed to accept order', 'accept');
    }
  };

  const handleDecline = async () => {
    if (disabled) return;
    
    haptics.warning();
    
    Alert.alert(
      'Decline Order',
      `Are you sure you want to decline ${displayId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            console.log(`❌ Declining order ${displayId} (using delivery ID: ${apiIds.deliveryId})`);
            
            const result = await orderActionService.declineOrder(
              apiIds.deliveryId, // Use delivery ID for API call
              { reason: 'Driver declined via mobile app' },
              {
                onSuccess: () => onSuccess?.('decline'),
                onError: (error) => onError?.(error, 'decline')
              }
            );
            
            if (!result.success && onError) {
              onError(result.error || 'Failed to decline order', 'decline');
            }
          }
        }
      ]
    );
  };

  const handleSkip = async () => {
    if (disabled) return;
    
    haptics.light();
    console.log(`⏭️ Skipping order ${displayId} (using delivery ID: ${apiIds.deliveryId})`);
    
    const result = await orderActionService.skipOrder(
      apiIds.deliveryId, // Use delivery ID for API call
      {
        onSuccess: () => onSuccess?.('skip'),
        onError: (error) => onError?.(error, 'skip')
      }
    );
    
    if (!result.success && onError) {
      onError(result.error || 'Failed to skip order', 'skip');
    }
  };

  return (
    <View style={[styles.actionButtons, style]}>
      <TouchableOpacity
        style={[styles.declineButton, disabled && styles.disabledButton]}
        onPress={handleDecline}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color={disabled ? "#ccc" : "#FF4757"} />
        {showLabels && <Text style={[styles.declineButtonText, disabled && styles.disabledText]}>Decline</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.skipButton, disabled && styles.disabledButton]}
        onPress={handleSkip}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="play-forward" size={20} color={disabled ? "#ccc" : "#666"} />
        {showLabels && <Text style={[styles.skipButtonText, disabled && styles.disabledText]}>Skip</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.acceptButton, disabled && styles.disabledButton]}
        onPress={handleAccept}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={20} color={disabled ? "#ccc" : "#fff"} />
        {showLabels && <Text style={[styles.acceptButtonText, disabled && styles.disabledText]}>Accept</Text>}
      </TouchableOpacity>
    </View>
  );
};

interface OrderStatusUpdateButtonProps {
  order: Order;
  newStatus: string;
  label?: string;
  icon?: string;
  color?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

/**
 * Single Status Update Button Component
 */
export const OrderStatusUpdateButton: React.FC<OrderStatusUpdateButtonProps> = ({
  order,
  newStatus,
  label,
  icon = "arrow-forward",
  color = Design.colors.primary,
  onSuccess,
  onError,
  disabled = false
}) => {
  const apiIds = extractOrderApiIds(order);
  const displayId = getOrderDisplayId(order);

  const handleStatusUpdate = async () => {
    if (disabled) return;
    
    haptics.light();
    console.log(`🔄 Updating ${displayId} status to ${newStatus} (using delivery ID: ${apiIds.deliveryId})`);
    
    const result = await orderActionService.updateOrderStatus(
      apiIds.deliveryId, // Use delivery ID for API call
      { status: newStatus },
      {
        onSuccess,
        onError
      }
    );
    
    if (!result.success && onError) {
      onError(result.error || `Failed to update status to ${newStatus}`);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.statusButton,
        { backgroundColor: disabled ? "#ccc" : color },
        disabled && styles.disabledButton
      ]}
      onPress={handleStatusUpdate}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={20} color={disabled ? "#999" : "#fff"} />
      {label && <Text style={[styles.statusButtonText, disabled && styles.disabledText]}>{label}</Text>}
    </TouchableOpacity>
  );
};

interface OrderInfoDisplayProps {
  order: Order;
  showIds?: boolean;
}

/**
 * Debug component to show order ID information clearly
 */
export const OrderInfoDisplay: React.FC<OrderInfoDisplayProps> = ({
  order,
  showIds = false
}) => {
  const apiIds = extractOrderApiIds(order);
  const displayId = getOrderDisplayId(order);

  if (!showIds) {
    return (
      <Text style={styles.orderDisplayId}>
        {displayId}
      </Text>
    );
  }

  return (
    <View style={styles.debugInfo}>
      <Text style={styles.debugTitle}>Order Info (Debug)</Text>
      <Text style={styles.debugText}>Display: {displayId}</Text>
      <Text style={styles.debugText}>Delivery ID (for API): {apiIds.deliveryId}</Text>
      {apiIds.orderId && <Text style={styles.debugText}>Order ID: {apiIds.orderId}</Text>}
      {apiIds.orderNumber && <Text style={styles.debugText}>Order Number: {apiIds.orderNumber}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    gap: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[2],
    borderWidth: 2,
    borderColor: Design.colors.error,
  },
  declineButtonText: {
    ...Design.typography.button,
    color: Design.colors.error,
    fontSize: 14,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.gray100,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[2],
  },
  skipButtonText: {
    ...Design.typography.button,
    color: Design.colors.textSecondary,
    fontSize: 14,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.success,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[2],
  },
  acceptButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
    fontSize: 14,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.lg,
    gap: Design.spacing[2],
  },
  statusButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#999",
  },
  orderDisplayId: {
    ...Design.typography.h6,
    color: Design.colors.text,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: Design.colors.gray100,
    padding: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginVertical: Design.spacing[2],
  },
  debugTitle: {
    ...Design.typography.bodySmall,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[2],
  },
  debugText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontFamily: 'monospace',
  },
});

export default {
  OrderActionButtons,
  OrderStatusUpdateButton,
  OrderInfoDisplay,
};