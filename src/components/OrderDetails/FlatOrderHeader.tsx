import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OrderHeaderProps } from '../../types/orderDetails.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface StatusBadgeProps {
  status?: string;
}

interface BatchTypeBadgeProps {
  type: 'distribution' | 'consolidated';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'delivered': return flatColors.accent.green;
      case 'cancelled': 
      case 'failed': return flatColors.accent.red;
      case 'in_transit': 
      case 'assigned': return flatColors.accent.blue;
      case 'pending': return flatColors.accent.orange;
      default: return flatColors.neutral[500];
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'cancelled': 
      case 'failed': return 'close-circle';
      case 'in_transit': return 'car';
      case 'assigned': return 'person';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
      <Ionicons name={getStatusIcon()} size={14} color={statusColor} />
      <Text style={[styles.statusText, { color: statusColor }]}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </Text>
    </View>
  );
};

const BatchTypeBadge: React.FC<BatchTypeBadgeProps> = ({ type }) => {
  const isDistribution = type === 'distribution';
  const backgroundColor = isDistribution ? flatColors.cards.blue.background : flatColors.cards.purple.background;
  const textColor = isDistribution ? flatColors.accent.blue : flatColors.accent.purple;
  
  return (
    <View style={[styles.batchTypeBadge, { backgroundColor }]}>
      <Ionicons 
        name={isDistribution ? 'git-branch' : 'layers'} 
        size={14} 
        color={textColor}
      />
      <Text style={[styles.batchTypeText, { color: textColor }]}>
        {isDistribution ? 'DISTRIBUTION' : 'CONSOLIDATED'}
      </Text>
    </View>
  );
};

export const FlatOrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onClose,
  title = 'Order Details',
  isBatchView = false,
  batchType = null,
  orderCount = 1,
}) => {
  if (!order) return null;
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={isBatchView ? 'layers' : 'cube-outline'} 
              size={24} 
              color={flatColors.accent.blue}
            />
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {isBatchView && (
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle}>
                  {orderCount} orders • {order.currency || 'SAR'} {order.total_amount?.toFixed(2) || '0.00'}
                </Text>
              </View>
            )}
            {!isBatchView && order.order_number && (
              <Text style={styles.orderNumber}>
                Order #{order.order_number}
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={onClose} 
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={flatColors.neutral[600]} />
        </TouchableOpacity>
      </View>
      
      {/* Status and Badges */}
      <View style={styles.badgesContainer}>
        <StatusBadge status={order.status} />
        {batchType && <BatchTypeBadge type={batchType} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  subtitleRow: {
    marginTop: 2,
  },
  subtitle: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
  },
  orderNumber: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    letterSpacing: 0.5,
  },
  batchTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  batchTypeText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    letterSpacing: 0.5,
  },
});