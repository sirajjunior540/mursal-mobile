import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AvailableOrdersCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatCollapsibleCard } from './FlatCollapsibleCard';
import { FlatOrderItem } from './FlatOrderItem';

export const FlatAvailableOrdersCard: React.FC<AvailableOrdersCardProps> = ({
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
      <View style={[styles.emptyIconContainer, { backgroundColor: flatColors.primary[500] }]}>
        <Ionicons 
          name="compass-outline" 
          size={40} 
          color="#FFFFFF" 
        />
      </View>
      
      {!isOnline ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>You're currently offline</Text>
          <Text style={styles.emptySubtitle}>
            Go online to see available orders
          </Text>
          <View style={styles.emptyAction}>
            <Ionicons name="power" size={16} color={flatColors.primary[500]} />
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
            <Ionicons name="refresh" size={16} color={flatColors.primary[500]} />
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
              <FlatOrderItem
                order={order}
                onPress={() => onOrderPress(order)}
                chevronColor={isDisabled ? flatColors.neutral[300] : flatColors.primary[500]}
              />
              {isDisabled && (
                <View style={styles.disabledOverlay}>
                  <View style={styles.disabledContent}>
                    <Ionicons name="lock-closed" size={16} color={flatColors.neutral[400]} />
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
            <View style={[styles.viewAllContent, { backgroundColor: flatColors.primary[50] }]}>
              <Text style={[styles.viewAllText, { color: flatColors.primary[600] }]}>
                View all {orders.length} orders
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={18} 
                color={flatColors.primary[600]} 
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatCollapsibleCard
      title="Available Orders"
      icon="compass"
      iconColor={flatColors.primary[500]}
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
    </FlatCollapsibleCard>
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
    color: flatColors.neutral[500],
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
    backgroundColor: flatColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: flatColors.primary[600],
    fontWeight: '600',
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshHintText: {
    ...premiumTypography.caption.medium,
    color: flatColors.primary[600],
    fontWeight: '600',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  viewAllText: {
    ...premiumTypography.button.medium,
    fontWeight: '600',
  },
});