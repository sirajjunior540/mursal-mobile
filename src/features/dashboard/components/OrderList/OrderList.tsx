/**
 * Optimized OrderList component with virtualization and performance improvements
 */
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, Text, RefreshControl, ListRenderItem } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order, Driver } from '../../../../shared/types';
import { theme } from '../../../../shared/styles/theme';
import OrderCard from '../OrderCard/OrderCard';
import Button from '../../../../shared/components/Button/Button';
import { createOrderListStyles } from './OrderList.styles';

interface OrderListProps {
  orders: Order[];
  driver: Driver | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onAcceptOrder: (orderId: string) => void;
  onDeclineOrder: (orderId: string) => void;
  onOrderPress?: (orderId: string) => void;
  onGoOnline?: () => void;
}

const OrderList: React.FC<OrderListProps> = memo(({
  orders,
  driver,
  isLoading,
  isRefreshing,
  onRefresh,
  onAcceptOrder,
  onDeclineOrder,
  onOrderPress,
  onGoOnline,
}) => {
  const styles = createOrderListStyles(theme);

  // Memoized key extractor for better performance
  const keyExtractor = useCallback((item: Order) => item.id, []);

  // Memoized render item to prevent unnecessary re-renders
  const renderOrderItem: ListRenderItem<Order> = useCallback(({ item, index }) => (
    <OrderCard
      order={item}
      index={index}
      onAccept={onAcceptOrder}
      onDecline={onDeclineOrder}
      onPress={onOrderPress}
      isLoading={isLoading}
    />
  ), [onAcceptOrder, onDeclineOrder, onOrderPress, isLoading]);

  // Memoized empty state component
  const EmptyStateComponent = useMemo(() => (
    <View 
      style={styles.emptyState}
      accessibilityRole="text"
      accessibilityLabel={driver?.is_online 
        ? 'No active orders available. New orders will appear when available.' 
        : 'You are offline. Go online to start receiving orders.'
      }
    >
      <View style={styles.emptyIcon}>
        <Ionicons 
          name="cube-outline" 
          size={48} 
          color={theme.colors.textTertiary}
          accessibilityHidden
        />
      </View>
      
      <Text style={styles.emptyTitle}>
        No Active Orders
      </Text>
      
      <Text style={styles.emptySubtitle}>
        {driver?.is_online 
          ? 'New orders will appear here when available' 
          : 'Go online to start receiving orders'}
      </Text>
      
      {!driver?.is_online && onGoOnline && (
        <Button
          title="Go Online"
          variant="primary"
          size="medium"
          onPress={onGoOnline}
          style={styles.goOnlineButton}
          accessibilityHint="Tap to go online and start receiving orders"
          testID="go-online-button"
        />
      )}
    </View>
  ), [driver?.is_online, onGoOnline, styles]);

  // Memoized header component
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.header}>
      <Text 
        style={styles.sectionTitle}
        accessibilityRole="header"
      >
        Active Orders
      </Text>
      {orders.length > 0 && (
        <Text 
          style={styles.orderCount}
          accessibilityLabel={`${orders.length} active ${orders.length === 1 ? 'order' : 'orders'}`}
        >
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </Text>
      )}
    </View>
  ), [orders.length, styles]);

  // Memoized refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.surface}
    />
  ), [isRefreshing, onRefresh]);

  const getItemLayout = useCallback((data: Order[] | null | undefined, index: number) => ({
    length: 180, // Approximate item height
    offset: 180 * index,
    index,
  }), []);

  return (
    <FlatList
      data={orders}
      renderItem={renderOrderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={EmptyStateComponent}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.contentContainer,
        orders.length === 0 && styles.emptyContentContainer,
      ]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      initialNumToRender={5}
      windowSize={10}
      getItemLayout={getItemLayout}
      testID="order-list"
      accessibilityRole="list"
      accessibilityLabel="Active orders list"
    />
  );
});

OrderList.displayName = 'OrderList';

export default OrderList;