import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CurrentStopCardProps } from '../../types/route.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { InAppCamera } from '../Photo';
import { photoService } from '../../services/photoService';
import { SecureStorage } from '../../utils';
import { useTranslation } from 'react-i18next';
import { DeliveryScenarioModal, DeliveryScenario } from './DeliveryScenarioModal';

export const CurrentStopCard: React.FC<CurrentStopCardProps> = ({
  routePoint,
  onNavigate,
  onStatusUpdate,
  onCallCustomer,
  onViewDetails,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ status: string; label: string } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<DeliveryScenario | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<{ name?: string; relation?: string; notes?: string } | null>(null);
  const [isCheckingPhotoRequirements, setIsCheckingPhotoRequirements] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { order, type, address, sequenceNumber, batchOrders } = routePoint;
  
  const getCustomerPhone = () => {
    return order.customer?.phone || 
           order.customer_details?.phone || 
           order.customer_details?.phone_number || '';
  };

  const getStatusUpdateOptions = () => {
    if (type === 'pickup') {
      return [
        { 
          status: 'picked_up', 
          label: 'Mark as Picked Up', 
          color: flatColors.accent.orange, 
          icon: 'checkmark-circle' 
        },
      ];
    } else {
      return [
        { 
          status: 'delivered', 
          label: 'Mark as Delivered', 
          color: flatColors.accent.green, 
          icon: 'checkmark-circle' 
        },
        { 
          status: 'failed', 
          label: 'Mark as Failed', 
          color: flatColors.accent.red, 
          icon: 'close-circle' 
        },
      ];
    }
  };

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
        // Check if this is a consolidated batch delivery
        if (batchOrders && batchOrders.length > 1 && type === 'delivery') {
          // For consolidated deliveries, update all orders in the batch
          Alert.alert(
            'Update All Orders',
            `This will mark all ${batchOrders.length} orders in this batch as ${pendingStatusUpdate.label.toLowerCase()}. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Update All', 
                onPress: () => {
                  // Update all orders in the batch with the same photo
                  batchOrders.forEach((batchOrder) => {
                    onStatusUpdate(batchOrder.id, pendingStatusUpdate.status, uploadedPhoto.id);
                  });
                  setPendingStatusUpdate(null);
                }
              }
            ]
          );
        } else {
          // Single order update
          onStatusUpdate(order.id, pendingStatusUpdate.status, uploadedPhoto.id);
          setPendingStatusUpdate(null);
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

  const handleScenarioSelected = (scenario: DeliveryScenario, recipientName?: string, recipientRelation?: string, notes?: string) => {
    setSelectedScenario(scenario);
    setRecipientInfo({ name: recipientName, relation: recipientRelation, notes });
    setShowScenarioModal(false);
    
    // Check if photo is required for this scenario
    const scenarioRequiresPhoto = scenario !== 'handed_to_customer';
    
    if (scenarioRequiresPhoto) {
      setShowPhotoModal(true);
    } else {
      // Direct delivery to customer, no photo needed
      if (pendingStatusUpdate) {
        // Check if this is a consolidated batch delivery
        if (batchOrders && batchOrders.length > 1 && type === 'delivery') {
          // For consolidated deliveries, update all orders in the batch
          Alert.alert(
            'Update All Orders',
            `This will mark all ${batchOrders.length} orders in this batch as ${pendingStatusUpdate.label.toLowerCase()}. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Update All', 
                onPress: () => {
                  // Update all orders in the batch
                  batchOrders.forEach((batchOrder) => {
                    onStatusUpdate(batchOrder.id, pendingStatusUpdate.status);
                  });
                  setPendingStatusUpdate(null);
                }
              }
            ]
          );
        } else {
          // Single order update
          onStatusUpdate(order.id, pendingStatusUpdate.status);
          setPendingStatusUpdate(null);
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
          onPress: () => onStatusUpdate(order.id, status),
        },
      ],
    );
  };

  const customerPhone = getCustomerPhone();
  const statusOptions = getStatusUpdateOptions();

  return (
    <View style={styles.container}>
      {/* Info Button - Top Right Corner */}
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => setShowInfoModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="information" size={16} color={flatColors.neutral[600]} />
      </TouchableOpacity>

      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => onViewDetails(order)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.sequenceCircle}>
            <Text style={styles.sequenceText}>{sequenceNumber}</Text>
          </View>
          
          <View style={styles.headerInfo}>
            <View style={styles.badgeRow}>
              <View style={[
                styles.typeBadge, 
                type === 'pickup' ? styles.pickupBadge : styles.deliveryBadge
              ]}>
                <Text style={styles.typeBadgeText}>
                  {type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                </Text>
              </View>
              
              {batchOrders && batchOrders.length > 1 && (
                <View style={styles.batchBadge}>
                  <Ionicons name="layers" size={12} color={flatColors.accent.orange} />
                  <Text style={styles.batchBadgeText}>
                    {batchOrders.length} orders
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.orderNumber}>
              Order #{order.order_number || 'N/A'}
            </Text>
            
            <Text style={styles.customerName}>
              {order.customer?.name || order.customer_details?.name || 'Customer'}
            </Text>
          </View>
        </View>
        
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color={flatColors.neutral[400]} />
        </View>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Address */}
        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Ionicons name="location" size={20} color={flatColors.accent.blue} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>
              {type === 'pickup' ? 'Pickup Address' : 'Delivery Address'}
            </Text>
            <Text style={styles.infoValue}>{address}</Text>
          </View>
        </View>

        {/* Customer Phone */}
        {customerPhone && (
          <View style={styles.infoSection}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={20} color={flatColors.accent.green} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer Phone</Text>
              <Text style={styles.infoValue}>{customerPhone}</Text>
            </View>
          </View>
        )}

        {/* Package Items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Package Contents</Text>
            <View style={styles.itemsList}>
              {order.items.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                </View>
              ))}
              {order.items.length > 3 && (
                <Text style={styles.moreItemsText}>
                  +{order.items.length - 3} more items
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Special Handling */}
        {order.special_handling && (
          <View style={styles.specialSection}>
            <View style={styles.specialIcon}>
              <Ionicons name="warning" size={16} color={flatColors.accent.orange} />
            </View>
            <Text style={styles.specialText}>Special handling required</Text>
          </View>
        )}

        {/* COD Amount */}
        {order.cash_on_delivery && order.cod_amount && (
          <View style={styles.codSection}>
            <View style={styles.codIcon}>
              <Ionicons name="cash" size={16} color={flatColors.accent.green} />
            </View>
            <Text style={styles.codText}>
              COD: ${order.cod_amount}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <View style={styles.mainActions}>
          <View style={styles.leftActions}>
            {customerPhone && (
              <TouchableOpacity
                style={[styles.actionButton, styles.phoneButton]}
                onPress={() => onCallCustomer(customerPhone)}
              >
                <Ionicons name="call" size={20} style={styles.phoneButtonIcon} />
              </TouchableOpacity>
            )}
            
            {statusOptions.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  statusOptions[0].status === 'delivered' && styles.deliveredButton,
                  statusOptions[0].status === 'failed' && styles.failedButton,
                ]}
                onPress={() => handleStatusUpdate(statusOptions[0].status, statusOptions[0].label)}
                disabled={isLoading || isCheckingPhotoRequirements || isUploadingPhoto}
              >
                <Ionicons 
                  name={statusOptions[0].icon} 
                  size={20} 
                  color={
                    statusOptions[0].status === 'delivered' ? flatColors.accent.green :
                    statusOptions[0].status === 'failed' ? flatColors.accent.red :
                    flatColors.neutral[700]
                  } 
                />
                <Text style={[
                  styles.actionButtonText,
                  statusOptions[0].status === 'delivered' && styles.deliveredButtonText,
                  statusOptions[0].status === 'failed' && styles.failedButtonText,
                ]}>
                  {statusOptions[0].label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => onNavigate(order)}
          >
            <Ionicons name="navigate" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Secondary Actions - Hide failed status since it's moved to info modal */}
        {statusOptions.length > 1 && (
          <View style={styles.secondaryActions}>
            {statusOptions.slice(1).filter(option => option.status !== 'failed').map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.secondaryButton,
                  option.status === 'delivered' && styles.deliveredButton,
                ]}
                onPress={() => handleStatusUpdate(option.status, option.label)}
                disabled={isLoading || isCheckingPhotoRequirements || isUploadingPhoto}
              >
                <Ionicons 
                  name={option.icon} 
                  size={16} 
                  color={
                    option.status === 'delivered' ? flatColors.accent.green :
                    flatColors.neutral[700]
                  } 
                />
                <Text style={[
                  styles.secondaryButtonText,
                  option.status === 'delivered' && styles.deliveredButtonText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Failed</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.infoItem}>
                <Ionicons name="warning" size={20} color={flatColors.accent.orange} />
                <Text style={styles.infoText}>
                  Use "Mark as Failed" when delivery cannot be completed due to customer unavailability, 
                  incorrect address, or other delivery issues.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color={flatColors.accent.blue} />
                <Text style={styles.infoText}>
                  Before marking as failed, try calling the customer or contact support 
                  for assistance.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="headset" size={20} color={flatColors.accent.green} />
                <Text style={styles.infoText}>
                  Need help? Contact support: +1-800-SUPPORT
                </Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalFailedButton}
                onPress={() => {
                  setShowInfoModal(false);
                  handleStatusUpdate('failed', 'Mark as Failed');
                }}
              >
                <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Mark as Failed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: flatColors.accent.blue,
    ...premiumShadows.medium,
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingRight: 48,
    backgroundColor: flatColors.cards.blue.background,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sequenceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sequenceText: {
    fontSize: premiumTypography.title3.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.title3.lineHeight,
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickupBadge: {
    backgroundColor: flatColors.accent.orange,
  },
  deliveryBadge: {
    backgroundColor: flatColors.accent.green,
  },
  typeBadgeText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: flatColors.cards.yellow.background,
    borderRadius: 6,
  },
  batchBadgeText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.orange,
  },
  orderNumber: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  customerName: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
  },
  content: {
    padding: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    color: flatColors.neutral[800],
    lineHeight: 20,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    marginBottom: 8,
  },
  itemsList: {
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 12,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    flex: 1,
  },
  itemQuantity: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[500],
  },
  moreItemsText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
    fontStyle: 'italic',
    marginTop: 4,
  },
  specialSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.yellow.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  specialIcon: {
    marginRight: 8,
  },
  specialText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.accent.orange,
  },
  codSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.green.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  codIcon: {
    marginRight: 8,
  },
  codText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.accent.green,
  },
  actionSection: {
    padding: 20,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  mainActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftActions: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    backgroundColor: flatColors.neutral[100],
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  phoneButton: {
    backgroundColor: flatColors.neutral[100],
    borderColor: flatColors.neutral[200],
    flex: 0,
    width: 60,
  },
  navigateButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: flatColors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    elevation: 4,
    shadowColor: flatColors.accent.blue,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
  },
  navigateButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
  phoneButtonIcon: {
    color: flatColors.neutral[700],
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    backgroundColor: flatColors.neutral[50],
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  secondaryButtonText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...premiumShadows.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  modalTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: premiumTypography.body.medium.fontSize,
    fontWeight: premiumTypography.body.medium.fontWeight,
    lineHeight: premiumTypography.body.medium.lineHeight,
    color: flatColors.neutral[700],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    margin: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: flatColors.neutral[100],
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  modalSecondaryButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
  },
  modalFailedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    backgroundColor: flatColors.accent.red,
  },
  modalButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
  modalText: {
    fontSize: 16,
    color: flatColors.neutral[600],
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
    marginBottom: 12,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 20,
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