/**
 * BatchOrderCard component for displaying batch orders with multiple deliveries
 * Industry best practice: Groups related orders for efficient pickup and delivery
 */
import React, { memo, useCallback, useRef, useState } from 'react';
import { View, Text, Animated, GestureResponderEvent, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Haptics from 'react-native-haptic-feedback';
import { theme } from '../../../../shared/styles/theme';
import Card from '../../../../shared/components/Card/Card';
import StatusBadge from '../../../../shared/components/StatusBadge/StatusBadge';
import Button from '../../../../shared/components/Button/Button';
import { createBatchOrderCardStyles } from './BatchOrderCard.styles';

interface BatchOrder {
  type: 'batch';
  batch_id: number;
  batch_number: string;
  batch_type: 'consolidated' | 'distribution';
  order_count: number;
  total_value: number;
  total_items: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  special_handling: string[];
  has_cod: boolean;
  total_cod_amount: number;
  created_at: string;
  orders: any[];
}

interface BatchOrderCardProps {
  batchOrder: BatchOrder;
  index: number;
  onAccept: (orderId: string) => void; // Accept batch using any order ID
  onDecline: (orderId: string) => void; // Decline batch using any order ID
  onPress?: (orderId: string) => void;
  isLoading?: boolean;
}

const BatchOrderCard: React.FC<BatchOrderCardProps> = memo(({
  batchOrder,
  index,
  onAccept,
  onDecline,
  onPress,
  isLoading = false,
}) => {
  const styles = createBatchOrderCardStyles(theme);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [expanded, setExpanded] = useState(false);

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
    if (onPress && !isLoading && batchOrder.orders.length > 0) {
      Haptics.trigger('impactLight');
      // Use the first order's ID for batch operations
      onPress(batchOrder.orders[0].order?.id?.toString() || batchOrder.orders[0].id?.toString());
    }
  }, [onPress, batchOrder, isLoading]);

  const handleAccept = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!isLoading && batchOrder.orders.length > 0) {
      Haptics.trigger('impactMedium');
      // Use the first order's ID for batch acceptance
      onAccept(batchOrder.orders[0].order?.id?.toString() || batchOrder.orders[0].id?.toString());
    }
  }, [onAccept, batchOrder, isLoading]);

  const handleDecline = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!isLoading && batchOrder.orders.length > 0) {
      Haptics.trigger('impactLight');
      // Use the first order's ID for batch decline
      onDecline(batchOrder.orders[0].order?.id?.toString() || batchOrder.orders[0].id?.toString());
    }
  }, [onDecline, batchOrder, isLoading]);

  const toggleExpanded = useCallback(() => {
    Haptics.trigger('impactLight');
    setExpanded(!expanded);
  }, [expanded]);

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

  const getBatchTypeDisplay = () => {
    return batchOrder.batch_type === 'consolidated' ? 'CONSOLIDATED' : 'DISTRIBUTION';
  };

  const getBatchTypeColor = () => {
    return batchOrder.batch_type === 'consolidated' ? '#4ECDC4' : '#FF9F43';
  };

  const hasSpecialHandling = batchOrder.special_handling?.length > 0 || 
                           batchOrder.has_cod;

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
        accessibilityLabel={`Batch ${batchOrder.batch_number} with ${batchOrder.order_count} orders`}
        accessibilityHint="Double tap to view batch details"
        testID={`batch-card-${batchOrder.batch_id}`}
      >
        {/* Batch Header */}
        <View style={styles.batchHeader}>
          <View style={styles.batchInfo}>
            <View style={styles.batchNumberRow}>
              <View style={[styles.batchTypeBadge, { backgroundColor: getBatchTypeColor() }]}>
                <Ionicons 
                  name={batchOrder.batch_type === 'consolidated' ? 'layers' : 'git-branch'} 
                  size={12} 
                  color="#fff" 
                />
                <Text style={styles.batchTypeText}>{getBatchTypeDisplay()}</Text>
              </View>
              <Text style={styles.batchNumber}>#{batchOrder.batch_number}</Text>
            </View>
            <Text style={styles.batchTime}>
              {formatTime(batchOrder.created_at)}
            </Text>
          </View>
          
          <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
            <Ionicons 
              name={expanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Batch Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="cube-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.summaryText}>{batchOrder.order_count} Orders</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.summaryText}>${batchOrder.total_value.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="basket-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.summaryText}>{batchOrder.total_items} Items</Text>
          </View>
        </View>

        {/* Pickup Information */}
        <View style={styles.pickupSection}>
          <View style={styles.pickupHeader}>
            <Ionicons name="location" size={16} color={theme.colors.primary} />
            <Text style={styles.pickupLabel}>Pickup Location</Text>
          </View>
          <Text style={styles.pickupAddress} numberOfLines={2}>
            {batchOrder.pickup_address}
          </Text>
          <Text style={styles.pickupContact}>
            {batchOrder.pickup_contact_name} • {batchOrder.pickup_contact_phone}
          </Text>
        </View>

        {/* Special Handling Indicators */}
        {hasSpecialHandling && (
          <View style={styles.specialHandlingContainer}>
            {batchOrder.special_handling?.map((handling, index) => (
              <View key={index} style={[styles.specialHandlingBadge, styles.specialBadge]}>
                <Ionicons 
                  name={
                    handling === 'fragile' ? 'warning' :
                    handling === 'temperature_controlled' ? 'thermometer' :
                    handling === 'liquid' ? 'water' : 'alert-circle'
                  } 
                  size={12} 
                  color="#fff" 
                />
                <Text style={styles.specialHandlingText}>
                  {handling.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            ))}
            {batchOrder.has_cod && (
              <View style={[styles.specialHandlingBadge, styles.codBadge]}>
                <Ionicons name="cash" size={12} color="#fff" />
                <Text style={styles.specialHandlingText}>
                  COD ${batchOrder.total_cod_amount.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Expanded Order List */}
        {expanded && (
          <View style={styles.ordersList}>
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersTitle}>Orders in this Batch:</Text>
            </View>
            {batchOrder.orders.map((orderData, index) => {
              const order = orderData.order || orderData;
              return (
                <View key={index} style={styles.orderItem}>
                  <View style={styles.orderItemHeader}>
                    <Text style={styles.orderItemNumber}>#{order.order_number}</Text>
                    <Text style={styles.orderItemValue}>${order.total}</Text>
                  </View>
                  <Text style={styles.orderItemCustomer} numberOfLines={1}>
                    {order.delivery_contact_name || order.customer_details?.name || 'Unknown Customer'}
                  </Text>
                  <Text style={styles.orderItemAddress} numberOfLines={1}>
                    {order.delivery_address}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Decline"
            variant="outline"
            size="medium"
            onPress={handleDecline}
            style={styles.declineButton}
            disabled={isLoading}
            accessibilityHint="Decline this batch"
            testID={`decline-batch-${batchOrder.batch_id}`}
          />
          <Button
            title={`Accept Batch (${batchOrder.order_count})`}
            variant="primary"
            size="medium"
            onPress={handleAccept}
            style={styles.acceptButton}
            disabled={isLoading}
            loading={isLoading}
            icon={<Ionicons name="checkmark" size={18} color={theme.colors.white} />}
            iconPosition="right"
            accessibilityHint="Accept this entire batch"
            testID={`accept-batch-${batchOrder.batch_id}`}
          />
        </View>
      </Card>
    </Animated.View>
  );
});

BatchOrderCard.displayName = 'BatchOrderCard';

export default BatchOrderCard;