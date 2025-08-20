import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AvailableOrdersCardProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';
import { dashboardStyles } from '../../design/dashboard/styles';
import { CollapsibleCard } from './CollapsibleCard';
import { OrderItem } from './OrderItem';

export const AvailableOrdersCard: React.FC<AvailableOrdersCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onRefresh,
  onOrderPress,
  onViewAll,
  canAcceptOrder,
  isOnline,
}) => {
  const displayOrders = orders.slice(0, 5);
  const hasMore = orders.length > 5;

  const renderEmptyState = () => (
    <View style={dashboardStyles.emptyState}>
      <Ionicons 
        name="cube-outline" 
        size={48} 
        color={Design.colors.textSecondary} 
      />
      {!isOnline ? (
        <>
          <Text style={dashboardStyles.emptyStateText}>You're currently offline</Text>
          <Text style={dashboardStyles.emptyStateSubtext}>
            Go online to see available orders
          </Text>
        </>
      ) : (
        <>
          <Text style={dashboardStyles.emptyStateText}>No available orders</Text>
          <Text style={dashboardStyles.emptyStateSubtext}>
            Pull down to refresh or check back later
          </Text>
        </>
      )}
    </View>
  );

  const renderContent = () => {
    if (orders.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        {displayOrders.map((order) => {
          const isDisabled = !canAcceptOrder(order);
          return (
            <View key={order.id} style={isDisabled && styles.disabledOrder}>
              <OrderItem
                order={order}
                onPress={() => onOrderPress(order)}
                chevronColor={isDisabled ? Design.colors.gray400 : Design.colors.primary}
              />
              {isDisabled && (
                <View style={styles.disabledOverlay}>
                  <Text style={styles.disabledText}>
                    Complete current delivery first
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {hasMore && (
          <TouchableOpacity 
            style={dashboardStyles.viewAllButton}
            onPress={onViewAll}
          >
            <Text style={dashboardStyles.viewAllButtonText}>
              View all {orders.length} orders
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={16} 
              color={Design.colors.primary} 
            />
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <CollapsibleCard
      title="Available Orders"
      icon="compass"
      iconColor="#3B82F6"
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
    </CollapsibleCard>
  );
};

const styles = StyleSheet.create({
  disabledOrder: {
    position: 'relative',
    opacity: 0.7,
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
    borderRadius: Design.borderRadius.md,
  },
  disabledText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontWeight: '600',
  },
});