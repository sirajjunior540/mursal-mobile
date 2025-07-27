import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Platform, PermissionsAndroid } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { photoService } from '../../services/photoService';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { SecureStorage } from '../../utils';
import { InAppCamera } from '../Photo';
import { DeliveryScenarioModal, DeliveryScenario } from '../RouteNavigation/DeliveryScenarioModal';

interface OrderActionsSimpleProps {
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

export const OrderActionsSimple: React.FC<OrderActionsSimpleProps> = ({
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string; label: string } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<DeliveryScenario | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<{ name?: string; relation?: string; notes?: string } | null>(null);
  const [isCheckingPhotoRequirements, setIsCheckingPhotoRequirements] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Check if photo is required for delivery
  const checkPhotoRequirement = async (status: string) => {
    if (status !== 'delivered') return false;
    
    try {
      setIsCheckingPhotoRequirements(true);
      
      // Debug: Check if token exists
      const token = await SecureStorage.getAuthToken();
      console.log('Auth token exists:', !!token);
      
      const requirements = await photoService.checkPhotoRequirements(order.id);
      return requirements.is_photo_required;
    } catch (error) {
      console.error('Failed to check photo requirements:', error);
      // For now, return true to always require photo while we fix the auth issue
      return true;
    } finally {
      setIsCheckingPhotoRequirements(false);
    }
  };

  const handleScenarioSelected = async (scenario: DeliveryScenario, recipientName?: string, recipientRelation?: string, notes?: string) => {
    setSelectedScenario(scenario);
    setRecipientInfo({ name: recipientName, relation: recipientRelation, notes });
    setShowScenarioModal(false);
    
    // Check if photo is required for this scenario
    const scenarioRequiresPhoto = scenario !== 'handed_to_customer';
    
    if (scenarioRequiresPhoto) {
      setShowPhotoModal(true);
    } else {
      // Direct delivery to customer, no photo needed
      if (pendingStatusUpdate && onStatusUpdate) {
        setIsUpdatingStatus(true);
        try {
          // Call the status update and wait for it to complete
          await onStatusUpdate(order.id, pendingStatusUpdate.status);
          setPendingStatusUpdate(null);
          // Don't close immediately - let the parent handle it after successful update
        } catch (error) {
          console.error('Failed to update status:', error);
          Alert.alert('Error', 'Failed to update delivery status');
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    }
  };

  const handleStatusUpdate = async (status: string, label: string) => {
    // For delivered status, show scenario selection first
    if (status === 'delivered') {
      setPendingStatusUpdate({ status, label });
      setShowScenarioModal(true);
      return;
    }

    // For other statuses, proceed with normal confirmation
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
          onPress: async () => {
            if (onStatusUpdate) {
              setIsUpdatingStatus(true);
              try {
                await onStatusUpdate(order.id, status);
                // Don't close immediately - let the parent handle it
              } catch (error) {
                console.error('Failed to update status:', error);
                Alert.alert('Error', 'Failed to update order status');
              } finally {
                setIsUpdatingStatus(false);
              }
            }
          },
        },
      ],
    );
  };

  const handleInAppPhotoTaken = async (photo: { uri: string; base64?: string }) => {
    console.log('In-app photo taken:', photo);
    setShowInAppCamera(false);
    
    try {
      setIsUploadingPhoto(true);
      
      // Check auth token before upload
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login again to continue');
        return;
      }
      
      console.log('Uploading photo with data:', {
        deliveryId: order.id,
        photoUri: photo.uri,
        hasBase64: !!photo.base64,
      });
      
      // Determine photo reason based on scenario
      let photoReason = 'proof_of_delivery';
      if (selectedScenario === 'left_at_door') {
        photoReason = 'left_at_door';
      } else if (selectedScenario === 'delivered_to_neighbor' || selectedScenario === 'delivered_to_security' || selectedScenario === 'delivered_to_reception') {
        photoReason = 'alternate_recipient';
      }
      
      // Upload the photo
      const uploadedPhoto = await photoService.uploadDeliveryPhoto({
        deliveryId: order.id,
        photo: {
          uri: photo.uri,
          type: 'image/jpeg',
          fileName: `delivery_photo_${Date.now()}.jpg`,
          fileSize: 0,
          base64: photo.base64,
          reason: photoReason,
          notes: recipientInfo?.notes || '',
          alternateRecipientName: recipientInfo?.name,
          alternateRecipientRelation: recipientInfo?.relation,
        },
      });

      // Close photo modal
      setShowPhotoModal(false);

      // Now update the status with the photo ID
      if (pendingStatusUpdate && onStatusUpdate) {
        setIsUpdatingStatus(true);
        try {
          await onStatusUpdate(order.id, pendingStatusUpdate.status, uploadedPhoto.id);
          setPendingStatusUpdate(null);
          // Don't close immediately - let the parent handle it
        } catch (error) {
          console.error('Failed to update status with photo:', error);
          Alert.alert('Error', 'Failed to update delivery status');
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    } catch (error) {
      console.error('Photo upload failed:', error);
      Alert.alert(
        t('error'),
        error.message || t('failedToUploadPhoto'),
        [
          {
            text: t('retry'),
            onPress: () => setShowInAppCamera(true),
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
        // For pending orders that haven't been assigned/accepted yet
        // No status actions should be available until accepted
        break;
      case 'assigned':
      case 'accepted':
        // For assigned/accepted orders, show the next action: Mark as Picked Up
        // Note: Backend sometimes uses 'assigned' for accepted orders
        actions.push({
          key: 'picked_up',
          label: 'Mark as Picked Up',
          color: flatColors.accent.orange,
          icon: 'bag-check',
        });
        break;
      case 'picked_up':
      case 'in_transit':
        // For picked up orders, show Mark as Delivered
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
  // Only show Accept/Decline for orders that are NOT in the driver's active deliveries
  // Check if onAccept callback exists - if not, this order is already accepted
  // For batch orders, also check onAcceptRoute
  const canAccept = (order.status === 'pending' || order.status === 'assigned') && (!!onAccept || !!onAcceptRoute);
  const canDecline = (order.status === 'pending' || order.status === 'assigned') && !!onDecline;

  // Show actions for orders that have status actions or can be accepted/declined
  const shouldShowActions = !readonly && (statusActions.length > 0 || canAccept || canDecline);

  // Debug logging to understand why actions might be hidden
  console.log('OrderActionsSimple debug:', {
    orderStatus: order.status,
    readonly,
    showStatusButton,
    statusActionsLength: statusActions.length,
    canAccept,
    canDecline,
    shouldShowActions,
    hasOnAccept: !!onAccept,
    hasOnStatusUpdate: !!onStatusUpdate,
  });

  // Don't render if readonly and no actions are available
  if (readonly && statusActions.length === 0 && !shouldShowActions) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        {/* Available Order Actions - ONLY show for pending/assigned orders (not accepted) */}
        {shouldShowActions && canAccept && (onAccept || onAcceptRoute) && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Available Actions</Text>
            <View style={styles.buttonRow}>
              {canDecline && onDecline && (
                <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                  <Ionicons name="close-circle" size={18} color={flatColors.accent.red} />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                <Ionicons name="checkmark-circle" size={18} color={flatColors.accent.blue} />
                <Text style={styles.acceptButtonText}>
                  {isBatchOrder ? 'Accept Route' : 'Accept Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Update Actions - Show for all statuses that have next actions */}
        {showStatusButton && statusActions.length > 0 && shouldShowActions && onStatusUpdate && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>
              {order.status === 'accepted' ? 'Next Action' : 
               order.status === 'picked_up' || order.status === 'in_transit' ? 'Complete Delivery' :
               'Update Status'}
            </Text>
            <View style={styles.statusButtonContainer}>
              {statusActions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={[
                    styles.statusButton,
                    action.key === 'delivered' && styles.deliveredButton,
                    action.key === 'failed' && styles.failedButton,
                    action.key === 'picked_up' && styles.pickedUpButton,
                  ]}
                  onPress={() => handleStatusUpdate(action.key, action.label)}
                  disabled={isCheckingPhotoRequirements || isUpdatingStatus}
                >
                  {(isCheckingPhotoRequirements && action.key === 'delivered') || isUpdatingStatus ? (
                    <ActivityIndicator 
                      size="small" 
                      color={
                        action.key === 'delivered' ? flatColors.accent.green :
                        action.key === 'failed' ? flatColors.accent.red :
                        action.key === 'picked_up' ? flatColors.accent.orange :
                        action.color
                      }
                    />
                  ) : (
                    <Ionicons 
                      name={action.icon} 
                      size={18} 
                      color={
                        action.key === 'delivered' ? flatColors.accent.green :
                        action.key === 'failed' ? flatColors.accent.red :
                        action.key === 'picked_up' ? flatColors.accent.orange :
                        action.color
                      }
                    />
                  )}
                  <Text style={[
                    styles.statusButtonText,
                    action.key === 'delivered' && styles.deliveredButtonText,
                    action.key === 'failed' && styles.failedButtonText,
                    action.key === 'picked_up' && styles.pickedUpButtonText,
                  ]}>
                    {isUpdatingStatus ? 'Updating...' : action.label}
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

      {/* Delivery Scenario Modal */}
      <DeliveryScenarioModal
        isVisible={showScenarioModal}
        onClose={() => {
          setShowScenarioModal(false);
          setPendingStatusUpdate(null);
        }}
        onScenarioSelected={handleScenarioSelected}
      />

      {/* Photo Modal - Improved Design */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.photoModalContent]}>
            {/* Header with Icon */}
            <View style={styles.photoModalHeader}>
              <View style={styles.photoModalIcon}>
                <Ionicons name="camera" size={32} color={flatColors.accent.blue} />
              </View>
            </View>
            
            <Text style={styles.photoModalTitle}>Photo Required</Text>
            <Text style={styles.photoModalText}>
              {selectedScenario === 'left_at_door' && 'Take a photo showing where you left the package'}
              {(selectedScenario === 'delivered_to_neighbor' || selectedScenario === 'delivered_to_security' || selectedScenario === 'delivered_to_reception') && 'Take a photo of the package with the recipient'}
              {selectedScenario === 'other' && 'Take a photo as proof of delivery'}
              {!selectedScenario && 'Please provide a photo as proof of delivery'}
            </Text>
            
            <View style={styles.photoModalActions}>
              <TouchableOpacity 
                style={styles.photoModalButton} 
                onPress={() => setShowInAppCamera(true)}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.photoModalButtonText}>Take Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.photoModalGalleryButton} 
                onPress={() => {
                  const options = {
                    mediaType: 'photo' as const,
                    includeBase64: true,
                    maxWidth: 1024,
                    maxHeight: 1024,
                    quality: 0.8,
                  };
                  launchImageLibrary(options, (response) => {
                    if (response.assets && response.assets[0]) {
                      handleInAppPhotoTaken({
                        uri: response.assets[0].uri || '',
                        base64: response.assets[0].base64,
                      });
                    }
                  });
                }}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={flatColors.accent.blue} />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={24} color={flatColors.accent.blue} />
                    <Text style={styles.photoModalGalleryText}>Choose from Gallery</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoModalCancelButton} 
                onPress={() => {
                  setShowPhotoModal(false);
                  setPendingStatusUpdate(null);
                  setSelectedScenario(null);
                  setRecipientInfo(null);
                }}
                disabled={isUploadingPhoto}
              >
                <Text style={styles.photoModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-App Camera Modal */}
      <InAppCamera
        isVisible={showInAppCamera}
        onClose={() => setShowInAppCamera(false)}
        onPhotoTaken={handleInAppPhotoTaken}
        title="Delivery Photo"
        instruction="Take a clear photo of the delivered package"
      />
    </>
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
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: flatColors.cards.blue.background,
    borderWidth: 1,
    borderColor: flatColors.accent.blue,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.blue,
  },
  declineButton: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: flatColors.cards.red.background,
    borderWidth: 1,
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
  acceptedButton: {
    backgroundColor: flatColors.cards.blue.background,
    borderColor: flatColors.accent.blue,
  },
  acceptedButtonText: {
    color: flatColors.accent.blue,
  },
  pickedUpButton: {
    backgroundColor: flatColors.cards.yellow.background,
    borderColor: flatColors.accent.orange,
  },
  pickedUpButtonText: {
    color: flatColors.accent.orange,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: flatColors.neutral[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: flatColors.accent.blue,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.accent.blue,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.neutral[600],
  },
  
  // Improved Photo Modal Styles
  photoModalContent: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  photoModalHeader: {
    marginBottom: 20,
  },
  photoModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 8,
  },
  photoModalText: {
    fontSize: premiumTypography.body.fontSize,
    fontWeight: premiumTypography.body.fontWeight,
    lineHeight: premiumTypography.body.lineHeight,
    color: flatColors.neutral[600],
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  photoModalActions: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  photoModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    ...premiumShadows.small,
  },
  photoModalButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
  photoModalGalleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.primary,
    borderWidth: 2,
    borderColor: flatColors.accent.blue,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoModalGalleryText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.blue,
  },
  photoModalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoModalCancelText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[600],
  },
});