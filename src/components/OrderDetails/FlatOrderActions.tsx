import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatOrderActionsProps {
  order: Order;
  showStatusButton?: boolean;
  readonly?: boolean;
  isBatchOrder?: boolean;
  isConsolidatedBatch?: boolean;
  batchProperties?: any;
  onStatusUpdate?: (orderId: string, status: string) => void;
  onAccept?: (order: Order) => void;
  onDecline?: (order: Order) => void;
  onAcceptRoute?: (order: Order) => void;
  onClose: () => void;
}

export const FlatOrderActions: React.FC<FlatOrderActionsProps> = ({
  order,
  showStatusButton = true,
  readonly = false,
  isBatchOrder = false,
  isConsolidatedBatch = false,
  batchProperties,
  onStatusUpdate,
  onAccept,
  onDecline,
  onAcceptRoute,
  onClose,
}) => {
  const handleStatusUpdate = (status: string, label: string) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${label.toLowerCase()}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: status === 'failed' ? 'destructive' : 'default',
          onPress: () => {
            if (onStatusUpdate) {
              onStatusUpdate(order.id, status);
            }
            onClose();
          },
        },
      ],
    );
  };

  const handleAccept = () => {
    if (isBatchOrder && onAcceptRoute) {
      onAcceptRoute(order);
    } else if (onAccept) {
      onAccept(order);
    }
    onClose();
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Order',
      'Are you sure you want to decline this order?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            if (onDecline) {
              onDecline(order);
            }
            onClose();
          },
        },
      ],
    );
  };

  const getStatusActions = () => {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
      case 'assigned':
        actions.push({
          key: 'picked_up',
          label: 'Mark as Picked Up',
          color: flatColors.accent.orange,
          icon: 'checkmark-circle',
        });
        break;
      case 'picked_up':
      case 'in_transit':
        actions.push({
          key: 'delivered',
          label: 'Mark as Delivered',
          color: flatColors.accent.green,
          icon: 'checkmark-circle',
        });
        break;
    }
    
    return actions;
  };

  const statusActions = getStatusActions();
  const canAccept = order.status === 'pending' || order.status === 'assigned';
  const canDecline = order.status === 'pending' || order.status === 'assigned';

  if (readonly && statusActions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Available Order Actions */}
      {canAccept && !readonly && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Available Actions</Text>
          <View style={styles.buttonRow}>
            {canDecline && (
              <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                <Ionicons name="close" size={20} color={flatColors.accent.red} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>
                {isBatchOrder ? 'Accept Route' : 'Accept Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status Update Actions */}
      {showStatusButton && statusActions.length > 0 && !readonly && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusButtonContainer}>
            {statusActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[
                  styles.statusButton,
                  action.key === 'delivered' && styles.deliveredButton,
                  action.key === 'failed' && styles.failedButton,
                ]}
                onPress={() => handleStatusUpdate(action.key, action.label)}
              >
                <Ionicons 
                  name={action.icon} 
                  size={18} 
                  color={
                    action.key === 'delivered' ? flatColors.accent.green :
                    action.key === 'failed' ? flatColors.accent.red :
                    action.color
                  }
                />
                <Text style={[
                  styles.statusButtonText,
                  action.key === 'delivered' && styles.deliveredButtonText,
                  action.key === 'failed' && styles.failedButtonText,
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Batch Information */}
      {isBatchOrder && batchProperties && (
        <View style={styles.batchInfo}>
          <View style={styles.batchInfoHeader}>
            <Ionicons name="layers" size={16} color={flatColors.accent.blue} />
            <Text style={styles.batchInfoTitle}>Batch Information</Text>
          </View>
          <Text style={styles.batchInfoText}>
            This {isConsolidatedBatch ? 'consolidated' : 'distribution'} batch contains{' '}
            {batchProperties.orders.length} orders with a total value of{' '}
            {order.currency || 'SAR'} {batchProperties.totalValue.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  actionSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: flatColors.accent.blue,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    borderWidth: 2,
    borderColor: flatColors.accent.red,
    gap: 8,
  },
  declineButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.red,
  },
  statusButtonContainer: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    gap: 8,
  },
  statusButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
  },
  deliveredButton: {
    backgroundColor: flatColors.cards.green.background,
    borderColor: flatColors.accent.green,
  },
  deliveredButtonText: {
    color: flatColors.accent.green,
  },
  failedButton: {
    backgroundColor: flatColors.cards.red.background,
    borderColor: flatColors.accent.red,
  },
  failedButtonText: {
    color: flatColors.accent.red,
  },
  batchInfo: {
    backgroundColor: flatColors.cards.blue.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.accent.blue,
  },
  batchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  batchInfoTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.blue,
  },
  batchInfoText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
  },
});