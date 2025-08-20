import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface OrderActionMenuProps {
  onMarkAsFailed?: () => void;
  supportPhone?: string;
  buttonStyle?: any;
}

export const OrderActionMenu: React.FC<OrderActionMenuProps> = ({
  onMarkAsFailed,
  supportPhone = '+1-800-SUPPORT',
  buttonStyle,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleMarkAsFailed = () => {
    setShowInfoModal(false);
    if (onMarkAsFailed) {
      onMarkAsFailed();
    }
  };

  return (
    <>
      {/* Info Button */}
      <TouchableOpacity 
        style={[styles.infoButton, buttonStyle]}
        onPress={() => setShowInfoModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="information" size={16} color={flatColors.neutral[600]} />
      </TouchableOpacity>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Failed</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.infoItem}>
                <Ionicons name="warning" size={20} color={flatColors.accent.orange} />
                <Text style={styles.infoText}>
                  Use "Mark as Failed" when delivery cannot be completed due to customer unavailability, 
                  incorrect address, or other delivery issues.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color={flatColors.accent.blue} />
                <Text style={styles.infoText}>
                  Before marking as failed, try calling the customer or contact support 
                  for assistance.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="headset" size={20} color={flatColors.accent.green} />
                <Text style={styles.infoText}>
                  Need help? Contact support: {supportPhone}
                </Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalFailedButton}
                onPress={handleMarkAsFailed}
              >
                <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Mark as Failed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '90%',
    ...premiumShadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  modalTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[900],
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: premiumTypography.body.medium.fontSize,
    fontWeight: premiumTypography.body.medium.fontWeight,
    lineHeight: premiumTypography.body.medium.lineHeight,
    color: flatColors.neutral[700],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.secondary,
    borderWidth: 1,
    borderColor: flatColors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
  },
  modalFailedButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: flatColors.accent.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...premiumShadows.subtle,
  },
  modalButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
});