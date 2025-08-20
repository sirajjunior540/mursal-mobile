import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { PhotoCapture, PhotoCaptureResult } from '../Photo';
import { photoService } from '../../services/photoService';
import { useTranslation } from 'react-i18next';

interface OrderActionsWithPhotoProps {
  order: Order;
  showStatusButton?: boolean;
  readonly?: boolean;
  isBatchOrder?: boolean;
  isConsolidatedBatch?: boolean;
  batchProperties?: any;
  onStatusUpdate?: (orderId: string, status: string, photoId?: string) => void;
  onAccept?: (order: Order) => void;
  onDecline?: (order: Order) => void;
  onAcceptRoute?: (order: Order) => void;
  onClose: () => void;
}

export const OrderActionsWithPhoto: React.FC<OrderActionsWithPhotoProps> = ({
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
  const { t } = useTranslation();
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string; label: string } | null>(null);
  const [isCheckingPhotoRequirements, setIsCheckingPhotoRequirements] = useState(false);
  const [photoRequirements, setPhotoRequirements] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Check if photo is required for delivery
  const checkPhotoRequirement = async (status: string) => {
    if (status !== 'delivered') return false;
    
    try {
      setIsCheckingPhotoRequirements(true);
      const requirements = await photoService.checkPhotoRequirements(order.id);
      setPhotoRequirements(requirements);
      return requirements.is_photo_required;
    } catch (error) {
      console.error('Failed to check photo requirements:', error);
      return false;
    } finally {
      setIsCheckingPhotoRequirements(false);
    }
  };

  const handleStatusUpdate = async (status: string, label: string) => {
    // Check if photo is required for this status update
    if (status === 'delivered') {
      const photoRequired = await checkPhotoRequirement(status);
      
      if (photoRequired) {
        // Store the pending status update and show photo capture
        setPendingStatusUpdate({ status, label });
        setShowPhotoCapture(true);
        return;
      }
    }

    // No photo required, proceed with normal status update
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

  const handlePhotoCapture = useCallback(async (photo: PhotoCaptureResult) => {
    try {
      setIsUploadingPhoto(true);
      
      // Upload the photo
      const uploadedPhoto = await photoService.uploadDeliveryPhoto({
        deliveryId: order.id,
        photo,
      });

      // Close photo capture
      setShowPhotoCapture(false);

      // Now update the status with the photo ID
      if (pendingStatusUpdate && onStatusUpdate) {
        onStatusUpdate(order.id, pendingStatusUpdate.status, uploadedPhoto.id);
        setPendingStatusUpdate(null);
        onClose();
      }
    } catch (error) {
      console.error('Photo upload failed:', error);
      Alert.alert(
        t('error'),
        t('failedToUploadPhoto'),
        [
          {
            text: t('retry'),
            onPress: () => handlePhotoCapture(photo),
          },
          {
            text: t('cancel'),
            style: 'cancel',
          },
        ]
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [order.id, pendingStatusUpdate, onStatusUpdate, onClose, t]);

  const handleTakePhoto = () => {
    setShowPhotoCapture(true);
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
  const canTakePhoto = ['picked_up', 'in_transit', 'delivered'].includes(order.status);

  if (readonly && statusActions.length === 0) {
    return null;
  }

  return (
    <>
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

        {/* Photo Actions */}
        {canTakePhoto && !readonly && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Delivery Documentation</Text>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={20} color={flatColors.primary} />
              <Text style={styles.photoButtonText}>Take Delivery Photo</Text>
            </TouchableOpacity>
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
                  disabled={isCheckingPhotoRequirements}
                >
                  {isCheckingPhotoRequirements && action.key === 'delivered' ? (
                    <ActivityIndicator size="small" color={flatColors.accent.green} />
                  ) : (
                    <Ionicons 
                      name={action.icon} 
                      size={18} 
                      color={
                        action.key === 'delivered' ? flatColors.accent.green :
                        action.key === 'failed' ? flatColors.accent.red :
                        action.color
                      }
                    />
                  )}
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

      {/* Photo Capture Modal */}
      <PhotoCapture
        visible={showPhotoCapture}
        onClose={() => {
          setShowPhotoCapture(false);
          setPendingStatusUpdate(null);
        }}
        onPhotoCapture={handlePhotoCapture}
        requiredReasons={photoRequirements?.required_reasons || []}
        deliveryId={order.id}
        orderNumber={order.orderNumber}
      />

      {/* Upload Loading Overlay */}
      {isUploadingPhoto && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <ActivityIndicator size="large" color={flatColors.primary} />
            <Text style={styles.uploadText}>{t('uploadingPhoto')}</Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.surface,
    padding: 16,
    gap: 20,
  },
  actionSection: {
    gap: 12,
  },
  sectionTitle: {
    ...premiumTypography.bodyMedium,
    color: flatColors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
    backgroundColor: flatColors.accent.green,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    ...premiumTypography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: flatColors.accent.red,
    gap: 8,
  },
  declineButtonText: {
    ...premiumTypography.bodyMedium,
    color: flatColors.accent.red,
    fontWeight: '600',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: flatColors.primary,
    gap: 8,
  },
  photoButtonText: {
    ...premiumTypography.bodyMedium,
    color: flatColors.primary,
    fontWeight: '600',
  },
  statusButtonContainer: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusButtonText: {
    ...premiumTypography.bodyMedium,
    color: flatColors.text.primary,
    fontWeight: '500',
  },
  deliveredButton: {
    backgroundColor: `${flatColors.accent.green}15`,
  },
  deliveredButtonText: {
    color: flatColors.accent.green,
    fontWeight: '600',
  },
  failedButton: {
    backgroundColor: `${flatColors.accent.red}15`,
  },
  failedButtonText: {
    color: flatColors.accent.red,
    fontWeight: '600',
  },
  batchInfo: {
    backgroundColor: `${flatColors.accent.blue}10`,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  batchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batchInfoTitle: {
    ...premiumTypography.bodyMedium,
    color: flatColors.accent.blue,
    fontWeight: '600',
    fontSize: 14,
  },
  batchInfoText: {
    ...premiumTypography.bodySmall,
    color: flatColors.text.secondary,
    lineHeight: 20,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadContainer: {
    backgroundColor: flatColors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  uploadText: {
    ...premiumTypography.bodyMedium,
    color: flatColors.text.primary,
  },
});