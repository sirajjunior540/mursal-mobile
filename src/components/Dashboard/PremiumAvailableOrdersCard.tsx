import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AvailableOrdersCardProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { PremiumCollapsibleCard } from './PremiumCollapsibleCard';
import { PremiumOrderItem } from './PremiumOrderItem';

export const PremiumAvailableOrdersCard: React.FC<AvailableOrdersCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onRefresh,
  onOrderPress,
  onViewAll,
  canAcceptOrder,
  isOnline,
}) => {
  const displayOrders = orders.slice(0, 4);
  const hasMore = orders.length > 4;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={premiumColors.gradients.info}
          style={styles.emptyIconGradient}
        >
          <Ionicons 
            name="compass-outline" 
            size={40} 
            color="#FFFFFF" 
          />
        </LinearGradient>
      </View>
      
      {!isOnline ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>You're currently offline</Text>
          <Text style={styles.emptySubtitle}>
            Go online to see available orders
          </Text>
          <View style={styles.emptyAction}>
            <Ionicons name="power" size={16} color={premiumColors.primary[500]} />
            <Text style={styles.emptyActionText}>Tap the toggle above to go online</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>No available orders</Text>
          <Text style={styles.emptySubtitle}>
            New orders will appear here when available
          </Text>
          <TouchableOpacity style={styles.refreshHint} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color={premiumColors.primary[500]} />
            <Text style={styles.refreshHintText}>Pull down to refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (orders.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.content}>
        {displayOrders.map((order) => {
          const isDisabled = !canAcceptOrder(order);
          return (
            <View key={order.id} style={[styles.orderContainer, isDisabled && styles.disabledOrder]}>
              <PremiumOrderItem
                order={order}
                onPress={() => onOrderPress(order)}
                chevronColor={isDisabled ? premiumColors.neutral[300] : premiumColors.primary[500]}
              />
              {isDisabled && (
                <View style={styles.disabledOverlay}>
                  <View style={styles.disabledContent}>
                    <Ionicons name="lock-closed" size={16} color={premiumColors.neutral[400]} />
                    <Text style={styles.disabledText}>
                      Complete current delivery first
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {hasMore && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[premiumColors.primary[50], premiumColors.primary[100]]}
              style={styles.viewAllGradient}
            >
              <View style={styles.viewAllContent}>
                <Text style={styles.viewAllText}>
                  View all {orders.length} orders
                </Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={18} 
                  color={premiumColors.primary[600]} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <PremiumCollapsibleCard
      title="Available Orders"
      icon="compass"
      iconColor={premiumColors.primary[500]}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        orders.length > 0 
          ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} available`
          : 'No orders available'
      }
      showRefresh
      onRefresh={onRefresh}
    >
      {renderContent()}
    </PremiumCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
  orderContainer: {
    position: 'relative',
  },
  disabledOrder: {
    opacity: 0.6,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
  },
  disabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledText: {
    ...premiumTypography.caption.medium,
    color: premiumColors.neutral[500],
    fontWeight: '600',
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
    backgroundColor: premiumColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: premiumColors.primary[600],
    fontWeight: '600',
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: premiumColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshHintText: {
    ...premiumTypography.caption.medium,
    color: premiumColors.primary[600],
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
    color: premiumColors.primary[600],
    fontWeight: '600',
  },
});