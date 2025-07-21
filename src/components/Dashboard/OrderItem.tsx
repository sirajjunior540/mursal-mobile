import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OrderItemProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';

export const OrderItem: React.FC<OrderItemProps> = ({
  order,
  onPress,
  showChevron = true,
  chevronColor = Design.colors.textSecondary,
}) => {
  const getStatusColor = (status: string) => {
    return dashboardColors.orderStatus[status as keyof typeof dashboardColors.orderStatus] || Design.colors.textSecondary;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'picked_up':
        return 'cube-outline';
      case 'in_transit':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-done-circle';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.orderContent}>
        <View style={styles.orderLeft}>
          <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
            <Ionicons 
              name={getStatusIcon(order.status)} 
              size={20} 
              color={getStatusColor(order.status)} 
            />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              Order #{order.order_number || order.id.slice(-8)}
            </Text>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customer_name || 'Customer'}
            </Text>
            <Text style={styles.orderTime}>
              {formatTime(order.created_at)}
            </Text>
          </View>
        </View>
        <View style={styles.orderRight}>
          {order.cash_on_delivery && (
            <View style={styles.codBadge}>
              <Ionicons name="cash" size={14} color="#00D2D3" />
              <Text style={styles.codAmount}>${Number(order.cod_amount || 0).toFixed(2)}</Text>
            </View>
          )}
          {showChevron && (
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[3],
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  orderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Design.spacing[4],
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    ...Design.typography.body,
    color: Design.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerName: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  orderTime: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[3],
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2D315',
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.sm,
    gap: 4,
  },
  codAmount: {
    ...Design.typography.caption,
    color: '#00D2D3',
    fontWeight: '600',
  },
});