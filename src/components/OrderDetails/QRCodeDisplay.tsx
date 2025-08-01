import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

const { width: screenWidth } = Dimensions.get('window');

interface QRCodeDisplayProps {
  visible: boolean;
  qrCodeUrl?: string;
  qrCodeId?: string;
  orderNumber?: string;
  onClose: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  visible,
  qrCodeUrl,
  qrCodeId,
  orderNumber,
  onClose,
}) => {
  const handleShare = async () => {
    try {
      const message = `Package QR Code\nOrder: ${orderNumber || 'Unknown'}\nQR ID: ${qrCodeId || 'Unknown'}`;
      
      if (Platform.OS === 'ios') {
        await Share.share({
          message,
          url: qrCodeUrl || '',
        });
      } else {
        await Share.share({
          message: `${message}\n${qrCodeUrl || ''}`,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const handleSave = () => {
    Alert.alert(
      'Save QR Code',
      'QR code saving functionality would be implemented here. The QR code can be saved to the device gallery.',
      [{ text: 'OK' }]
    );
  };

  if (!qrCodeUrl && !qrCodeId) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="qr-code" size={24} color={flatColors.primary[500]} />
              </View>
              <Text style={styles.title}>Package QR Code</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={flatColors.neutral[800]} />
            </TouchableOpacity>
          </View>

          {/* QR Code Image */}
          <View style={styles.qrContainer}>
            {qrCodeUrl ? (
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.qrImage, styles.qrPlaceholder]}>
                <Ionicons name="qr-code-outline" size={120} color={flatColors.neutral[300]} />
                <Text style={styles.placeholderText}>QR Code Not Available</Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Number</Text>
              <Text style={styles.infoValue}>{orderNumber || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>QR Code ID</Text>
              <Text style={[styles.infoValue, styles.monospace]}>{qrCodeId || 'N/A'}</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <Ionicons name="information-circle" size={16} color={flatColors.icons.info} />
              <Text style={styles.instructionText}>
                This QR code is used to track the package throughout delivery
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={flatColors.primary[500]} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]} 
              onPress={handleSave}
            >
              <Ionicons name="download-outline" size={20} color={flatColors.backgrounds.primary} />
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                Save to Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    width: screenWidth - 32,
    maxWidth: 400,
    padding: 24,
    ...premiumShadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: flatColors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    ...premiumTypography.heading3,
    color: flatColors.neutral[800],
  },
  closeButton: {
    padding: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  qrPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: flatColors.neutral[300],
    borderStyle: 'dashed',
  },
  placeholderText: {
    ...premiumTypography.body2,
    color: flatColors.neutral[600],
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    ...premiumTypography.caption,
    color: flatColors.neutral[600],
  },
  infoValue: {
    ...premiumTypography.body2,
    color: flatColors.neutral[800],
    fontWeight: '500',
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  instructionsContainer: {
    backgroundColor: flatColors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionText: {
    ...premiumTypography.caption,
    color: flatColors.icons.info,
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.primary[500],
    backgroundColor: flatColors.backgrounds.primary,
  },
  primaryButton: {
    backgroundColor: flatColors.primary[500],
    borderColor: flatColors.primary[500],
  },
  actionButtonText: {
    ...premiumTypography.button,
    color: flatColors.primary[500],
    marginLeft: 8,
  },
  primaryButtonText: {
    color: flatColors.backgrounds.primary,
  },
});