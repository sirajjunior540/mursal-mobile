import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ActiveDeliveriesCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatCollapsibleCard } from './FlatCollapsibleCard';
import { FlatOrderItem } from './FlatOrderItem';

export const FlatActiveDeliveriesCard: React.FC<ActiveDeliveriesCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onOrderPress,
  onViewAll,
}) => {
  const [showAllOrders, setShowAllOrders] = useState(false);
  
  const displayOrders = showAllOrders ? orders : orders.slice(0, 4);
  const hasMore = orders.length > 4;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: flatColors.accent.green }]}>
        <Ionicons 
          name="checkmark-done-circle-outline" 
          size={40} 
          color="#FFFFFF" 
        />
      </View>
      
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No active deliveries</Text>
        <Text style={styles.emptySubtitle}>
          Accept an order to start delivering
        </Text>
        <View style={styles.emptyAction}>
          <Ionicons name="compass" size={16} color={flatColors.accent.green} />
          <Text style={styles.emptyActionText}>Check available orders above</Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (orders.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.content}>
        {displayOrders.map((order) => (
          <FlatOrderItem
            key={order.id}
            order={order}
            onPress={() => onOrderPress(order)}
            chevronColor={flatColors.accent.green}
          />
        ))}

        {hasMore && !showAllOrders && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowAllOrders(true)}
            activeOpacity={0.8}
          >
            <View style={styles.viewAllContent}>
              <Text style={styles.viewAllText}>
                View all {orders.length} orders
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={16} 
                color={flatColors.neutral[500]} 
              />
            </View>
          </TouchableOpacity>
        )}
        
        {showAllOrders && hasMore && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowAllOrders(false)}
            activeOpacity={0.8}
          >
            <View style={styles.viewAllContent}>
              <Text style={styles.viewAllText}>
                Show less
              </Text>
              <Ionicons 
                name="chevron-up" 
                size={16} 
                color={flatColors.neutral[500]} 
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getActiveOrdersSummary = () => {
    const inTransitCount = orders.filter(o => o.status === 'in_transit').length;
    const pickedUpCount = orders.filter(o => o.status === 'picked_up').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted' || o.status === 'assigned').length;
    
    // Calculate total value
    const totalValue = orders.reduce((sum, order) => sum + (order.total_amount || order.total || 0), 0);
    
    // Get next delivery location
    const nextDelivery = orders.find(o => o.status === 'in_transit' || o.status === 'picked_up');
    const nextLocation = nextDelivery ? 
      (nextDelivery.delivery_address?.split(',')[0] || 'Unknown location') : 
      null;
    
    // Build status summary
    const statusParts = [];
    if (inTransitCount > 0) statusParts.push(`${inTransitCount} in transit`);
    if (pickedUpCount > 0) statusParts.push(`${pickedUpCount} picked up`);
    if (acceptedCount > 0) statusParts.push(`${acceptedCount} accepted`);
    
    const statusSummary = statusParts.length > 0 ? statusParts.join(', ') : `${orders.length} active`;
    
    // Build complete summary
    const summaryParts = [statusSummary];
    
    // Add total value if meaningful
    if (totalValue > 0) {
      summaryParts.push(`$${totalValue.toFixed(2)} total`);
    }
    
    // Add next location if available
    if (nextLocation && orders.length <= 3) {
      summaryParts.push(`Next: ${nextLocation}`);
    }
    
    return summaryParts.join(' • ');
  };

  return (
    <FlatCollapsibleCard
      title="Active Deliveries"
      icon="car-sport"
      iconColor={flatColors.accent.green}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        orders.length > 0 
          ? getActiveOrdersSummary()
          : 'No active deliveries'
      }
    >
      {renderContent()}
    </FlatCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.soft,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    ...premiumTypography.headline.small,
    color: flatColors.neutral[700],
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.cards.green.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.green,
    fontWeight: '600',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    backgroundColor: flatColors.backgrounds.primary,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  viewAllText: {
    ...premiumTypography.caption.large,
    color: flatColors.neutral[600],
    fontWeight: '600',
  },
});