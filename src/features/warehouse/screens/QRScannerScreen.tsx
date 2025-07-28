/**
 * QR Scanner Screen for Warehouse Staff
 * Handles package scanning and handoff verification
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from '../../../shared/components/Button/Button';
import { theme } from '../../../shared/styles/theme';
import { warehouseAPI } from '../../../services/api/warehouseAPI';
import Haptics from 'react-native-haptic-feedback';

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13'],
    onCodeScanned: async (codes) => {
      if (!isScanning || isProcessing) return;
      
      const code = codes[0];
      if (code.value && code.value !== lastScannedCode) {
        setLastScannedCode(code.value);
        setIsScanning(false);
        
        // Haptic feedback on successful scan
        Haptics.trigger('impactMedium');
        
        await processScannedCode(code.value);
      }
    },
  });

  const processScannedCode = async (code: string) => {
    setIsProcessing(true);
    
    try {
      // Try to parse as JSON (for QR codes)
      let handoffData;
      try {
        handoffData = JSON.parse(code);
      } catch {
        // If not JSON, treat as handoff code
        handoffData = { handoff_code: code };
      }
      
      // Verify handoff
      const response = await warehouseAPI.verifyHandoff(handoffData.handoff_code);
      setScanResult(response.data);
      
      // Navigate to handoff details
      navigation.replace('HandoffDetails' as never, { 
        handoffId: response.data.id,
        fromScanner: true 
      } as never);
      
    } catch (error: any) {
      Alert.alert(
        'Invalid Code',
        error.response?.data?.message || 'The scanned code is not valid. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsScanning(true);
              setLastScannedCode('');
            },
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    navigation.navigate('ManualHandoffEntry' as never);
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to scan QR codes
          </Text>
          <Button
            title="Go Back"
            variant="primary"
            size="medium"
            onPress={() => navigation.goBack()}
            style={styles.permissionButton}
          />
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Camera not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      
      {/* Header Overlay */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Button
          variant="text"
          size="small"
          icon={<Ionicons name="arrow-back" size={24} color={theme.colors.white} />}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Scan Package</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Scanning Frame */}
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        
        <Text style={styles.instructionText}>
          {isProcessing ? 'Processing...' : 'Point camera at QR code'}
        </Text>
      </View>
      
      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Enter Code Manually"
          variant="outline"
          size="medium"
          icon={<Ionicons name="keypad-outline" size={20} />}
          onPress={handleManualEntry}
          style={styles.manualButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: theme.colors.white,
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
  instructionText: {
    marginTop: theme.spacing.xl,
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: theme.spacing.lg,
  },
  manualButton: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  permissionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    minWidth: 150,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default QRScannerScreen;