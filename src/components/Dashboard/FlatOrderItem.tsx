import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OrderItemProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const FlatOrderItem: React.FC<OrderItemProps> = ({
  order,
  onPress,
  showChevron = true,
  chevronColor = flatColors.neutral[400],
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: flatColors.status.pending.primary,
          background: flatColors.status.pending.secondary,
          icon: 'time-outline',
        };
      case 'accepted':
      case 'assigned':
        return {
          color: flatColors.primary[500],
          background: flatColors.primary[50],
          icon: 'checkmark-circle-outline',
        };
      case 'picked_up':
        return {
          color: flatColors.accent.purple,
          background: flatColors.cards.purple.background,
          icon: 'cube-outline',
        };
      case 'in_transit':
        return {
          color: flatColors.accent.blue,
          background: flatColors.cards.blue.background,
          icon: 'car-outline',
        };
      case 'delivered':
        return {
          color: flatColors.status.success.primary,
          background: flatColors.status.success.secondary,
          icon: 'checkmark-done-circle',
        };
      default:
        return {
          color: flatColors.neutral[400],
          background: flatColors.neutral[100],
          icon: 'ellipse-outline',
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const statusConfig = getStatusConfig(order.status);

  // Determine if this is warehouse consolidation
  const isWarehouseConsolidation = order.is_consolidated || 
                                  order.current_batch?.is_consolidated || 
                                  order.consolidation_warehouse_address ||
                                  order.delivery_address_info?.is_warehouse ||
                                  order.warehouse_info?.consolidate_to_warehouse ||
                                  order.current_batch?.warehouse_info?.consolidate_to_warehouse ||
                                  false;

  // Get the appropriate delivery address
  const getDeliveryAddress = () => {
    if (isWarehouseConsolidation) {
      // Check various warehouse address sources
      if (order.consolidation_warehouse_address) {
        return order.consolidation_warehouse_address;
      }
      if (order.warehouse_info?.warehouse_address) {
        return order.warehouse_info.warehouse_address;
      }
      if (order.delivery_address_info?.is_warehouse && order.delivery_address_info?.address) {
        return order.delivery_address_info.address;
      }
      if (order.current_batch?.warehouse_info?.warehouse_address) {
        return order.current_batch.warehouse_info.warehouse_address;
      }
      if (order.current_batch?.delivery_address_info?.is_warehouse && order.current_batch?.delivery_address_info?.address) {
        return order.current_batch.delivery_address_info.address;
      }
      // Fallback: if marked as consolidated but no specific warehouse address
      if (order.delivery_address) {
        return order.delivery_address;
      }
    }
    return order.delivery_address || 'Address not provided';
  };

  const deliveryAddress = getDeliveryAddress();

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.background }]}>
              <Ionicons 
                name={statusConfig.icon} 
                size={24} 
                color={statusConfig.color} 
              />
            </View>
            
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber} numberOfLines={1}>
                #{order.order_number || order.id.slice(-8)}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {order.customer_name || 'Customer'}
              </Text>
              <View style={styles.addressContainer}>
                {isWarehouseConsolidation && (
                  <Ionicons name="business" size={12} color={flatColors.accent.purple} style={styles.warehouseIcon} />
                )}
                <Text style={[styles.deliveryAddress, isWarehouseConsolidation && styles.warehouseAddress]} numberOfLines={1}>
                  {isWarehouseConsolidation ? `Warehouse: ${deliveryAddress}` : deliveryAddress}
                </Text>
              </View>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={flatColors.neutral[400]} />
                <Text style={styles.orderTime}>
                  {formatTime(order.created_at)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            <View style={styles.badges}>
              {order.cash_on_delivery && (
                <View style={styles.codBadge}>
                  <Ionicons name="cash" size={14} color={flatColors.accent.green} />
                  <Text style={styles.codAmount}>
                    ${Number(order.cod_amount || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              
              {order.special_handling && (
                <View style={styles.specialBadge}>
                  <Ionicons name="warning" size={12} color={flatColors.status.warning.primary} />
                </View>
              )}
            </View>
            
            {showChevron && (
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.statusBar}>
          <View style={[styles.statusBarFill, { backgroundColor: statusConfig.color }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 6,
  },
  card: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumShadows.soft,
    borderWidth: 1,
    borderColor: flatColors.neutral[100],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...premiumShadows.subtle,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    ...premiumTypography.body.large,
    color: flatColors.neutral[800],
    fontWeight: '700',
    marginBottom: 2,
  },
  customerName: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[600],
    marginBottom: 4,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTime: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[400],
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  deliveryAddress: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[500],
    fontWeight: '500',
    flex: 1,
  },
  warehouseAddress: {
    color: flatColors.accent.purple,
    fontWeight: '600',
  },
  warehouseIcon: {
    marginRight: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.green.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  codAmount: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.green,
    fontWeight: '700',
  },
  specialBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: flatColors.cards.yellow.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.neutral[50],
  },
  statusBar: {
    height: 3,
    backgroundColor: flatColors.neutral[100],
  },
  statusBarFill: {
    height: '100%',
    width: '100%',
  },
});