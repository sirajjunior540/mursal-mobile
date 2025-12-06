import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Haptics from 'react-native-haptic-feedback';

import QRScanner from './tracking/QRScanner';
import { QRScanResult } from '../types/tracking';

interface FloatingQRButtonProps {
  onScanResult?: (result: QRScanResult) => void;
  style?: object;
  bottom?: number;
  right?: number;
}

const FloatingQRButton: React.FC<FloatingQRButtonProps> = ({
  onScanResult,
  style,
  bottom = 100,
  right = 20,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    Haptics.trigger('impactMedium');
    
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowScanner(true);
  };

  const handleScanResult = (result: QRScanResult) => {
    setShowScanner(false);
    
    if (result.success) {
      Haptics.trigger('notificationSuccess');
      // QR Scan Result received
      
      // Handle the QR code result
      if (onScanResult) {
        onScanResult(result);
      } else {
        // Default behavior - could show an alert or navigate somewhere
        // QR Code scanned successfully
      }
    } else {
      Haptics.trigger('notificationError');
      // QR Scan failed
    }
  };

  const handleClose = () => {
    setShowScanner(false);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            bottom,
            right,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B00', '#1D4ED8']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />
          </LinearGradient>
          
          {/* Pulse animation ring */}
          <View style={styles.pulseRing} />
        </TouchableOpacity>
        
        {/* Optional label */}
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Scan QR</Text>
        </View>
      </Animated.View>

      <QRScanner
        isVisible={showScanner}
        onClose={handleClose}
        onScanResult={handleScanResult}
        allowManualEntry={true}
        placeholder="Enter tracking code or order number"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FF6B00',
    opacity: 0.3,
    top: 0,
    left: 0,
  },
  labelContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FloatingQRButton;