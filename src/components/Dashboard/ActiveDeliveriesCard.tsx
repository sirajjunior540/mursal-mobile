import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ActiveDeliveriesCardProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardStyles } from '../../design/dashboard/styles';
import { CollapsibleCard } from './CollapsibleCard';
import { OrderItem } from './OrderItem';

export const ActiveDeliveriesCard: React.FC<ActiveDeliveriesCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onOrderPress,
  onViewAll,
}) => {
  const displayOrders = orders.slice(0, 5);
  const hasMore = orders.length > 5;

  const renderEmptyState = () => (
    <View style={dashboardStyles.emptyState}>
      <Ionicons 
        name="checkmark-done-circle" 
        size={48} 
        color={Design.colors.textSecondary} 
      />
      <Text style={dashboardStyles.emptyStateText}>No active deliveries</Text>
      <Text style={dashboardStyles.emptyStateSubtext}>
        Accept an order to start delivering
      </Text>
    </View>
  );

  const renderContent = () => {
    if (orders.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        {displayOrders.map((order) => (
          <OrderItem
            key={order.id}
            order={order}
            onPress={() => onOrderPress(order)}
          />
        ))}

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

  const getActiveOrdersCount = () => {
    const inTransitCount = orders.filter(o => o.status === 'in_transit').length;
    const pickedUpCount = orders.filter(o => o.status === 'picked_up').length;
    
    if (inTransitCount > 0 && pickedUpCount > 0) {
      return `${inTransitCount} in transit, ${pickedUpCount} picked up`;
    } else if (inTransitCount > 0) {
      return `${inTransitCount} ${inTransitCount === 1 ? 'order' : 'orders'} in transit`;
    } else if (pickedUpCount > 0) {
      return `${pickedUpCount} ${pickedUpCount === 1 ? 'order' : 'orders'} picked up`;
    } else {
      return `${orders.length} active ${orders.length === 1 ? 'delivery' : 'deliveries'}`;
    }
  };

  return (
    <CollapsibleCard
      title="Active Deliveries"
      icon="car"
      iconColor="#10B981"
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        orders.length > 0 
          ? getActiveOrdersCount()
          : 'No active deliveries'
      }
    >
      {renderContent()}
    </CollapsibleCard>
  );
};