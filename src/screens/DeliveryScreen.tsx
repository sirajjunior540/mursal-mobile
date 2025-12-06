import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Order } from '../types';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';
import { useOrders } from '../features/orders/context/OrderProvider';
import { locationService } from '../services/locationService';
import { apiService } from '../services/api';
import { InAppCamera } from '../components/Photo';
import { photoService } from '../services/photoService';
import FloatingQRButton from '../components/FloatingQRButton';

type RootStackParamList = {
  DeliveryScreen: { order: Order };
};

type DeliveryScreenRouteProp = RouteProp<RootStackParamList, 'DeliveryScreen'>;
type DeliveryScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface IssueType {
  id: string;
  label: string;
  icon: string;
  requiresNotes: boolean;
}

const ISSUE_TYPES: IssueType[] = [
  {
    id: 'customer_not_available',
    label: 'Customer Not Available',
    icon: 'person-remove',
    requiresNotes: true,
  },
  {
    id: 'wrong_address',
    label: 'Wrong Address',
    icon: 'location',
    requiresNotes: true,
  },
  {
    id: 'customer_refused',
    label: 'Customer Refused',
    icon: 'close-circle',
    requiresNotes: true,
  },
  {
    id: 'order_damaged',
    label: 'Order Damaged',
    icon: 'warning',
    requiresNotes: true,
  },
  {
    id: 'other',
    label: 'Other Issue',
    icon: 'alert-circle',
    requiresNotes: true,
  },
];

const DeliveryScreen: React.FC = () => {
  const route = useRoute<DeliveryScreenRouteProp>();
  const navigation = useNavigation<DeliveryScreenNavigationProp>();
  const { updateOrderStatus } = useOrders();

  const [order] = useState<Order>(route.params.order);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);
  const [arrivedAtDelivery, setArrivedAtDelivery] = useState(false);

  // Get customer details
  const customerName = order.customer?.name || order.customer_details?.name || 'Customer';
  const customerPhone = order.customer?.phone || order.customer_details?.phone || order.delivery_contact_phone || '';
  const deliveryAddress = order.delivery_address || 'Delivery address not available';
  const deliveryInstructions = order.delivery_instructions || order.dropoff_instructions || '';

  // Calculate distance and ETA
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        if (location && order.delivery_latitude && order.delivery_longitude) {
          setCurrentLocation({ lat: location.latitude, lng: location.longitude });

          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (order.delivery_latitude - location.latitude) * Math.PI / 180;
          const dLon = (order.delivery_longitude - location.longitude) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(location.latitude * Math.PI / 180) * Math.cos(order.delivery_latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = R * c;
          const distanceM = distanceKm * 1000;

          setDistance(distanceM);

          // Estimate time (assuming 30 km/h average speed in city)
          const timeMinutes = (distanceKm / 30) * 60;
          setEstimatedTime(Math.round(timeMinutes));

          // Check if arrived (within 100 meters)
          if (distanceM <= 100) {
            setArrivedAtDelivery(true);
          }
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [order.delivery_latitude, order.delivery_longitude]);

  // Format distance
  const formattedDistance = useMemo(() => {
    if (distance === null) return 'Calculating...';
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
  }, [distance]);

  // Format ETA
  const formattedETA = useMemo(() => {
    if (estimatedTime === null) return 'Calculating...';
    if (estimatedTime < 1) return '< 1 min';
    return `${estimatedTime} min`;
  }, [estimatedTime]);

  // Navigation handlers
  const handleStartNavigation = () => {
    if (order.delivery_latitude && order.delivery_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open navigation app');
      });
    } else {
      Alert.alert('Navigation Error', 'No delivery coordinates available');
    }
  };

  const handleCallCustomer = () => {
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`).catch(() => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  };

  const handleMessageCustomer = () => {
    if (customerPhone) {
      const message = `Hi ${customerName}, I'm your delivery driver. I'm on my way with your order #${order.order_number || order.id}.`;
      Linking.openURL(`sms:${customerPhone}?body=${encodeURIComponent(message)}`).catch(() => {
        Alert.alert('Error', 'Unable to open messaging app');
      });
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  };

  // Delivery completion handlers
  const handleArrivedAtDelivery = async () => {
    try {
      await updateOrderStatus(order.id, 'in_transit');
      setArrivedAtDelivery(true);
      Alert.alert('Success', 'Marked as arrived at delivery location');
    } catch (error) {
      Alert.alert('Error', 'Failed to update arrival status');
    }
  };

  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirm Delivery',
      'Please provide proof of delivery',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Take Photo',
          onPress: () => setShowPhotoCapture(true),
        },
      ]
    );
  };

  const handlePhotoTaken = async (photo: { uri: string; base64?: string }) => {
    setShowPhotoCapture(false);
    setIsUploadingPhoto(true);

    try {
      const location = await locationService.getCurrentLocation();

      // Upload photo
      const uploadedPhoto = await photoService.uploadDeliveryPhoto({
        deliveryId: order.id,
        photo: {
          uri: photo.uri,
          type: 'image/jpeg',
          fileName: `delivery_photo_${Date.now()}.jpg`,
          fileSize: 0,
          base64: photo.base64,
          reason: 'proof_of_delivery',
          notes: 'Delivery completed',
          latitude: location?.latitude,
          longitude: location?.longitude,
        },
      });

      // Complete delivery
      await completeDelivery(uploadedPhoto.id);
    } catch (error) {
      console.error('Delivery completion error:', error);
      Alert.alert(
        'Error',
        'Failed to complete delivery. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => setShowPhotoCapture(true),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const completeDelivery = async (photoId?: string) => {
    setIsCompletingDelivery(true);

    try {
      const location = await locationService.getCurrentLocation();

      // Update order status to delivered
      await updateOrderStatus(order.id, 'delivered', photoId);

      Alert.alert(
        'Success',
        'Delivery completed successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Delivery completion error:', error);
      Alert.alert('Error', 'Failed to complete delivery');
    } finally {
      setIsCompletingDelivery(false);
    }
  };

  // Issue reporting handlers
  const handleReportIssue = () => {
    setShowIssueModal(true);
  };

  const handleIssueSelect = (issue: IssueType) => {
    setSelectedIssue(issue);
  };

  const handleSubmitIssue = async () => {
    if (!selectedIssue) {
      Alert.alert('Error', 'Please select an issue type');
      return;
    }

    if (selectedIssue.requiresNotes && !issueNotes.trim()) {
      Alert.alert('Error', 'Please provide additional details');
      return;
    }

    setIsSubmittingIssue(true);

    try {
      const location = await locationService.getCurrentLocation();

      // Report issue via API
      await apiService.post(`/api/v1/orders/${order.id}/report-issue/`, {
        issue_type: selectedIssue.id,
        notes: issueNotes,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      Alert.alert(
        'Issue Reported',
        'Your issue has been reported. Support will contact you shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowIssueModal(false);
              setSelectedIssue(null);
              setIssueNotes('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Issue reporting error:', error);
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleQRScanResult = async (result: any) => {
    if (result.success && result.data) {
      // Verify QR code matches order
      if (result.data === order.qr_code_id) {
        await completeDelivery();
      } else {
        Alert.alert('Error', 'QR code does not match this order');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={flatColors.neutral[800]} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Deliver Order</Text>
          <Text style={styles.headerSubtitle}>#{order.order_number || order.id}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="person" size={24} color={flatColors.accent.blue} />
            </View>
            <Text style={styles.cardHeaderTitle}>Customer Information</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={flatColors.neutral[600]} />
              <Text style={styles.infoText}>{customerName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={flatColors.neutral[600]} />
              <Text style={styles.infoText}>{deliveryAddress}</Text>
            </View>

            {customerPhone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={flatColors.neutral[600]} />
                <Text style={styles.infoText}>{customerPhone}</Text>
              </View>
            ) : null}

            {deliveryInstructions ? (
              <View style={styles.instructionsBox}>
                <View style={styles.instructionsHeader}>
                  <Ionicons name="document-text" size={16} color={flatColors.accent.purple} />
                  <Text style={styles.instructionsLabel}>Delivery Instructions</Text>
                </View>
                <Text style={styles.instructionsText}>{deliveryInstructions}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ETA Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="time" size={24} color={flatColors.accent.green} />
            </View>
            <Text style={styles.cardHeaderTitle}>Delivery ETA</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.etaRow}>
              <View style={styles.etaItem}>
                <Text style={styles.etaLabel}>Distance</Text>
                <Text style={styles.etaValue}>{formattedDistance}</Text>
              </View>
              <View style={styles.etaDivider} />
              <View style={styles.etaItem}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{formattedETA}</Text>
              </View>
            </View>

            {arrivedAtDelivery && (
              <View style={styles.arrivedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
                <Text style={styles.arrivedText}>Arrived at delivery location</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Info (COD) */}
        {order.cash_on_delivery && order.cod_amount && (
          <View style={[styles.card, styles.codCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="cash" size={24} color={flatColors.accent.green} />
              </View>
              <Text style={styles.cardHeaderTitle}>Cash on Delivery</Text>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.codAmountBox}>
                <Text style={styles.codLabel}>Amount to Collect</Text>
                <Text style={styles.codAmount}>
                  {order.currency || 'SAR'} {order.cod_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleStartNavigation}>
              <View style={[styles.actionButtonIcon, { backgroundColor: flatColors.cards.blue.background }]}>
                <Ionicons name="navigate" size={24} color={flatColors.accent.blue} />
              </View>
              <Text style={styles.actionButtonText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCallCustomer}
              disabled={!customerPhone}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: flatColors.cards.green.background }]}>
                <Ionicons name="call" size={24} color={flatColors.accent.green} />
              </View>
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMessageCustomer}
              disabled={!customerPhone}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: flatColors.cards.purple.background }]}>
                <Ionicons name="chatbubble" size={24} color={flatColors.accent.purple} />
              </View>
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleReportIssue}>
              <View style={[styles.actionButtonIcon, { backgroundColor: flatColors.cards.red.background }]}>
                <Ionicons name="warning" size={24} color={flatColors.accent.red} />
              </View>
              <Text style={styles.actionButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Actions */}
        <View style={styles.deliveryActionsSection}>
          {!arrivedAtDelivery && (
            <TouchableOpacity
              style={[styles.primaryButton, distance !== null && distance > 100 && styles.disabledButton]}
              onPress={handleArrivedAtDelivery}
              disabled={distance === null || distance > 100}
            >
              <Ionicons name="location" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Arrived at Delivery</Text>
              {distance !== null && distance > 100 && (
                <Text style={styles.buttonHint}>Must be within 100m</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, !arrivedAtDelivery && styles.disabledButton]}
            onPress={handleConfirmDelivery}
            disabled={!arrivedAtDelivery || isCompletingDelivery || isUploadingPhoto}
          >
            {isCompletingDelivery || isUploadingPhoto ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating QR Button */}
      {order.qr_code_id && <FloatingQRButton onScanResult={handleQRScanResult} />}

      {/* Photo Capture Modal */}
      <InAppCamera
        isVisible={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onPhotoTaken={handlePhotoTaken}
        title="Delivery Photo"
        instruction="Take a clear photo of the delivered package"
      />

      {/* Issue Reporting Modal */}
      <Modal
        visible={showIssueModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <TouchableOpacity onPress={() => setShowIssueModal(false)}>
                <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Select Issue Type:</Text>
              {ISSUE_TYPES.map((issue) => (
                <TouchableOpacity
                  key={issue.id}
                  style={[
                    styles.issueOption,
                    selectedIssue?.id === issue.id && styles.issueOptionSelected,
                  ]}
                  onPress={() => handleIssueSelect(issue)}
                >
                  <Ionicons
                    name={issue.icon as any}
                    size={24}
                    color={selectedIssue?.id === issue.id ? flatColors.accent.blue : flatColors.neutral[600]}
                  />
                  <Text
                    style={[
                      styles.issueOptionText,
                      selectedIssue?.id === issue.id && styles.issueOptionTextSelected,
                    ]}
                  >
                    {issue.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedIssue?.requiresNotes && (
                <View style={styles.notesSection}>
                  <Text style={styles.modalLabel}>Additional Details:</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Describe the issue in detail..."
                    placeholderTextColor={flatColors.neutral[400]}
                    multiline
                    numberOfLines={4}
                    value={issueNotes}
                    onChangeText={setIssueNotes}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowIssueModal(false);
                  setSelectedIssue(null);
                  setIssueNotes('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, isSubmittingIssue && styles.disabledButton]}
                onPress={handleSubmitIssue}
                disabled={isSubmittingIssue}
              >
                {isSubmittingIssue ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit Issue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: flatColors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
    ...premiumShadows.small,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    color: flatColors.neutral[800],
  },
  headerSubtitle: {
    fontSize: premiumTypography.footnote.fontSize,
    color: flatColors.neutral[600],
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumShadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: premiumTypography.body.medium.fontSize,
    color: flatColors.neutral[700],
    marginLeft: 12,
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: flatColors.cards.purple.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: flatColors.accent.purple,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructionsLabel: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    color: flatColors.accent.purple,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  instructionsText: {
    fontSize: premiumTypography.body.medium.fontSize,
    color: flatColors.neutral[700],
    lineHeight: 20,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaItem: {
    flex: 1,
    alignItems: 'center',
  },
  etaDivider: {
    width: 1,
    height: 40,
    backgroundColor: flatColors.neutral[200],
  },
  etaLabel: {
    fontSize: premiumTypography.caption.medium.fontSize,
    color: flatColors.neutral[600],
    marginBottom: 4,
  },
  etaValue: {
    fontSize: premiumTypography.title3.fontSize,
    fontWeight: '700',
    color: flatColors.accent.green,
  },
  arrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.cards.green.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  arrivedText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    color: flatColors.accent.green,
    marginLeft: 8,
  },
  codCard: {
    borderWidth: 2,
    borderColor: flatColors.accent.green,
  },
  codAmountBox: {
    alignItems: 'center',
    padding: 16,
  },
  codLabel: {
    fontSize: premiumTypography.callout.fontSize,
    color: flatColors.neutral[600],
    marginBottom: 8,
  },
  codAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: flatColors.accent.green,
  },
  actionsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '500',
    color: flatColors.neutral[700],
    textAlign: 'center',
  },
  deliveryActionsSection: {
    padding: 20,
    paddingBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...premiumShadows.small,
  },
  primaryButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.green,
    paddingVertical: 18,
    borderRadius: 12,
    ...premiumShadows.medium,
  },
  confirmButtonText: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonHint: {
    position: 'absolute',
    bottom: -20,
    fontSize: premiumTypography.caption.small.fontSize,
    color: flatColors.neutral[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: flatColors.backgrounds.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...premiumShadows.large,
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
    color: flatColors.neutral[800],
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  issueOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  issueOptionSelected: {
    backgroundColor: flatColors.cards.blue.background,
    borderColor: flatColors.accent.blue,
  },
  issueOptionText: {
    fontSize: premiumTypography.body.medium.fontSize,
    color: flatColors.neutral[700],
    marginLeft: 12,
  },
  issueOptionTextSelected: {
    color: flatColors.accent.blue,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 16,
  },
  notesInput: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 12,
    fontSize: premiumTypography.body.medium.fontSize,
    color: flatColors.neutral[800],
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[100],
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: flatColors.neutral[100],
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  modalCancelButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[700],
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: flatColors.accent.blue,
  },
  modalSubmitButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DeliveryScreen;
