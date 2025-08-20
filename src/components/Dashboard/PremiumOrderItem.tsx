import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OrderItemProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const PremiumOrderItem: React.FC<OrderItemProps> = ({
  order,
  onPress,
  showChevron = true,
  chevronColor = premiumColors.neutral[400],
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: premiumColors.status.pending.primary,
          background: premiumColors.status.pending.secondary,
          icon: 'time-outline',
        };
      case 'accepted':
      case 'assigned':
        return {
          color: premiumColors.primary[500],
          background: premiumColors.primary[50],
          icon: 'checkmark-circle-outline',
        };
      case 'picked_up':
        return {
          color: premiumColors.gradients.royal[0],
          background: premiumColors.primary[50],
          icon: 'cube-outline',
        };
      case 'in_transit':
        return {
          color: premiumColors.gradients.ocean[0],
          background: premiumColors.primary[50],
          icon: 'car-outline',
        };
      case 'delivered':
        return {
          color: premiumColors.status.success.primary,
          background: premiumColors.status.success.secondary,
          icon: 'checkmark-done-circle',
        };
      default:
        return {
          color: premiumColors.neutral[400],
          background: premiumColors.neutral[100],
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
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={premiumColors.neutral[400]} />
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
                  <Ionicons name="cash" size={14} color={premiumColors.gradients.emerald[0]} />
                  <Text style={styles.codAmount}>
                    ${Number(order.cod_amount || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              
              {order.special_handling && (
                <View style={styles.specialBadge}>
                  <Ionicons name="warning" size={12} color={premiumColors.status.warning.primary} />
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
          <LinearGradient
            colors={[statusConfig.color, `${statusConfig.color}66`]}
            style={styles.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumShadows.soft,
    borderWidth: 1,
    borderColor: premiumColors.neutral[100],
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
    color: premiumColors.neutral[800],
    fontWeight: '700',
    marginBottom: 2,
  },
  customerName: {
    ...premiumTypography.body.medium,
    color: premiumColors.neutral[600],
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
    color: premiumColors.neutral[400],
    fontWeight: '500',
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
    backgroundColor: `${premiumColors.gradients.emerald[0]}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  codAmount: {
    ...premiumTypography.caption.medium,
    color: premiumColors.gradients.emerald[0],
    fontWeight: '700',
  },
  specialBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${premiumColors.status.warning.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: premiumColors.neutral[50],
  },
  statusBar: {
    height: 3,
    backgroundColor: premiumColors.neutral[100],
  },
  statusGradient: {
    height: '100%',
    width: '100%',
  },
});