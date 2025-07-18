import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order, OrderStatus } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface OrderHistoryCardProps {
  order: Order;
  onPress: () => void;
  isExpanded?: boolean;
}

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({
  order,
  onPress,
  isExpanded = false
}) => {
  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'delivered': return flatColors.accent.green;
      case 'cancelled': return flatColors.accent.red;
      case 'in_transit': return flatColors.accent.blue;
      case 'failed': return flatColors.accent.orange;
      default: return flatColors.neutral[500];
    }
  };

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'in_transit': return 'car';
      case 'failed': return 'warning';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown date';
    
    const orderDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(orderDate.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return orderDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return orderDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const statusColor = getStatusColor(order.status || 'pending');
  const statusIcon = getStatusIcon(order.status || 'pending');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>#{order.order_number || 'N/A'}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {order.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.amount}>
            ${(order.total || 0).toFixed(2)}
          </Text>
          <Text style={styles.date}>
            {formatDate(order.created_at)}
          </Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerInfo}>
        <View style={styles.customerIcon}>
          <Ionicons name="person" size={16} color={flatColors.neutral[600]} />
        </View>
        <Text style={styles.customerName}>
          {order.customer_details?.name || order.customer?.name || 'Unknown Customer'}
        </Text>
      </View>

      {/* Delivery Address */}
      <View style={styles.addressInfo}>
        <View style={styles.addressIcon}>
          <Ionicons name="location" size={16} color={flatColors.accent.blue} />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {order.delivery_address || 'Address not available'}
        </Text>
      </View>

      {/* Special Indicators */}
      <View style={styles.indicators}>
        {order.cash_on_delivery && (
          <View style={styles.codBadge}>
            <Ionicons name="cash" size={12} color={flatColors.accent.green} />
            <Text style={styles.codText}>COD</Text>
          </View>
        )}
        
        {order.special_handling && (
          <View style={styles.specialBadge}>
            <Ionicons name="warning" size={12} color={flatColors.accent.orange} />
            <Text style={styles.specialText}>Special</Text>
          </View>
        )}
        
        {order.requires_signature && (
          <View style={styles.signatureBadge}>
            <Ionicons name="create" size={12} color={flatColors.accent.purple} />
            <Text style={styles.signatureText}>Signature</Text>
          </View>
        )}
      </View>

      {/* Expand Indicator */}
      <View style={styles.expandIndicator}>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color={flatColors.neutral[400]} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  orderNumberContainer: {
    alignSelf: 'flex-start',
  },
  orderNumber: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  amount: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  date: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  customerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    flex: 1,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  addressIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressText: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
    flex: 1,
  },
  indicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: flatColors.cards.green.background,
    borderRadius: 6,
  },
  codText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.green,
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: flatColors.cards.yellow.background,
    borderRadius: 6,
  },
  specialText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.orange,
  },
  signatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: flatColors.cards.purple.background,
    borderRadius: 6,
  },
  signatureText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.purple,
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 4,
  },
});