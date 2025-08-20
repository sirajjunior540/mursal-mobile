import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { PhotoViewer } from '../Photo';
import { photoService } from '../../services/photoService';
import { useTranslation } from 'react-i18next';

interface OrderPhotosSectionProps {
  orderId: string;
  orderNumber?: string;
}

export const OrderPhotosSection: React.FC<OrderPhotosSectionProps> = ({
  orderId,
  orderNumber,
}) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [orderId]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const deliveryPhotos = await photoService.getDeliveryPhotos(orderId);
      setPhotos(deliveryPhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoPress = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoViewer(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={flatColors.primary} />
      </View>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const getReasonIcon = (reason: string) => {
    const iconMap: Record<string, string> = {
      'no_signature': 'create-outline',
      'alternate_recipient': 'person-outline',
      'left_at_door': 'home-outline',
      'delivery_issue': 'warning-outline',
      'customer_refused': 'close-circle-outline',
      'company_policy': 'shield-checkmark-outline',
      'customer_request': 'person-circle-outline',
      'proof_of_delivery': 'checkmark-circle-outline',
      'damaged_package': 'alert-circle-outline',
      'other': 'ellipsis-horizontal-outline',
    };
    return iconMap[reason] || 'camera-outline';
  };

  const getReasonColor = (reason: string) => {
    const colorMap: Record<string, string> = {
      'no_signature': flatColors.accent.orange,
      'alternate_recipient': flatColors.accent.blue,
      'left_at_door': flatColors.accent.purple,
      'delivery_issue': flatColors.accent.red,
      'customer_refused': flatColors.accent.red,
      'damaged_package': flatColors.accent.red,
      'proof_of_delivery': flatColors.accent.green,
      'company_policy': flatColors.primary,
      'customer_request': flatColors.accent.blue,
      'other': flatColors.text.secondary,
    };
    return colorMap[reason] || flatColors.primary;
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="images" size={20} color={flatColors.primary} />
            <Text style={styles.title}>{t('deliveryPhotos')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{photos.length}</Text>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
        >
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoCard}
              onPress={() => handlePhotoPress(index)}
            >
              <Image 
                source={{ uri: photo.photo_url }} 
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoInfo}>
                <View style={[styles.reasonBadge, { backgroundColor: getReasonColor(photo.reason) + '15' }]}>
                  <Ionicons 
                    name={getReasonIcon(photo.reason)} 
                    size={14} 
                    color={getReasonColor(photo.reason)} 
                  />
                  <Text style={[styles.reasonText, { color: getReasonColor(photo.reason) }]}>
                    {photo.reason_display}
                  </Text>
                </View>
                {photo.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={flatColors.accent.green} />
                  </View>
                )}
              </View>
              <Text style={styles.photoDate}>
                {new Date(photo.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {photos.some(p => p.notes) && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{t('photoNotes')}:</Text>
            {photos.filter(p => p.notes).map((photo) => (
              <View key={photo.id} style={styles.noteItem}>
                <Ionicons 
                  name={getReasonIcon(photo.reason)} 
                  size={16} 
                  color={getReasonColor(photo.reason)} 
                />
                <Text style={styles.noteText}>{photo.notes}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <PhotoViewer
        visible={showPhotoViewer}
        photos={photos}
        selectedPhotoIndex={selectedPhotoIndex}
        onClose={() => setShowPhotoViewer(false)}
        orderNumber={orderNumber}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.surface,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
  },
  loadingContainer: {
    backgroundColor: flatColors.surface,
    marginTop: 12,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...premiumTypography.bodyLarge,
    color: flatColors.text.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: flatColors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    ...premiumTypography.bodySmall,
    color: flatColors.primary,
    fontWeight: '600',
  },
  photosScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  photoCard: {
    marginRight: 12,
    width: 120,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: flatColors.background,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: '90%',
  },
  reasonText: {
    ...premiumTypography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: flatColors.accent.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDate: {
    ...premiumTypography.caption,
    color: flatColors.text.secondary,
    fontSize: 11,
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: flatColors.border,
  },
  notesTitle: {
    ...premiumTypography.bodyMedium,
    color: flatColors.text.secondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  noteText: {
    ...premiumTypography.bodySmall,
    color: flatColors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
});