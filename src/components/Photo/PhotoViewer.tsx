import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Design } from '../../constants';
import { useTranslation } from 'react-i18next';

interface DeliveryPhoto {
  id: string;
  photo_url: string;
  reason: string;
  reason_display: string;
  notes?: string;
  alternate_recipient_name?: string;
  alternate_recipient_relation?: string;
  uploaded_by_name: string;
  created_at: string;
  is_verified: boolean;
  verified_by_name?: string;
  verified_at?: string;
  latitude?: number;
  longitude?: number;
}

interface PhotoViewerProps {
  visible: boolean;
  photos: DeliveryPhoto[];
  selectedPhotoIndex?: number;
  onClose: () => void;
  orderNumber?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  photos,
  selectedPhotoIndex = 0,
  onClose,
  orderNumber,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = React.useState(selectedPhotoIndex);

  React.useEffect(() => {
    setCurrentIndex(selectedPhotoIndex);
  }, [selectedPhotoIndex]);

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!currentPhoto) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.photoCounter}>
              {currentIndex + 1} / {photos.length}
            </Text>
            {orderNumber && (
              <Text style={styles.orderNumber}>Order #{orderNumber}</Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Photo */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: currentPhoto.photo_url }}
            style={styles.photo}
            resizeMode="contain"
          />

          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonLeft]}
                  onPress={handlePrevious}
                >
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
              )}
              {currentIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonRight]}
                  onPress={handleNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Info Panel */}
        <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
          {/* Reason */}
          <View style={styles.infoSection}>
            <View style={styles.reasonHeader}>
              <Ionicons name="information-circle" size={20} color={Design.colors.primary} />
              <Text style={styles.infoTitle}>{t('reason')}</Text>
            </View>
            <Text style={styles.infoValue}>{currentPhoto.reason_display}</Text>
          </View>

          {/* Verification Status */}
          {currentPhoto.is_verified && (
            <View style={styles.verificationBadge}>
              <Ionicons name="shield-checkmark" size={18} color={Design.colors.success} />
              <Text style={styles.verificationText}>
                {t('verifiedBy', { name: currentPhoto.verified_by_name })}
              </Text>
            </View>
          )}

          {/* Alternate Recipient */}
          {currentPhoto.alternate_recipient_name && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="person" size={20} color={Design.colors.primary} />
                <Text style={styles.infoTitle}>{t('alternateRecipient')}</Text>
              </View>
              <Text style={styles.infoValue}>
                {currentPhoto.alternate_recipient_name}
                {currentPhoto.alternate_recipient_relation && 
                  ` (${currentPhoto.alternate_recipient_relation})`}
              </Text>
            </View>
          )}

          {/* Notes */}
          {currentPhoto.notes && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="document-text" size={20} color={Design.colors.primary} />
                <Text style={styles.infoTitle}>{t('notes')}</Text>
              </View>
              <Text style={styles.infoValue}>{currentPhoto.notes}</Text>
            </View>
          )}

          {/* Location */}
          {currentPhoto.latitude && currentPhoto.longitude && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="location" size={20} color={Design.colors.primary} />
                <Text style={styles.infoTitle}>{t('location')}</Text>
              </View>
              <Text style={styles.infoValue}>
                {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
              </Text>
            </View>
          )}

          {/* Upload Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Ionicons name="time" size={20} color={Design.colors.primary} />
              <Text style={styles.infoTitle}>{t('uploadedAt')}</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatDate(currentPhoto.created_at)}
            </Text>
            <Text style={styles.infoSubValue}>
              {t('by')} {currentPhoto.uploaded_by_name}
            </Text>
          </View>
        </ScrollView>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    alignItems: 'center',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderNumber: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: screenWidth,
    height: screenHeight * 0.5,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: screenHeight * 0.4,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.text.secondary,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    color: Design.text.primary,
  },
  infoSubValue: {
    fontSize: 14,
    color: Design.text.secondary,
    marginTop: 4,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  verificationText: {
    fontSize: 12,
    color: Design.colors.success,
    fontWeight: '600',
    marginLeft: 6,
  },
});