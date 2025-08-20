import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Design } from '../../constants';
import { useTranslation } from 'react-i18next';
import { DeliveryPhotoReason } from '../../types';

interface PhotoCaptureProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCapture: (photo: PhotoCaptureResult) => void;
  requiredReasons?: string[];
  allowedReasons?: string[];
  deliveryId: string;
  orderNumber?: string;
}

export interface PhotoCaptureResult {
  uri: string;
  type: string;
  fileName: string;
  fileSize: number;
  base64?: string;
  reason: string;
  notes: string;
  alternateRecipientName?: string;
  alternateRecipientRelation?: string;
  latitude?: number;
  longitude?: number;
}

const PHOTO_REASONS = [
  { value: DeliveryPhotoReason.NO_SIGNATURE, label: 'No Customer Signature', icon: 'create-outline' },
  { value: DeliveryPhotoReason.ALTERNATE_RECIPIENT, label: 'Alternate Recipient', icon: 'person-outline' },
  { value: DeliveryPhotoReason.LEFT_AT_DOOR, label: 'Left at Door', icon: 'home-outline' },
  { value: DeliveryPhotoReason.DELIVERY_ISSUE, label: 'Delivery Issue', icon: 'warning-outline' },
  { value: DeliveryPhotoReason.CUSTOMER_REFUSED, label: 'Customer Refused', icon: 'close-circle-outline' },
  { value: DeliveryPhotoReason.COMPANY_POLICY, label: 'Company Policy', icon: 'shield-checkmark-outline' },
  { value: DeliveryPhotoReason.CUSTOMER_REQUEST, label: 'Customer Request', icon: 'person-circle-outline' },
  { value: DeliveryPhotoReason.PROOF_OF_DELIVERY, label: 'Proof of Delivery', icon: 'checkmark-circle-outline' },
  { value: DeliveryPhotoReason.DAMAGED_PACKAGE, label: 'Package Damaged', icon: 'alert-circle-outline' },
  { value: DeliveryPhotoReason.OTHER, label: 'Other Reason', icon: 'ellipsis-horizontal-outline' },
];

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  visible,
  onClose,
  onPhotoCapture,
  requiredReasons = [],
  allowedReasons = [],
  deliveryId,
  orderNumber,
}) => {
  const { t } = useTranslation();
  const [capturedPhoto, setCapturedPhoto] = useState<ImagePickerResponse | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [alternateRecipientName, setAlternateRecipientName] = useState<string>('');
  const [alternateRecipientRelation, setAlternateRecipientRelation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get available reasons
  const availableReasons = allowedReasons.length > 0
    ? PHOTO_REASONS.filter(r => allowedReasons.includes(r.value))
    : PHOTO_REASONS;

  // Camera options
  const cameraOptions: CameraOptions = {
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    saveToPhotos: false,
  };

  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    includeBase64: true,
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Handle camera capture
  const handleCameraCapture = useCallback(() => {
    launchCamera(cameraOptions, (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }
      setCapturedPhoto(response);
      getCurrentLocation();
    });
  }, [cameraOptions, getCurrentLocation]);

  // Handle library selection
  const handleLibrarySelection = useCallback(() => {
    launchImageLibrary(libraryOptions, (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }
      setCapturedPhoto(response);
      getCurrentLocation();
    });
  }, [libraryOptions, getCurrentLocation]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!capturedPhoto?.assets?.[0]) {
      Alert.alert(t('error'), t('pleaseCapturPhoto'));
      return;
    }

    if (!selectedReason) {
      Alert.alert(t('error'), t('pleaseSelectReason'));
      return;
    }

    if (selectedReason === DeliveryPhotoReason.ALTERNATE_RECIPIENT && !alternateRecipientName) {
      Alert.alert(t('error'), t('pleaseEnterRecipientName'));
      return;
    }

    const asset = capturedPhoto.assets[0];
    const result: PhotoCaptureResult = {
      uri: asset.uri!,
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `delivery_${deliveryId}_${Date.now()}.jpg`,
      fileSize: asset.fileSize || 0,
      base64: asset.base64,
      reason: selectedReason,
      notes,
      ...(selectedReason === DeliveryPhotoReason.ALTERNATE_RECIPIENT && {
        alternateRecipientName,
        alternateRecipientRelation,
      }),
      ...(currentLocation && {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }),
    };

    setIsSubmitting(true);
    onPhotoCapture(result);
    
    // Reset state
    setTimeout(() => {
      setIsSubmitting(false);
      setCapturedPhoto(null);
      setSelectedReason('');
      setNotes('');
      setAlternateRecipientName('');
      setAlternateRecipientRelation('');
    }, 500);
  }, [
    capturedPhoto,
    selectedReason,
    notes,
    alternateRecipientName,
    alternateRecipientRelation,
    currentLocation,
    deliveryId,
    onPhotoCapture,
    t,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    if (capturedPhoto) {
      Alert.alert(
        t('discardPhoto'),
        t('areYouSureDiscardPhoto'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('discard'),
            style: 'destructive',
            onPress: () => {
              setCapturedPhoto(null);
              setSelectedReason('');
              setNotes('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  }, [capturedPhoto, onClose, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Design.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('deliveryPhoto')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {orderNumber && (
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Order #{orderNumber}</Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            {capturedPhoto?.assets?.[0] ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: capturedPhoto.assets[0].uri }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setCapturedPhoto(null)}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retakeText}>{t('retake')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCameraCapture}
                >
                  <View style={styles.captureIconContainer}>
                    <Ionicons name="camera" size={32} color={Design.colors.primary} />
                  </View>
                  <Text style={styles.captureButtonText}>{t('takePhoto')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleLibrarySelection}
                >
                  <View style={styles.captureIconContainer}>
                    <Ionicons name="images" size={32} color={Design.colors.primary} />
                  </View>
                  <Text style={styles.captureButtonText}>{t('chooseFromGallery')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Reason Selection */}
          {capturedPhoto && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('selectReason')} *</Text>
                <View style={styles.reasonGrid}>
                  {availableReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason.value && styles.reasonButtonSelected,
                        requiredReasons.includes(reason.value) && styles.reasonButtonRequired,
                      ]}
                      onPress={() => setSelectedReason(reason.value)}
                    >
                      <Ionicons
                        name={reason.icon as any}
                        size={24}
                        color={
                          selectedReason === reason.value
                            ? '#fff'
                            : Design.colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason.value && styles.reasonTextSelected,
                        ]}
                      >
                        {t(reason.label)}
                      </Text>
                      {requiredReasons.includes(reason.value) && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>{t('required')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Alternate Recipient Fields */}
              {selectedReason === DeliveryPhotoReason.ALTERNATE_RECIPIENT && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('recipientDetails')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('recipientName')}
                    value={alternateRecipientName}
                    onChangeText={setAlternateRecipientName}
                    placeholderTextColor={Design.text.secondary}
                  />
                  <TextInput
                    style={[styles.input, styles.inputMarginTop]}
                    placeholder={t('relationToCustomer')}
                    value={alternateRecipientRelation}
                    onChangeText={setAlternateRecipientRelation}
                    placeholderTextColor={Design.text.secondary}
                  />
                </View>
              )}

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('additionalNotes')}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder={t('enterNotes')}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={Design.text.secondary}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>{t('submitPhoto')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Design.text.primary,
  },
  orderInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Design.colors.primary + '10',
  },
  orderNumber: {
    fontSize: 14,
    color: Design.colors.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    margin: 16,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  captureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  captureButton: {
    alignItems: 'center',
    padding: 16,
  },
  captureIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Design.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  captureButtonText: {
    fontSize: 14,
    color: Design.colors.primary,
    fontWeight: '500',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.text.primary,
    marginBottom: 12,
  },
  reasonGrid: {
    gap: 12,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Design.colors.border,
    backgroundColor: '#fff',
  },
  reasonButtonSelected: {
    backgroundColor: Design.colors.primary,
    borderColor: Design.colors.primary,
  },
  reasonButtonRequired: {
    borderColor: Design.colors.warning,
    borderWidth: 2,
  },
  reasonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Design.text.primary,
  },
  reasonTextSelected: {
    color: '#fff',
  },
  requiredBadge: {
    backgroundColor: Design.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  requiredText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Design.text.primary,
    backgroundColor: '#fff',
  },
  inputMarginTop: {
    marginTop: 12,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});