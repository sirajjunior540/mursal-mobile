import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useOrders } from '../contexts/OrderContext';
import { Order, HistoryFilter } from '../types';
import { COLORS, SPACING } from '../constants';
import { apiService } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HistoryScreen: React.FC = () => {
  const { orderHistory, isLoading, error, getOrderHistory } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilter>('all');
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [failedOrders, setFailedOrders] = useState<Order[]>([]);
  const [allDriverOrders, setAllDriverOrders] = useState<Order[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    loadHistory();
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedFilter, fadeAnim, slideAnim]);

  const loadHistory = async () => {
    setLocalLoading(true);
    try {
      switch (selectedFilter) {
        case 'all':
          const driverResponse = await apiService.getDriverOrders();
          if (driverResponse.success) {
            setAllDriverOrders(driverResponse.data);
          }
          break;
        case 'completed':
          const completedResponse = await apiService.getCompletedOrders();
          if (completedResponse.success) {
            setCompletedOrders(completedResponse.data);
          }
          break;
        case 'failed':
          const failedResponse = await apiService.getFailedOrders();
          if (failedResponse.success) {
            setFailedOrders(failedResponse.data);
          }
          break;
        default:
          await getOrderHistory(selectedFilter);
          break;
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load order history');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getDisplayOrders = (): Order[] => {
    switch (selectedFilter) {
      case 'all':
        return allDriverOrders;
      case 'completed':
        return completedOrders;
      case 'failed':
        return failedOrders;
      default:
        return orderHistory;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return COLORS.success;
      case 'failed':
      case 'cancelled':
        return COLORS.error;
      case 'in_transit':
      case 'picked_up':
        return COLORS.warning;
      case 'assigned':
        return COLORS.primary.default;
      default:
        return COLORS.text.secondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'checkmark-circle';
      case 'failed':
      case 'cancelled':
        return 'close-circle';
      case 'in_transit':
        return 'car';
      case 'picked_up':
        return 'cube';
      case 'assigned':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const FilterButton: React.FC<{
    filter: HistoryFilter;
    label: string;
    isSelected: boolean;
    onPress: () => void;
  }> = ({ filter, label, isSelected, onPress }) => {
    const animatedScale = useState(new Animated.Value(1))[0];

    const handlePressIn = () => {
      Animated.spring(animatedScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(animatedScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            isSelected && styles.filterButtonSelected,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Text
            style={[
              styles.filterButtonText,
              isSelected && styles.filterButtonTextSelected,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const OrderItem: React.FC<{ order: Order; index: number }> = ({ order, index }) => {
    const animatedScale = useState(new Animated.Value(1))[0];
    const statusColor = getStatusColor(order.status);
    
    const handlePressIn = () => {
      Animated.spring(animatedScale, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(animatedScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: animatedScale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.orderItem}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderMainInfo}>
              <View style={styles.customerSection}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitial}>
                    {order.customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{order.customer.name}</Text>
                  <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                </View>
              </View>
              
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor  }20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {order.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.orderDivider} />

          <View style={styles.orderDetails}>
            <View style={styles.addressSection}>
              <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
              <Text style={styles.addressText} numberOfLines={2}>
                {order.deliveryAddress.street}
              </Text>
            </View>
            
            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                <Text style={styles.metaLabel}>Total</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.orderDate}>
                  {formatDate(order.orderTime)}
                </Text>
                <Text style={styles.metaLabel}>Ordered</Text>
              </View>
              
              {order.deliveredTime && (
                <View style={styles.metaItem}>
                  <Text style={styles.deliveryDate}>
                    {formatDate(order.deliveredTime)}
                  </Text>
                  <Text style={styles.metaLabel}>Delivered</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState: React.FC = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.text.secondary} />
      </View>
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? "Your completed deliveries will appear here"
          : `No ${selectedFilter} orders found`
        }
      </Text>
    </Animated.View>
  );

  const displayOrders = getDisplayOrders();

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>
          {displayOrders.length} {displayOrders.length === 1 ? 'order' : 'orders'} found
        </Text>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterScrollContainer}>
        <FlatList
          horizontal
          data={[
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'completed', label: 'Completed' },
            { key: 'failed', label: 'Failed' },
          ]}
          renderItem={({ item }) => (
            <FilterButton
              filter={item.key as HistoryFilter}
              label={item.label}
              isSelected={selectedFilter === item.key}
              onPress={() => setSelectedFilter(item.key as HistoryFilter)}
            />
          )}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        />
      </View>

      {/* Error Display */}
      {error && (
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
          <Ionicons name="warning-outline" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Orders Section */}
      <View style={styles.ordersSection}>
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <OrderItem order={item} index={index} />}
          contentContainerStyle={[
            styles.listContainer,
            displayOrders.length === 0 && styles.emptyListContainer,
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={false} 
              onRefresh={handleRefresh}
              tintColor={COLORS.primary.default}
            />
          }
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.orderSeparator} />}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  filterScrollContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primary.default,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextSelected: {
    color: COLORS.white,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    backgroundColor: `${COLORS.error  }10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.error  }20`,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 12,
    marginRight: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  ordersSection: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
  },
  orderSeparator: {
    height: 12,
  },
  orderItem: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  orderHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  orderMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.default,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  orderDetails: {
    padding: 16,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 8,
    lineHeight: 20,
  },
  orderMeta: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  deliveryDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HistoryScreen;