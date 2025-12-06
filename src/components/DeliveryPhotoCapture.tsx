import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { InAppCamera } from './Photo';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';

interface DeliveryPhotoCaptureProps {
  visible: boolean;
  onClose: () => void;
  onPhotoTaken: (photo: { uri: string; base64?: string }) => void;
  title?: string;
  instruction?: string;
  deliveryType?: 'contactless' | 'in-person' | 'left-at-door';
}

export const DeliveryPhotoCapture: React.FC<DeliveryPhotoCaptureProps> = ({
  visible,
  onClose,
  onPhotoTaken,
  title = 'Delivery Photo',
  instruction = 'Take a photo of the delivered package',
  deliveryType = 'in-person',
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{ uri: string; base64?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handlePhotoTaken = (photo: { uri: string; base64?: string }) => {
    setShowCamera(false);
    setCapturedPhoto(photo);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setShowCamera(true);
  };

  const handleConfirm = async () => {
    if (!capturedPhoto) {
      Alert.alert('Error', 'No photo captured');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate compression/processing
      await new Promise(resolve => setTimeout(resolve, 500));
      onPhotoTaken(capturedPhoto);
      setCapturedPhoto(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to process photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    onClose();
  };

  const getInstructionByType = () => {
    switch (deliveryType) {
      case 'contactless':
        return 'Take a photo showing the package left at the door or safe location';
      case 'left-at-door':
        return 'Take a photo of the package at the delivery location';
      case 'in-person':
      default:
        return instruction;
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {!capturedPhoto ? (
              <>
                {/* Camera Icon */}
                <View style={styles.iconContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="camera" size={48} color={flatColors.accent.blue} />
                  </View>
                </View>

                {/* Instructions */}
                <Text style={styles.instructionTitle}>Photo Required</Text>
                <Text style={styles.instructionText}>{getInstructionByType()}</Text>

                {/* Tips */}
                <View style={styles.tipsContainer}>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
                    <Text style={styles.tipText}>Make sure the package is clearly visible</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
                    <Text style={styles.tipText}>Use good lighting for a clear photo</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
                    <Text style={styles.tipText}>Include the delivery location if possible</Text>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.primaryButton} onPress={handleOpenCamera}>
                  <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Open Camera</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Photo Preview */}
                <View style={styles.previewContainer}>
                  <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
                  <View style={styles.previewOverlay}>
                    <View style={styles.previewBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
                      <Text style={styles.previewBadgeText}>Photo Captured</Text>
                    </View>
                  </View>
                </View>

                {/* Preview Actions */}
                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                    <Ionicons name="camera" size={20} color={flatColors.accent.blue} />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmButton, isProcessing && styles.disabledButton]}
                    onPress={handleConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.confirmButtonText}>Confirm & Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* File Size Info */}
                <Text style={styles.infoText}>Photo will be compressed to under 500KB</Text>
              </>
            )}
          </View>

          {/* Cancel Button */}
          {!capturedPhoto && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Camera Modal */}
      <InAppCamera
        isVisible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        title={title}
        instruction={getInstructionByType()}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...premiumShadows.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  headerTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    color: flatColors.neutral[800],
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: premiumTypography.body.medium.fontSize,
    color: flatColors.neutral[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: premiumTypography.footnote.fontSize,
    color: flatColors.neutral[700],
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    ...premiumShadows.small,
  },
  primaryButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[600],
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: flatColors.neutral[100],
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 12,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...premiumShadows.small,
  },
  previewBadgeText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    color: flatColors.accent.green,
    marginLeft: 6,
  },
  previewActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  retakeButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.accent.blue,
    marginLeft: 6,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.green,
    paddingVertical: 14,
    borderRadius: 12,
    ...premiumShadows.small,
  },
  confirmButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    color: flatColors.neutral[500],
    textAlign: 'center',
  },
});
