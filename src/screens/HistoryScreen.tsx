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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useOrders } from '../contexts/OrderContext';
import { Order, HistoryFilter } from '../types';
import { COLORS, SPACING } from '../constants';
import { apiService } from '../services/api';

const HistoryScreen: React.FC = () => {
  const { orderHistory, isLoading, error, getOrderHistory } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilter>('all');
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [failedOrders, setFailedOrders] = useState<Order[]>([]);
  const [allDriverOrders, setAllDriverOrders] = useState<Order[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [selectedFilter]);

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
  }> = ({ filter, label, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isSelected && styles.filterButtonSelected,
      ]}
      onPress={onPress}
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
  );

  const OrderItem: React.FC<{ order: Order }> = ({ order }) => (
    <TouchableOpacity style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.customerName}>{order.customer.name}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon(order.status) as any}
            size={20}
            color={getStatusColor(order.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
          <Text style={styles.addressText} numberOfLines={2}>
            {order.deliveryAddress.street}
          </Text>
        </View>
        
        <View style={styles.orderMeta}>
          <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
          <Text style={styles.orderDate}>
            {formatDate(order.orderTime)}
          </Text>
        </View>
      </View>

      {order.deliveredTime && (
        <View style={styles.deliveryTime}>
          <Ionicons name="time-outline" size={14} color={COLORS.text.secondary} />
          <Text style={styles.deliveryTimeText}>
            Delivered: {formatDate(order.deliveredTime)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const EmptyState: React.FC = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={COLORS.text.secondary} />
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? "You haven't completed any deliveries yet."
          : `No ${selectedFilter} orders found.`
        }
      </Text>
    </View>
  );

  const displayOrders = getDisplayOrders();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton
          filter="all"
          label="All"
          isSelected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
        />
        <FilterButton
          filter="today"
          label="Today"
          isSelected={selectedFilter === 'today'}
          onPress={() => setSelectedFilter('today')}
        />
        <FilterButton
          filter="week"
          label="Week"
          isSelected={selectedFilter === 'week'}
          onPress={() => setSelectedFilter('week')}
        />
        <FilterButton
          filter="month"
          label="Month"
          isSelected={selectedFilter === 'month'}
          onPress={() => setSelectedFilter('month')}
        />
        <FilterButton
          filter="completed"
          label="Completed"
          isSelected={selectedFilter === 'completed'}
          onPress={() => setSelectedFilter('completed')}
        />
        <FilterButton
          filter="failed"
          label="Failed"
          isSelected={selectedFilter === 'failed'}
          onPress={() => setSelectedFilter('failed')}
        />
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders List */}
      {(isLoading || localLoading) && displayOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderItem order={item} />}
          contentContainerStyle={[
            styles.listContainer,
            displayOrders.length === 0 && styles.emptyListContainer,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primary.default,
    borderColor: COLORS.primary.default,
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
    margin: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  retryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: 6,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
  },
  emptyListContainer: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderDetails: {
    marginBottom: SPACING.sm,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  deliveryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deliveryTimeText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HistoryScreen;