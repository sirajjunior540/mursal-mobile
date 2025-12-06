import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Haptics from 'react-native-haptic-feedback';

import { QRScannerModal } from './QRScanner/QRScannerModal';
import { verifyPickupQR, manualPickupConfirmation, PickupVerificationResult } from '../services/pickupVerificationService';

interface PickupQRVerificationProps {
  visible: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSuccess: (result: PickupVerificationResult) => void;
  onError?: (error: string) => void;
}

export const PickupQRVerification: React.FC<PickupQRVerificationProps> = ({
  visible,
  orderId,
  orderNumber,
  onClose,
  onSuccess,
  onError,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showManualOption, setShowManualOption] = useState(false);

  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;

  const handleOpenScanner = useCallback(() => {
    Haptics.trigger('impactLight');
    setShowScanner(true);
    setVerificationStatus('idle');
    setErrorMessage('');
  }, []);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  const handleClose = useCallback(() => {
    setShowScanner(false);
    setVerificationStatus('idle');
    setErrorMessage('');
    setFailedAttempts(0);
    setShowManualOption(false);
    onClose();
  }, [onClose]);

  const parseQRCodeData = useCallback((data: string): { orderId: string; type: string } | null => {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(data);
      if (parsed.order_id && parsed.type === 'pickup') {
        return { orderId: parsed.order_id, type: 'pickup' };
      }
      if (parsed.order_id) {
        return { orderId: parsed.order_id, type: 'unknown' };
      }
    } catch {
      // Not JSON, try simple format
      // Check if it's just an order number
      const cleanData = data.trim();
      if (cleanData === orderNumber || cleanData === orderId) {
        return { orderId: cleanData, type: 'simple' };
      }

      // Check if it matches pattern like "ORDER123" or "ORD123"
      if (cleanData.match(/^(ORD|ORDER)?\d+$/i)) {
        const extractedNumber = cleanData.replace(/^(ORD|ORDER)/i, '');
        if (extractedNumber === orderNumber) {
          return { orderId: extractedNumber, type: 'simple' };
        }
      }
    }
    return null;
  }, [orderId, orderNumber]);

  const showSuccessAnimation = useCallback(() => {
    Haptics.trigger('notificationSuccess');
    setVerificationStatus('success');

    Animated.sequence([
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(successScaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successScaleAnim]);

  const showErrorAnimation = useCallback(() => {
    Haptics.trigger('notificationError');
    setVerificationStatus('error');

    Animated.sequence([
      Animated.timing(errorShakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [errorShakeAnim]);

  const handleQRScan = useCallback(async (qrData: string) => {
    console.log('[PickupQRVerification] QR Code scanned:', qrData);

    setShowScanner(false);
    setIsVerifying(true);

    try {
      // Parse QR code data
      const parsedData = parseQRCodeData(qrData);

      if (!parsedData) {
        throw new Error('Invalid QR code format');
      }

      // Validate that QR code matches expected order
      if (parsedData.orderId !== orderId && parsedData.orderId !== orderNumber) {
        throw new Error(`Wrong order QR code. Expected order ${orderNumber}, but scanned order ${parsedData.orderId}`);
      }

      // Verify with backend
      const result = await verifyPickupQR(qrData, orderId);

      if (result.success) {
        showSuccessAnimation();

        // Wait for animation to complete before calling success callback
        setTimeout(() => {
          onSuccess(result);
          handleClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Verification failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      console.error('[PickupQRVerification] Verification error:', message);

      setErrorMessage(message);
      showErrorAnimation();

      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      // Show manual option after 2 failed attempts
      if (newFailedAttempts >= 2) {
        setShowManualOption(true);
      }

      if (onError) {
        onError(message);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [orderId, orderNumber, failedAttempts, parseQRCodeData, showSuccessAnimation, showErrorAnimation, onSuccess, onError, handleClose]);

  const handleManualConfirmation = useCallback(async () => {
    Alert.alert(
      'Manual Pickup Confirmation',
      'Confirm that you have picked up the order from the merchant?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsVerifying(true);

            try {
              const result = await manualPickupConfirmation(
                orderId,
                `Manual confirmation after ${failedAttempts} failed QR scan attempts`
              );

              if (result.success) {
                showSuccessAnimation();

                setTimeout(() => {
                  onSuccess(result);
                  handleClose();
                }, 2000);
              } else {
                throw new Error(result.message || 'Manual confirmation failed');
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Manual confirmation failed';
              console.error('[PickupQRVerification] Manual confirmation error:', message);

              Alert.alert('Error', message);

              if (onError) {
                onError(message);
              }
            } finally {
              setIsVerifying(false);
            }
          },
        },
      ]
    );
  }, [orderId, failedAttempts, showSuccessAnimation, onSuccess, onError, handleClose]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Pickup Verification</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <Ionicons name="qr-code-outline" size={80} color="#FF6B00" />
                </View>

                <Text style={styles.title}>Scan Pickup QR Code</Text>
                <Text style={styles.subtitle}>
                  Scan the QR code on the order receipt from the merchant to verify pickup
                </Text>

                <View style={styles.orderInfo}>
                  <Text style={styles.orderLabel}>Order Number:</Text>
                  <Text style={styles.orderNumber}>{orderNumber}</Text>
                </View>

                {/* Error Message */}
                {verificationStatus === 'error' && errorMessage && (
                  <Animated.View
                    style={[
                      styles.errorContainer,
                      { transform: [{ translateX: errorShakeAnim }] }
                    ]}
                  >
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </Animated.View>
                )}

                {/* Success Message */}
                {verificationStatus === 'success' && (
                  <Animated.View
                    style={[
                      styles.successContainer,
                      { transform: [{ scale: successScaleAnim }] }
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                    <Text style={styles.successText}>Pickup Verified!</Text>
                  </Animated.View>
                )}

                {/* Buttons */}
                {verificationStatus !== 'success' && (
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton]}
                      onPress={handleOpenScanner}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
                          <Text style={styles.buttonText}>Scan QR Code</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {showManualOption && (
                      <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleManualConfirmation}
                        disabled={isVerifying}
                      >
                        <Ionicons name="checkmark-outline" size={24} color="#FF6B00" />
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                          Manual Confirmation
                        </Text>
                      </TouchableOpacity>
                    )}

                    {failedAttempts > 0 && !showManualOption && (
                      <Text style={styles.attemptsText}>
                        Failed attempts: {failedAttempts}/2
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showScanner}
        onClose={handleCloseScanner}
        onScanSuccess={handleQRScan}
        onScanError={(error) => {
          console.error('[PickupQRVerification] QR scan error:', error);
          setShowScanner(false);
          Alert.alert('Scan Error', error);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  orderLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B00',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#FF6B00',
  },
  attemptsText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
});
