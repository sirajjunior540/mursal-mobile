import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ActiveDeliveriesCardProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { PremiumCollapsibleCard } from './PremiumCollapsibleCard';
import { PremiumOrderItem } from './PremiumOrderItem';

export const PremiumActiveDeliveriesCard: React.FC<ActiveDeliveriesCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onOrderPress,
  onViewAll,
}) => {
  const displayOrders = orders.slice(0, 4);
  const hasMore = orders.length > 4;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={premiumColors.gradients.success}
          style={styles.emptyIconGradient}
        >
          <Ionicons 
            name="checkmark-done-circle-outline" 
            size={40} 
            color="#FFFFFF" 
          />
        </LinearGradient>
      </View>
      
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No active deliveries</Text>
        <Text style={styles.emptySubtitle}>
          Accept an order to start delivering
        </Text>
        <View style={styles.emptyAction}>
          <Ionicons name="compass" size={16} color={premiumColors.gradients.success[0]} />
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
          <PremiumOrderItem
            key={order.id}
            order={order}
            onPress={() => onOrderPress(order)}
            chevronColor={premiumColors.gradients.success[0]}
          />
        ))}

        {hasMore && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[`${premiumColors.gradients.success[0]}15`, `${premiumColors.gradients.success[0]}25`]}
              style={styles.viewAllGradient}
            >
              <View style={styles.viewAllContent}>
                <Text style={styles.viewAllText}>
                  View all {orders.length} orders
                </Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={18} 
                  color={premiumColors.gradients.success[0]} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getActiveOrdersCount = () => {
    const inTransitCount = orders.filter(o => o.status === 'in_transit').length;
    const pickedUpCount = orders.filter(o => o.status === 'picked_up').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted' || o.status === 'assigned').length;
    
    const statusCounts = [];
    if (inTransitCount > 0) statusCounts.push(`${inTransitCount} in transit`);
    if (pickedUpCount > 0) statusCounts.push(`${pickedUpCount} picked up`);
    if (acceptedCount > 0) statusCounts.push(`${acceptedCount} accepted`);
    
    return statusCounts.length > 0 ? statusCounts.join(', ') : `${orders.length} active`;
  };

  return (
    <PremiumCollapsibleCard
      title="Active Deliveries"
      icon="car-sport"
      iconColor={premiumColors.gradients.success[0]}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        orders.length > 0 
          ? getActiveOrdersCount()
          : 'No active deliveries'
      }
    >
      {renderContent()}
    </PremiumCollapsibleCard>
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
    overflow: 'hidden',
    ...premiumShadows.soft,
  },
  emptyIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    ...premiumTypography.headline.small,
    color: premiumColors.neutral[700],
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...premiumTypography.body.medium,
    color: premiumColors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${premiumColors.gradients.success[0]}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: premiumColors.gradients.success[0],
    fontWeight: '600',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  viewAllGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewAllText: {
    ...premiumTypography.button.medium,
    color: premiumColors.gradients.success[0],
    fontWeight: '600',
  },
});