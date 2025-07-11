import React, { useState } from 'react';
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
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HapticFeedback from 'react-native-haptic-feedback';

import { Design } from '../../constants/designSystem';
import { QRScanResult } from '../../types/tracking';

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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128', 'code-39'],
    onCodeScanned: (codes) => {
      if (isProcessing) return;
      
      const code = codes[0];
      if (code?.value) {
        setIsProcessing(true);
        HapticFeedback.trigger('notificationSuccess');
        
        const result: QRScanResult = {
          success: true,
          data: code.value,
          message: 'QR code scanned successfully',
        };
        
        onScanResult(result);
        
        // Reset processing state after a delay
        setTimeout(() => {
          setIsProcessing(false);
        }, 2000);
      }
    }
  });

  React.useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permission = await Camera.requestCameraPermission();
        setHasPermission(permission === 'granted');
      } catch (error) {
        console.error('Camera permission error:', error);
        setHasPermission(false);
      }
    };

    if (isVisible) {
      checkPermissions();
    }
  }, [isVisible]);

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

  if (!isVisible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={Design.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Access</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.centerContent}>
            <Icon name="camera-alt" size={64} color={Design.colors.textSecondary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Please grant camera access to scan QR codes and barcodes.
            </Text>
            
            {allowManualEntry && (
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => setShowManualEntry(true)}
              >
                <Text style={styles.manualEntryButtonText}>Manual Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

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

        {device && (
          <Camera
            style={styles.camera}
            device={device}
            isActive={isVisible && !isProcessing}
            codeScanner={codeScanner}
            torch={flashEnabled ? 'on' : 'off'}
          />
        )}

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