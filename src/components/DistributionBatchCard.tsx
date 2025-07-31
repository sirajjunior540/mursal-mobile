import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { DistributionBatch } from '../types/distribution.types';
import { Design, Colors } from '../constants';
import { distributionService } from '../services/distributionService';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DistributionBatchCardProps {
  distribution: DistributionBatch;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

export const DistributionBatchCard: React.FC<DistributionBatchCardProps> = ({
  distribution,
  onPress,
  onAccept,
  onDecline,
  showActions = false,
}) => {
  const { t } = useTranslation();
  
  const getStatusIcon = () => {
    if (distributionService.isNetworkTransfer(distribution)) {
      return 'truck-delivery';
    }
    
    switch (distribution.distribution_type) {
      case 'express':
        return 'flash';
      case 'scheduled':
        return 'calendar-clock';
      default:
        return 'package-variant';
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDistanceDisplay = () => {
    if (distribution.estimated_distance) {
      return `${distribution.estimated_distance.toFixed(1)} km`;
    }
    return null;
  };

  const getDurationDisplay = () => {
    if (distribution.estimated_duration) {
      const hours = Math.floor(distribution.estimated_duration / 60);
      const minutes = distribution.estimated_duration % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
            <Icon name={getStatusIcon()} size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.distributionId}>{distribution.distribution_id}</Text>
            <Text style={styles.distributionType}>
              {distributionService.formatDistributionType(distribution)}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: distributionService.getStatusColor(distribution.status) }
            ]}
          />
          <Text style={styles.statusText}>{t(distribution.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Icon name="package-variant-closed" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailText}>
            {distribution.total_packages} {t('packages')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="weight" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailText}>
            {distribution.total_weight} kg
          </Text>
        </View>

        {distribution.total_volume > 0 && (
          <View style={styles.detailRow}>
            <Icon name="cube-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {distribution.total_volume} m³
            </Text>
          </View>
        )}
      </View>

      <View style={styles.locationSection}>
        <View style={styles.locationItem}>
          <Icon name="map-marker" size={18} color={Colors.primary} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>{t('from')}</Text>
            <Text style={styles.locationText}>{distribution.warehouse_name}</Text>
          </View>
        </View>

        {distributionService.isNetworkTransfer(distribution) && (
          <>
            <Icon name="arrow-right" size={16} color={Colors.textSecondary} style={styles.arrow} />
            <View style={styles.locationItem}>
              <Icon name="map-marker-check" size={18} color={Colors.success} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>{t('to')}</Text>
                <Text style={styles.locationText}>{distribution.target_warehouse_name}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.scheduleSection}>
        <View style={styles.scheduleItem}>
          <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.scheduleText}>
            {t('scheduled')}: {formatScheduledTime(distribution.scheduled_departure)}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          {getDistanceDisplay() && (
            <View style={styles.metricItem}>
              <Icon name="map-marker-distance" size={14} color={Colors.textSecondary} />
              <Text style={styles.metricText}>{getDistanceDisplay()}</Text>
            </View>
          )}
          
          {getDurationDisplay() && (
            <View style={styles.metricItem}>
              <Icon name="timer-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metricText}>{getDurationDisplay()}</Text>
            </View>
          )}
        </View>
      </View>

      {showActions && distribution.status === 'ready_for_dispatch' && (
        <>
          <View style={styles.divider} />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
            >
              <Icon name="close" size={20} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                {t('decline')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
            >
              <Icon name="check" size={20} color={Colors.white} />
              <Text style={[styles.actionButtonText, { color: Colors.white }]}>
                {t('accept')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {distribution.notes && (
        <>
          <View style={styles.divider} />
          <View style={styles.notesSection}>
            <Icon name="note-text-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.notesText}>{distribution.notes}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Design.borderRadius.large,
    marginHorizontal: Design.spacing.medium,
    marginVertical: Design.spacing.small,
    ...Design.shadow.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Design.spacing.medium,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Design.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing.small,
  },
  headerInfo: {
    flex: 1,
  },
  distributionId: {
    fontSize: Design.fontSize.medium,
    fontWeight: Design.fontWeight.bold,
    color: Colors.text,
  },
  distributionType: {
    fontSize: Design.fontSize.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing.small,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: Design.borderRadius.small,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: Design.fontSize.xsmall,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Design.spacing.medium,
  },
  details: {
    flexDirection: 'row',
    paddingHorizontal: Design.spacing.medium,
    paddingVertical: Design.spacing.small,
    gap: Design.spacing.medium,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: Design.fontSize.small,
    color: Colors.textSecondary,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing.medium,
    paddingVertical: Design.spacing.small,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  locationInfo: {
    marginLeft: Design.spacing.xsmall,
    flex: 1,
  },
  locationLabel: {
    fontSize: Design.fontSize.xsmall,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: Design.fontSize.small,
    color: Colors.text,
    marginTop: 2,
  },
  arrow: {
    marginHorizontal: Design.spacing.small,
  },
  scheduleSection: {
    paddingHorizontal: Design.spacing.medium,
    paddingVertical: Design.spacing.small,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: Design.fontSize.small,
    color: Colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Design.spacing.medium,
    marginTop: Design.spacing.xsmall,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: Design.fontSize.xsmall,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: Design.spacing.medium,
    gap: Design.spacing.small,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing.small,
    borderRadius: Design.borderRadius.medium,
    gap: Design.spacing.xsmall,
  },
  declineButton: {
    backgroundColor: Colors.error + '10',
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: Design.fontSize.small,
    fontWeight: Design.fontWeight.medium,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Design.spacing.medium,
    gap: Design.spacing.xsmall,
  },
  notesText: {
    fontSize: Design.fontSize.small,
    color: Colors.textSecondary,
    flex: 1,
  },
});