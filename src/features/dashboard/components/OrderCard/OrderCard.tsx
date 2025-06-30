/**
 * Enhanced OrderCard component with accessibility and performance optimizations
 */
import React, { memo, useCallback, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Haptics from 'react-native-haptic-feedback';
import { Order, OrderStatus } from '../../../../shared/types';
import { theme } from '../../../../shared/styles/theme';
import Card from '../../../../shared/components/Card/Card';
import StatusBadge from '../../../../shared/components/StatusBadge/StatusBadge';
import Button from '../../../../shared/components/Button/Button';
import { createOrderCardStyles } from './OrderCard.styles';

interface OrderCardProps {
  order: Order;
  index: number;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onPress?: (orderId: string) => void;
  isLoading?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = memo(({
  order,
  index,
  onAccept,
  onDecline,
  onPress,
  isLoading = false,
}) => {
  const styles = createOrderCardStyles(theme);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entry animation
  React.useEffect(() => {
    const delay = index * 100; // Stagger animation
    
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: theme.animation.timing.normal,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, cardAnim, slideAnim]);

  const handleCardPress = useCallback(() => {
    if (onPress && !isLoading) {
      Haptics.trigger('impactLight');
      onPress(order.id);
    }
  }, [onPress, order.id, isLoading]);

  const handleAccept = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!isLoading) {
      Haptics.trigger('impactMedium');
      onAccept(order.id);
    }
  }, [onAccept, order.id, isLoading]);

  const handleDecline = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!isLoading) {
      Haptics.trigger('impactLight');
      onDecline(order.id);
    }
  }, [onDecline, order.id, isLoading]);

  const formatTime = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid time';
    }
  }, []);

  const getCustomerInitial = useCallback((name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  }, []);

  const estimatedDeliveryTime = order.estimated_delivery_time || '30 min';
  const customerName = order.customer?.name || 'Unknown Customer';
  const deliveryAddress = order.delivery_location?.address || 'No address provided';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: cardAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card
        style={styles.card}
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel={`Order ${order.order_number} from ${customerName}`}
        accessibilityHint="Double tap to view order details"
        testID={`order-card-${order.id}`}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text 
              style={styles.orderNumber}
              accessibilityRole="header"
            >
              #{order.order_number}
            </Text>
            <Text 
              style={styles.orderTime}
              accessibilityLabel={`Created at ${formatTime(order.created_at)}`}
            >
              {formatTime(order.created_at)}
            </Text>
          </View>
          
          <StatusBadge 
            status={order.status} 
            size="small"
            accessibilityLabel={`Order status: ${order.status}`}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Customer Information */}
        <View style={styles.customerRow}>
          <View 
            style={styles.customerAvatar}
            accessibilityRole="image"
            accessibilityLabel={`Customer ${customerName} avatar`}
          >
            <Text style={styles.customerInitial}>
              {getCustomerInitial(customerName)}
            </Text>
          </View>
          
          <View style={styles.customerInfo}>
            <Text 
              style={styles.customerName}
              numberOfLines={1}
              accessibilityRole="text"
            >
              {customerName}
            </Text>
            <Text 
              style={styles.customerAddress}
              numberOfLines={2}
              accessibilityLabel={`Delivery address: ${deliveryAddress}`}
            >
              {deliveryAddress}
            </Text>
          </View>
        </View>

        {/* Order Metrics */}
        <View 
          style={styles.metricsRow}
          accessibilityRole="group"
          accessibilityLabel="Order details"
        >
          <View style={styles.metric}>
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={theme.colors.textSecondary}
              accessibilityHidden
            />
            <Text 
              style={styles.metricText}
              accessibilityLabel={`Estimated delivery time: ${estimatedDeliveryTime}`}
            >
              {estimatedDeliveryTime}
            </Text>
          </View>
          
          <View style={styles.metric}>
            <Ionicons 
              name="location-outline" 
              size={16} 
              color={theme.colors.textSecondary}
              accessibilityHidden
            />
            <Text 
              style={styles.metricText}
              accessibilityLabel="Distance: 2.5 kilometers"
            >
              2.5 km
            </Text>
          </View>
          
          <View style={styles.metric}>
            <Ionicons 
              name="cash-outline" 
              size={16} 
              color={theme.colors.textSecondary}
              accessibilityHidden
            />
            <Text 
              style={styles.metricText}
              accessibilityLabel={`Order total: $${order.total}`}
            >
              ${order.total}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {(order.status === OrderStatus.PENDING || order.status === OrderStatus.ASSIGNED) && (
          <View 
            style={styles.actionRow}
            accessibilityRole="group"
            accessibilityLabel="Order actions"
          >
            <Button
              title="Decline"
              variant="outline"
              size="medium"
              onPress={handleDecline}
              style={styles.declineButton}
              disabled={isLoading}
              accessibilityHint="Decline this order"
              testID={`decline-order-${order.id}`}
            />
            <Button
              title="Accept"
              variant="primary"
              size="medium"
              onPress={handleAccept}
              style={styles.acceptButton}
              disabled={isLoading}
              loading={isLoading}
              icon={<Ionicons name="checkmark" size={18} color={theme.colors.white} />}
              iconPosition="right"
              accessibilityHint="Accept this order"
              testID={`accept-order-${order.id}`}
            />
          </View>
        )}
      </Card>
    </Animated.View>
  );
});

OrderCard.displayName = 'OrderCard';

export default OrderCard;