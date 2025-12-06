import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType, CameraKitCamera } from 'react-native-camera-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HapticFeedback from 'react-native-haptic-feedback';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { checkCameraPermissions, requestCameraPermissions, showCameraPermissionGuide } from '../../utils/permissions';

interface InAppCameraProps {
  isVisible: boolean;
  onClose: () => void;
  onPhotoTaken: (photo: { uri: string; base64?: string }) => void;
  title?: string;
  instruction?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const InAppCamera: React.FC<InAppCameraProps> = ({
  isVisible,
  onClose,
  onPhotoTaken,
  title = 'Take Photo',
  instruction = 'Position the subject in the frame',
}) => {
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  // Check camera permission
  const checkCameraPermission = async () => {
    try {
      const isGranted = await checkCameraPermissions();
      setHasPermission(isGranted);
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    if (isRequestingPermission) return;
    
    setIsRequestingPermission(true);
    try {
      const granted = await requestCameraPermissions();
      
      if (granted) {
        setHasPermission(true);
      } else {
        setHasPermission(false);
        showCameraPermissionGuide();
      }
    } catch (error) {
      setHasPermission(false);
      Alert.alert('Error', 'Failed to request camera permission');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Take photo
  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    HapticFeedback.trigger('impactMedium');
    
    try {
      const photo = await cameraRef.current.capture();
      
      console.log('Photo captured:', photo);
      
      // The photo object from camera-kit contains uri
      if (photo && photo.uri) {
        onPhotoTaken({
          uri: photo.uri,
          base64: photo.base64,
        });
      } else {
        Alert.alert('Error', 'Failed to capture photo');
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(prev => !prev);
    HapticFeedback.trigger('impactLight');
  };

  // Check permission when component becomes visible
  useEffect(() => {
    if (isVisible) {
      checkCameraPermission();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Show permission request UI if permission is not granted
  if (hasPermission === false) {
    return (
      <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={flatColors.neutral[800]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Permission</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.centerContent}>
            <Ionicons name="camera" size={80} color={flatColors.neutral[500]} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              To take delivery photos, we need access to your camera.
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
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.cameraContainer}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cameraHeaderTitle}>{title}</Text>
          <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
            <Ionicons 
              name={flashEnabled ? "flash" : "flash-off"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {hasPermission === true ? (
          <>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              cameraType={CameraType.Back}
              flashMode={flashEnabled ? 'on' : 'off'}
              focusMode="on"
              zoomMode="off"
              torchMode={flashEnabled ? 'on' : 'off'}
              ratioOverlay="16:9"
              showFrame={false}
            />
            
            {/* Camera frame overlay */}
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              <Text style={styles.instructionText}>{instruction}</Text>
              
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePhoto}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : hasPermission === null ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={flatColors.accent.blue} />
            <Text style={styles.permissionText}>Checking camera permission...</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.primary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: flatColors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  flashButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
  },
  cameraHeaderTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: screenWidth * 0.85,
    height: screenHeight * 0.5,
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
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: premiumTypography.body.medium.fontSize,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  captureButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: premiumTypography.body.medium.fontSize,
    fontWeight: premiumTypography.body.medium.fontWeight,
    lineHeight: premiumTypography.body.medium.lineHeight,
    color: flatColors.neutral[600],
    textAlign: 'center',
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  submitButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#fff',
  },
});

export default InAppCamera;