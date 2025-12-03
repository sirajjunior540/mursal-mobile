import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Order } from '../../types';
import { RootStackParamList } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import QRScanner from '../tracking/QRScanner';
import { QRScanResult } from '../../types/tracking';

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
  const [showQRScanner, setShowQRScanner] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
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

  const handleQRScan = () => {
    setShowQRScanner(true);
  };

  const handleQRScanResult = (result: QRScanResult) => {
    setShowQRScanner(false);
    
    if (result.success && result.data) {
      // Parse QR data to get order information
      let scannedOrderId: string | undefined;
      let scannedOrderNumber: string | undefined;
      let scannedBatchId: string | undefined;
      
      try {
        // Try parsing as JSON first
        const parsedData = JSON.parse(result.data);
        scannedOrderId = parsedData.order_id || parsedData.orderId || parsedData.id;
        scannedOrderNumber = parsedData.order_number || parsedData.orderNumber;
        scannedBatchId = parsedData.batch_id || parsedData.batchId;
      } catch {
        // Handle pipe-delimited format: ORDER123|http://...|456|BATCH789
        if (result.data.includes('|')) {
          const parts = result.data.split('|');
          if (parts.length >= 3) {
            scannedOrderNumber = parts[0].replace(/^(ORD|ORDER|#)/i, '');
            scannedOrderId = parts[2];
            scannedBatchId = parts.length > 3 ? parts[3] : undefined;
          }
        } else if (result.data.match(/^(ORD|ORDER|#)/i)) {
          // Simple order number
          scannedOrderNumber = result.data.replace(/^(ORD|ORDER|#)/i, '');
        }
      }
      
      // Check if this is a batch order
      if (isBatchOrder && batchProperties && batchProperties.orders) {
        // Check if scanned order belongs to this batch
        const belongsToThisBatch = batchProperties.orders.some((batchOrder: Order) => 
          batchOrder.id === scannedOrderId || 
          batchOrder.order_number === scannedOrderNumber ||
          batchOrder.order_number === `ORDER${scannedOrderNumber}` ||
          batchOrder.order_number === `ORD${scannedOrderNumber}` ||
          batchOrder.order_number === `#${scannedOrderNumber}`
        );
        
        if (belongsToThisBatch) {
          Alert.alert(
            '✅ Order Verified',
            `Order #${scannedOrderNumber || scannedOrderId} belongs to this batch.\n\nYou can mark it as picked up.`,
            [
              {
                text: 'Mark as Picked Up',
                onPress: () => {
                  if (onStatusUpdate) {
                    onStatusUpdate(order.id, 'picked_up');
                  }
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert(
            '❌ Wrong Batch',
            `Order #${scannedOrderNumber || scannedOrderId} does NOT belong to this batch.\n\nPlease check if you have the correct package.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Non-batch order - check if it matches current order
        if (order.id === scannedOrderId || order.order_number === scannedOrderNumber) {
          Alert.alert(
            '✅ Order Verified',
            `Order confirmed. You can mark it as picked up.`,
            [
              {
                text: 'Mark as Picked Up',
                onPress: () => {
                  if (onStatusUpdate) {
                    onStatusUpdate(order.id, 'picked_up');
                  }
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert(
            '❌ Wrong Order',
            `This QR code is for a different order.`,
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  /**
   * Get available status actions based on current order status
   * Uses unified statuses matching backend: pending, confirmed, preparing, ready, picked_up, in_transit, delivered, cancelled, failed
   */
  const getStatusActions = () => {
    const actions = [];
    const status = order.status;

    // Statuses where driver can mark as picked up
    // Backend flow: pending -> confirmed -> preparing -> ready -> picked_up
    if (status === 'pending' || status === 'confirmed' || status === 'preparing' || status === 'ready') {
      actions.push({
        key: 'picked_up',
        label: 'Mark as Picked Up',
        color: flatColors.accent.orange,
        icon: 'checkmark-circle',
      });
    }
    // After pickup, driver can start delivery (on my way)
    // Backend flow: picked_up -> in_transit
    else if (status === 'picked_up') {
      actions.push({
        key: 'in_transit',
        label: 'On My Way',
        color: flatColors.accent.blue,
        icon: 'car',
      });
    }
    // When in transit, driver can mark as delivered
    // Backend flow: in_transit -> delivered
    else if (status === 'in_transit') {
      actions.push({
        key: 'delivered',
        label: 'Mark as Delivered',
        color: flatColors.accent.green,
        icon: 'checkmark-circle',
      });
    }

    return actions;
  };

  const statusActions = getStatusActions();
  // Driver can accept/decline orders that are pending or ready for pickup
  const canAccept = order.status === 'pending' || order.status === 'ready';
  const canDecline = order.status === 'pending' || order.status === 'ready';

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
            {/* QR Scan Button for Pickup Confirmation */}
            {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready') && (
              <TouchableOpacity
                style={styles.qrScanButton}
                onPress={handleQRScan}
              >
                <Ionicons name="qr-code-outline" size={20} color={flatColors.accent.purple} />
                <Text style={styles.qrScanButtonText}>
                  Scan QR to Verify Pickup
                </Text>
              </TouchableOpacity>
            )}
            
            {statusActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[
                  styles.statusButton,
                  action.key === 'in_transit' && styles.inTransitButton,
                  action.key === 'delivered' && styles.deliveredButton,
                  action.key === 'failed' && styles.failedButton,
                ]}
                onPress={() => handleStatusUpdate(action.key, action.label)}
              >
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={
                    action.key === 'in_transit' ? '#FFFFFF' :
                    action.key === 'delivered' ? flatColors.accent.green :
                    action.key === 'failed' ? flatColors.accent.red :
                    action.color
                  }
                />
                <Text style={[
                  styles.statusButtonText,
                  action.key === 'in_transit' && styles.inTransitButtonText,
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
          
          {/* Item Pickup Button for batch orders */}
          {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'picked_up') &&
           batchProperties.batchId && (
            <TouchableOpacity
              style={styles.itemPickupButton}
              onPress={() => {
                onClose();
                navigation.navigate('ItemPickup', {
                  batchId: batchProperties.batchId,
                  batchNumber: batchProperties.batchNumber || 'Unknown',
                });
              }}
            >
              <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" />
              <Text style={styles.itemPickupButtonText}>
                Confirm Item Pickups
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* QR Scanner Modal */}
      <QRScanner
        isVisible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanResult={handleQRScanResult}
        allowManualEntry={true}
        placeholder={isBatchOrder ? "Enter order number from this batch" : "Enter order number"}
      />
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
  qrScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: flatColors.cards.purple.background,
    borderWidth: 1,
    borderColor: flatColors.accent.purple,
    gap: 8,
  },
  qrScanButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.purple,
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
  inTransitButton: {
    backgroundColor: flatColors.accent.blue,
    borderColor: flatColors.accent.blue,
  },
  inTransitButtonText: {
    color: '#FFFFFF',
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
  itemPickupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: flatColors.accent.purple,
    gap: 8,
  },
  itemPickupButtonText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});