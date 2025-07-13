import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Camera, CameraType, CameraKitCamera } from 'react-native-camera-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HapticFeedback from 'react-native-haptic-feedback';

import { Design } from '../../constants/designSystem';
import { QRScanResult } from '../../types/tracking';
import { checkCameraPermissions, requestCameraPermissions, showCameraPermissionGuide } from '../../utils/permissions';

interface QRScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onScanResult: (result: QRScanResult) => void;
  allowManualEntry?: boolean;
  placeholder?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const QRScanner: React.FC<QRScannerProps> = ({
  isVisible,
  onClose,
  onScanResult,
  allowManualEntry = true,
  placeholder = 'Enter tracking number',
}) => {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const onReadCode = (event: any) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    HapticFeedback.trigger('notificationSuccess');
    
    const result: QRScanResult = {
      success: true,
      data: event.nativeEvent.codeStringValue,
      message: 'QR code scanned successfully',
    };
    
    onScanResult(result);
    
    // Reset processing state after a delay
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      Alert.alert('Error', 'Please enter a tracking number');
      return;
    }

    HapticFeedback.trigger('impactLight');
    
    const result: QRScanResult = {
      success: true,
      data: manualInput.trim(),
      message: 'Manual entry processed',
    };
    
    onScanResult(result);
    setManualInput('');
    setShowManualEntry(false);
  };

  const toggleFlash = () => {
    setFlashEnabled(prev => !prev);
    HapticFeedback.trigger('impactLight');
  };

  const handleClose = () => {
    setShowManualEntry(false);
    setManualInput('');
    setIsProcessing(false);
    onClose();
  };

  // Check camera permission using enhanced permissions utility
  const checkCameraPermission = async () => {
    try {
      console.log('Checking camera permission with enhanced utility');
      
      // First check with camera-kit for iOS/runtime permission
      if (Platform.OS === 'ios') {
        const isCameraAuthorized = await CameraKitCamera.checkDeviceCameraAuthorizationStatus();
        console.log('Camera-kit authorization status:', isCameraAuthorized);
        setHasPermission(isCameraAuthorized);
      } else {
        // For Android, use our enhanced permissions utility
        const isGranted = await checkCameraPermissions();
        console.log('Enhanced utility permission status:', isGranted);
        setHasPermission(isGranted);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    }
  };

  // Request camera permission using enhanced permissions utility
  const requestCameraPermission = async () => {
    if (isRequestingPermission) return;
    
    setIsRequestingPermission(true);
    try {
      console.log('Requesting camera permission with enhanced utility');
      
      let granted = false;
      
      if (Platform.OS === 'ios') {
        // For iOS, use camera-kit for runtime permission
        granted = await CameraKitCamera.requestDeviceCameraAuthorization();
      } else {
        // For Android, use our enhanced permissions utility
        granted = await requestCameraPermissions();
      }
      
      console.log('Camera permission request result:', granted);
      
      if (granted) {
        console.log('Camera permission granted');
        setHasPermission(true);
      } else {
        console.log('Camera permission denied');
        setHasPermission(false);
        
        // Show enhanced permission guide instead of simple alert
        showCameraPermissionGuide();
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setHasPermission(false);
      Alert.alert('Error', 'Failed to request camera permission');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Check permission when component becomes visible
  useEffect(() => {
    if (isVisible && !showManualEntry) {
      checkCameraPermission();
    }
  }, [isVisible, showManualEntry]);

  if (!isVisible) return null;

  if (showManualEntry) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowManualEntry(false)} style={styles.closeButton}>
              <Icon name="arrow-back" size={24} color={Design.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manual Entry</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={Design.colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.manualEntryContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tracking Number</Text>
              <TextInput
                style={styles.textInput}
                value={manualInput}
                onChangeText={setManualInput}
                placeholder={placeholder}
                placeholderTextColor={Design.colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                !manualInput.trim() && styles.submitButtonDisabled
              ]}
              onPress={handleManualSubmit}
              disabled={!manualInput.trim()}
            >
              <Text style={styles.submitButtonText}>Process</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Show permission request UI if permission is not granted
  if (hasPermission === false) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={Design.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Permission</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.centerContent}>
            <Icon name="camera-alt" size={80} color={Design.colors.textSecondary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              To scan QR codes, we need access to your camera. This allows you to quickly scan tracking numbers and other codes.
            </Text>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={requestCameraPermission}
              disabled={isRequestingPermission}
            >
              <Text style={styles.submitButtonText}>
                {isRequestingPermission ? 'Requesting...' : 'Grant Permission'}
              </Text>
            </TouchableOpacity>
            
            {allowManualEntry && (
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => setShowManualEntry(true)}
              >
                <Icon name="keyboard" size={20} color={Design.colors.primary} />
                <Text style={styles.manualEntryButtonText}>Enter Manually</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleCamera}>Scan Code</Text>
          <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
            <Icon 
              name={flashEnabled ? "flash-on" : "flash-off"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {hasPermission === true ? (
          <Camera
            style={styles.camera}
            cameraType={CameraType.Back}
            scanBarcode={true}
            onReadCode={onReadCode}
            showFrame={false}
            laserColor='transparent'
            frameColor='transparent'
            torchMode={flashEnabled ? 'on' : 'off'}
          />
        ) : hasPermission === null ? (
          <View style={styles.centerContent}>
            <Text style={styles.permissionText}>Checking camera permission...</Text>
          </View>
        ) : null}

        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.bottomControls}>
          <Text style={styles.instructionText}>
            {isProcessing ? 'Processing...' : 'Position the code within the frame'}
          </Text>
          
          {allowManualEntry && (
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => setShowManualEntry(true)}
            >
              <Icon name="keyboard" size={20} color={Design.colors.primary} />
              <Text style={styles.manualEntryButtonText}>Manual Entry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[2],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  closeButton: {
    padding: Design.spacing[1],
  },
  flashButton: {
    padding: Design.spacing[1],
  },
  headerTitle: {
    fontSize: Design.typography.h4.fontSize,
    fontWeight: '600',
    color: Design.colors.text,
  },
  headerTitleCamera: {
    fontSize: Design.typography.h4.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 32,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[6],
    alignItems: 'center',
  },
  instructionText: {
    fontSize: Design.typography.body.fontSize,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Design.spacing[4],
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.surface,
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
  },
  manualEntryButtonText: {
    fontSize: Design.typography.body.fontSize,
    color: Design.colors.primary,
    fontWeight: '600',
    marginLeft: Design.spacing[1],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[6],
  },
  permissionTitle: {
    fontSize: Design.typography.h3.fontSize,
    fontWeight: '600',
    color: Design.colors.text,
    marginTop: Design.spacing[4],
    marginBottom: Design.spacing[2],
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Design.typography.body.fontSize,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Design.typography.body.lineHeight,
    marginBottom: Design.spacing[6],
  },
  manualEntryContent: {
    flex: 1,
    paddingHorizontal: Design.spacing[6],
    paddingTop: Design.spacing[6],
  },
  inputContainer: {
    marginBottom: Design.spacing[6],
  },
  inputLabel: {
    fontSize: Design.typography.body.fontSize,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[2],
  },
  textInput: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.borderRadius.md,
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[2],
    fontSize: Design.typography.body.fontSize,
    color: Design.colors.text,
    backgroundColor: Design.colors.surface,
  },
  submitButton: {
    backgroundColor: Design.colors.primary,
    paddingVertical: Design.spacing[4],
    borderRadius: Design.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Design.colors.textSecondary,
  },
  submitButtonText: {
    fontSize: Design.typography.body.fontSize,
    fontWeight: '600',
    color: Design.colors.surface,
  },
});

export default QRScanner;