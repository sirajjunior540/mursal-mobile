import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import styles from './QRScannerModal.styles';
import { SafeAreaView } from 'react-native-safe-area-context';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
  onScanError,
}) => {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      checkCameraPermission();
      // Reset scanning state when modal opens
      scannedRef.current = false;
      setIsScanning(true);
      setIsProcessing(false);
    }
  }, [visible]);

  const checkCameraPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await check(permission);
      
      if (result === RESULTS.GRANTED) {
        setHasPermission(true);
      } else if (result === RESULTS.DENIED) {
        requestCameraPermission();
      } else if (result === RESULTS.BLOCKED) {
        setHasPermission(false);
        showPermissionAlert();
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setHasPermission(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      setHasPermission(result === RESULTS.GRANTED);
      
      if (result !== RESULTS.GRANTED) {
        showPermissionAlert();
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      t('qrScanner.permissionRequired'),
      t('qrScanner.permissionMessage'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: onClose },
        { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
      ],
    );
  };

  const handleBarCodeRead = (event: any) => {
    // Prevent multiple scans
    if (scannedRef.current || !isScanning || isProcessing) {
      return;
    }

    const { data } = event.nativeEvent?.codeStringValue ? { data: event.nativeEvent.codeStringValue } : event;
    
    if (data) {
      scannedRef.current = true;
      setIsProcessing(true);
      setIsScanning(false);

      // Haptic feedback for successful scan
      if (Platform.OS === 'ios') {
        // iOS haptic feedback would go here
      }

      // Small delay to show processing state
      setTimeout(() => {
        onScanSuccess(data);
      }, 300);
    }
  };

  const handleClose = () => {
    scannedRef.current = false;
    setIsScanning(true);
    setIsProcessing(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('qrScanner.title')}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {hasPermission === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={styles.loadingText}>{t('qrScanner.checkingPermission')}</Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.permissionDeniedContainer}>
              <Ionicons name="camera-off" size={64} color="#666666" />
              <Text style={styles.permissionDeniedText}>
                {t('qrScanner.permissionDenied')}
              </Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.settingsButtonText}>{t('common.openSettings')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Camera
                style={styles.camera}
                cameraType={CameraType.Back}
                scanBarcode={isScanning}
                onReadCode={handleBarCodeRead}
                showFrame={false}
              />
              
              {/* Scanning Overlay */}
              <View style={styles.overlay}>
                {/* Top overlay */}
                <View style={styles.overlayTop} />
                
                {/* Middle section with scanning area */}
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  
                  {/* Scanning Frame */}
                  <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                    
                    {isProcessing && (
                      <View style={styles.processingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.overlaySide} />
                </View>
                
                {/* Bottom overlay with instructions */}
                <View style={styles.overlayBottom}>
                  <Text style={styles.instructionText}>
                    {isProcessing ? t('qrScanner.processing') : t('qrScanner.instruction')}
                  </Text>
                  {!isProcessing && (
                    <Text style={styles.subInstructionText}>
                      {t('qrScanner.subInstruction')}
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};