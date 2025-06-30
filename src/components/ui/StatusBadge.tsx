import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../design/theme';

export type OrderStatus = 
  | 'pending' 
  | 'assigned'
  | 'accepted'
  | 'en_route_to_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'en_route_to_delivery'
  | 'arrived_at_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'base' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'base' }) => {
  const statusConfig = getStatusConfig(status);
  
  return (
    <View style={[
      styles.badge,
      styles[size],
      { backgroundColor: statusConfig.backgroundColor }
    ]}>
      <View style={[styles.dot, { backgroundColor: statusConfig.color }]} />
      <Text style={[
        styles.text,
        styles[`${size}Text`],
        { color: statusConfig.color }
      ]}>
        {statusConfig.label}
      </Text>
    </View>
  );
};

const getStatusConfig = (status: OrderStatus) => {
  const configs = {
    pending: {
      label: 'Pending',
      color: theme.colors.warning[600],
      backgroundColor: theme.colors.warning[50],
    },
    assigned: {
      label: 'Assigned',
      color: theme.colors.info[600],
      backgroundColor: theme.colors.info[50],
    },
    accepted: {
      label: 'Accepted',
      color: theme.colors.success[600],
      backgroundColor: theme.colors.success[50],
    },
    en_route_to_pickup: {
      label: 'En Route to Pickup',
      color: theme.colors.primary[600],
      backgroundColor: theme.colors.primary[50],
    },
    arrived_at_pickup: {
      label: 'At Pickup',
      color: theme.colors.warning[600],
      backgroundColor: theme.colors.warning[50],
    },
    picked_up: {
      label: 'Picked Up',
      color: theme.colors.success[600],
      backgroundColor: theme.colors.success[50],
    },
    en_route_to_delivery: {
      label: 'En Route',
      color: theme.colors.primary[600],
      backgroundColor: theme.colors.primary[50],
    },
    arrived_at_delivery: {
      label: 'At Customer',
      color: theme.colors.warning[600],
      backgroundColor: theme.colors.warning[50],
    },
    delivered: {
      label: 'Delivered',
      color: theme.colors.success[600],
      backgroundColor: theme.colors.success[50],
    },
    failed: {
      label: 'Failed',
      color: theme.colors.error[600],
      backgroundColor: theme.colors.error[50],
    },
    cancelled: {
      label: 'Cancelled',
      color: theme.colors.neutral[600],
      backgroundColor: theme.colors.neutral[100],
    },
  };

  return configs[status] || configs.pending;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: theme.spacing[2],
  },
  
  text: {
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  // Sizes
  sm: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  
  base: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  
  lg: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  
  // Text sizes
  smText: {
    fontSize: theme.typography.fontSize.xs,
  },
  
  baseText: {
    fontSize: theme.typography.fontSize.sm,
  },
  
  lgText: {
    fontSize: theme.typography.fontSize.base,
  },
});

export default StatusBadge;