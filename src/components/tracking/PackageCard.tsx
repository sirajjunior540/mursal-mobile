import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { designSystem } from '../../constants/designSystem';
import { CarrierShipment, ShipmentStatus } from '../../types/tracking';

interface PackageCardProps {
  shipment: CarrierShipment;
  onPress?: () => void;
  onQRScan?: () => void;
  onStatusUpdate?: (status: ShipmentStatus) => void;
  showActions?: boolean;
  compact?: boolean;
}

const PackageCard: React.FC<PackageCardProps> = ({
  shipment,
  onPress,
  onQRScan,
  onStatusUpdate,
  showActions = true,
  compact = false,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const getCarrierIcon = () => {
    const { carrier_type, carrier_code } = shipment.carrier;

    if (carrier_type === 'ocean_freight') {
      return 'directions-boat';
    }

    switch (carrier_code.toUpperCase()) {
      case 'DHL':
      case 'FEDEX':
      case 'UPS':
      case 'ARAMEX':
        return 'flight-takeoff';
      default:
        return 'local-shipping';
    }
  };

  const getStatusColor = (status: ShipmentStatus): string => {
    switch (status) {
      case 'delivered':
        return designSystem.colors.success;
      case 'in_transit':
        return designSystem.colors.primary;
      case 'out_for_delivery':
        return designSystem.colors.warning;
      case 'exception':
        return designSystem.colors.error;
      default:
        return designSystem.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: ShipmentStatus): string => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getProgressPercentage = (): number => {
    switch (shipment.current_status) {
      case 'created': return 10;
      case 'booked': return 25;
      case 'collected': return 40;
      case 'in_transit': return 60;
      case 'customs_clearance': return 75;
      case 'out_for_delivery': return 90;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  const handlePress = () => {
    HapticFeedback.trigger('impactLight');
    
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  const handleQRScan = () => {
    HapticFeedback.trigger('impactMedium');
    onQRScan?.();
  };

  const handleStatusUpdate = () => {
    const nextStatuses: Record<ShipmentStatus, ShipmentStatus> = {
      created: 'collected',
      booked: 'collected',
      collected: 'in_transit',
      in_transit: 'out_for_delivery',
      customs_clearance: 'out_for_delivery',
      out_for_delivery: 'delivered',
      delivered: 'delivered',
      exception: 'in_transit',
    };

    const nextStatus = nextStatuses[shipment.current_status];
    if (nextStatus && nextStatus !== shipment.current_status) {
      Alert.alert(
        'Update Status',
        `Update package status to "${getStatusLabel(nextStatus)}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => {
              HapticFeedback.trigger('notificationSuccess');
              onStatusUpdate?.(nextStatus);
            },
          },
        ]
      );
    }
  };

  const progressPercentage = getProgressPercentage();

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
      <TouchableOpacity
        style={[styles.card, compact && styles.cardCompact]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.carrierInfo}>
            <View style={[styles.iconContainer, { backgroundColor: designSystem.colors.primary }]}>
              <Icon 
                name={getCarrierIcon()} 
                size={compact ? 20 : 24} 
                color="#fff" 
              />
            </View>
            <View style={styles.carrierText}>
              <Text style={[styles.carrierName, compact && styles.textCompact]}>
                {shipment.carrier.carrier_name}
              </Text>
              <Text style={[styles.trackingNumber, compact && styles.textSmallCompact]}>
                {shipment.tracking_number}
              </Text>
            </View>
          </View>
          
          {showActions && (
            <TouchableOpacity
              style={styles.qrButton}
              onPress={handleQRScan}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="qr-code-scanner" size={compact ? 20 : 24} color={designSystem.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.current_status) }]}>
            <Text style={styles.statusText}>
              {getStatusLabel(shipment.current_status)}
            </Text>
          </View>
          <Text style={[styles.progressText, compact && styles.textSmallCompact]}>
            {progressPercentage}%
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: getStatusColor(shipment.current_status),
                },
              ]}
            />
          </View>
        </View>

        {/* Customer Info */}
        {shipment.order?.customer && !compact && (
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {shipment.order.customer.first_name} {shipment.order.customer.last_name}
            </Text>
            <Text style={styles.orderNumber}>
              Order: {shipment.order.order_number}
            </Text>
          </View>
        )}

        {/* Location & ETA */}
        <View style={styles.locationContainer}>
          {shipment.current_location && (
            <View style={styles.locationRow}>
              <Icon name="location-on" size={14} color={designSystem.colors.textSecondary} />
              <Text style={[styles.location, compact && styles.textSmallCompact]} numberOfLines={1}>
                {shipment.current_location}
              </Text>
            </View>
          )}
          {shipment.estimated_delivery_date && (
            <Text style={[styles.eta, compact && styles.textSmallCompact]}>
              ETA: {new Date(shipment.estimated_delivery_date).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Action Button */}
        {showActions && shipment.current_status !== 'delivered' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getStatusColor(shipment.current_status) }]}
            onPress={handleStatusUpdate}
          >
            <Text style={styles.actionButtonText}>
              Update Status
            </Text>
          </TouchableOpacity>
        )}

        {/* Service Type */}
        <Text style={[styles.serviceType, compact && styles.textSmallCompact]}>
          {shipment.service_type}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: designSystem.spacing.medium,
    marginVertical: designSystem.spacing.small,
  },
  card: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.borderRadius.large,
    padding: designSystem.spacing.medium,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  cardCompact: {
    padding: designSystem.spacing.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing.small,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierText: {
    marginLeft: designSystem.spacing.small,
    flex: 1,
  },
  carrierName: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
    lineHeight: designSystem.typography.lineHeights.medium,
  },
  trackingNumber: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    lineHeight: designSystem.typography.lineHeights.small,
  },
  qrButton: {
    padding: designSystem.spacing.xsmall,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing.small,
  },
  statusBadge: {
    paddingHorizontal: designSystem.spacing.small,
    paddingVertical: designSystem.spacing.xsmall,
    borderRadius: designSystem.borderRadius.small,
  },
  statusText: {
    fontSize: designSystem.typography.sizes.xsmall,
    fontWeight: '600',
    color: designSystem.colors.surface,
  },
  progressText: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: designSystem.spacing.medium,
  },
  progressBar: {
    height: 6,
    backgroundColor: designSystem.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  customerInfo: {
    marginBottom: designSystem.spacing.small,
  },
  customerName: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '500',
    color: designSystem.colors.textPrimary,
    lineHeight: designSystem.typography.lineHeights.medium,
  },
  orderNumber: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    lineHeight: designSystem.typography.lineHeights.small,
  },
  locationContainer: {
    marginBottom: designSystem.spacing.small,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing.xsmall,
  },
  location: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    lineHeight: designSystem.typography.lineHeights.small,
    marginLeft: designSystem.spacing.xsmall,
    flex: 1,
  },
  eta: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.primary,
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: designSystem.spacing.small,
    borderRadius: designSystem.borderRadius.medium,
    alignItems: 'center',
    marginTop: designSystem.spacing.small,
  },
  actionButtonText: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '600',
    color: designSystem.colors.surface,
  },
  serviceType: {
    fontSize: designSystem.typography.sizes.xsmall,
    color: designSystem.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: designSystem.spacing.small,
    textAlign: 'right',
  },
  textCompact: {
    fontSize: designSystem.typography.sizes.small,
  },
  textSmallCompact: {
    fontSize: designSystem.typography.sizes.xsmall,
  },
});

export default PackageCard;