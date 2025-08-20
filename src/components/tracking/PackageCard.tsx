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

import { Design } from '../../constants/designSystem';
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
        return Design.colors.success;
      case 'in_transit':
        return Design.colors.primary;
      case 'out_for_delivery':
        return Design.colors.warning;
      case 'exception':
        return Design.colors.error;
      default:
        return Design.colors.textSecondary;
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
            <View style={[styles.iconContainer, { backgroundColor: Design.colors.primary }]}>
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
              <Icon name="qr-code-scanner" size={compact ? 20 : 24} color={Design.colors.primary} />
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
              <Icon name="location-on" size={14} color={Design.colors.textSecondary} />
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
    marginHorizontal: Design.spacing[4],
    marginVertical: Design.spacing[2],
  },
  card: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  cardCompact: {
    padding: Design.spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[2],
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
    marginLeft: Design.spacing[2],
    flex: 1,
  },
  carrierName: {
    fontSize: Design.typography.body.fontSize,
    fontWeight: '600',
    color: Design.colors.textPrimary,
    lineHeight: Design.typography.body.lineHeight,
  },
  trackingNumber: {
    fontSize: Design.typography.bodySmall.fontSize,
    color: Design.colors.textSecondary,
    lineHeight: Design.typography.bodySmall.lineHeight,
  },
  qrButton: {
    padding: Design.spacing[1],
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[2],
  },
  statusBadge: {
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.sm,
  },
  statusText: {
    fontSize: Design.typography.caption.fontSize,
    fontWeight: '600',
    color: Design.colors.surface,
  },
  progressText: {
    fontSize: Design.typography.bodySmall.fontSize,
    color: Design.colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: Design.spacing[4],
  },
  progressBar: {
    height: 6,
    backgroundColor: Design.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  customerInfo: {
    marginBottom: Design.spacing[2],
  },
  customerName: {
    fontSize: Design.typography.body.fontSize,
    fontWeight: '500',
    color: Design.colors.textPrimary,
    lineHeight: Design.typography.body.lineHeight,
  },
  orderNumber: {
    fontSize: Design.typography.bodySmall.fontSize,
    color: Design.colors.textSecondary,
    lineHeight: Design.typography.bodySmall.lineHeight,
  },
  locationContainer: {
    marginBottom: Design.spacing[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[1],
  },
  location: {
    fontSize: Design.typography.bodySmall.fontSize,
    color: Design.colors.textSecondary,
    lineHeight: Design.typography.bodySmall.lineHeight,
    marginLeft: Design.spacing[1],
    flex: 1,
  },
  eta: {
    fontSize: Design.typography.bodySmall.fontSize,
    color: Design.colors.primary,
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
    alignItems: 'center',
    marginTop: Design.spacing[2],
  },
  actionButtonText: {
    fontSize: Design.typography.body.fontSize,
    fontWeight: '600',
    color: Design.colors.surface,
  },
  serviceType: {
    fontSize: Design.typography.caption.fontSize,
    color: Design.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Design.spacing[2],
    textAlign: 'right',
  },
  textCompact: {
    fontSize: Design.typography.bodySmall.fontSize,
  },
  textSmallCompact: {
    fontSize: Design.typography.caption.fontSize,
  },
});

export default PackageCard;