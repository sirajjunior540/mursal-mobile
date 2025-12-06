import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order, OrderStatus } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterOption {
  id: string;
  label: string;
  value: OrderStatus | 'all';
  icon: string;
  color: string;
}

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All Orders', value: 'all', icon: 'list-outline', color: '#6B7280' },
  { id: 'assigned', label: 'Assigned', value: 'assigned', icon: 'hourglass-outline', color: '#F59E0B' },
  { id: 'in_transit', label: 'Picked Up', value: 'in_transit', icon: 'car-outline', color: '#FF6B00' },
  { id: 'delivered', label: 'Delivered', value: 'delivered', icon: 'checkmark-circle-outline', color: '#10B981' },
];

const AcceptedOrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    driverOrders: acceptedOrders, 
    refreshOrders, 
    isLoading,
    error,
    getDriverOrders
  } = useOrders();
  const { driver } = useDriver();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders based on selected filter and search query
  const filteredOrders = useMemo(() => {
    let filtered = acceptedOrders || [];
    
    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        (order.order_number || order.orderNumber)?.toLowerCase().includes(query) ||
        (order.customer_details?.name || order.customer?.name)?.toLowerCase().includes(query) ||
        (order.delivery_address || order.deliveryAddress?.street)?.toLowerCase().includes(query)
      );
    }
    
    // Sort by most recent first - handle undefined dates safely
    return filtered.sort((a, b) => {
      const dateA = (a.created_at || a.orderTime) ? new Date(a.created_at || a.orderTime).getTime() : 0;
      const dateB = (b.created_at || b.orderTime) ? new Date(b.created_at || b.orderTime).getTime() : 0;
      return dateB - dateA;
    });
  }, [acceptedOrders, selectedFilter, searchQuery]);

  useEffect(() => {
    // Load driver's accepted orders on mount
    const loadOrders = async () => {
      if (driver?.id && getDriverOrders) {
        try {
          console.log('📋 Loading driver orders in AcceptedOrdersScreen...');
          await getDriverOrders();
        } catch (error) {
          console.error('❌ Error loading driver orders:', error);
          // Error is handled by the context, just log here
        }
      }
    };
    
    loadOrders();
  }, [driver?.id, getDriverOrders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getDriverOrders?.();
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setRefreshing(false);
    }
  }, [getDriverOrders]);

  const handleOrderPress = useCallback((order: Order) => {
    console.log('[AcceptedOrdersScreen] Order pressed:', order.id, order);
    if (order.id && navigation?.navigate) {
      console.log('[AcceptedOrdersScreen] Navigating to OrderDetails with orderId:', order.id);
      navigation.navigate('OrderDetails', { orderId: order.id });
    } else {
      console.error('[AcceptedOrdersScreen] Cannot navigate - missing order.id or navigation:', { orderId: order.id, hasNavigation: !!navigation });
    }
  }, [navigation]);

  const getStatusColor = (status: OrderStatus | string): string => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'assigned': return '#F59E0B';
      case 'in_transit': return '#FF6B00';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case 'assigned': return 'hourglass-outline';
      case 'in_transit': return 'car-outline';
      case 'delivered': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const formatOrderTime = (date: Date | string | undefined): string => {
    if (!date) {
      return 'Unknown time';
    }
    
    const orderDate = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(orderDate.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return orderDate.toLocaleDateString();
    }
  };

  const renderFilterButton = ({ item }: { item: FilterOption }) => {
    const isSelected = selectedFilter === item.id;
    const orderCount = item.value === 'all' 
      ? acceptedOrders?.length || 0
      : acceptedOrders?.filter(order => order.status === item.value).length || 0;

    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isSelected && { ...styles.filterButtonActive, borderColor: item.color }
        ]}
        onPress={() => setSelectedFilter(item.id)}
      >
        <Ionicons 
          name={item.icon} 
          size={18} 
          color={isSelected ? item.color : '#6B7280'} 
        />
        <Text style={[
          styles.filterButtonText,
          isSelected && { color: item.color, fontWeight: '600' }
        ]}>
          {item.label}
        </Text>
        {orderCount > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: item.color }]}>
            <Text style={styles.filterBadgeText}>{orderCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    const statusColor = getStatusColor(order.status || 'pending');
    const statusIcon = getStatusIcon(order.status || 'pending');

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.orderCardGradient}
        >
          {/* Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>#{order.order_number || order.orderNumber || 'Unknown'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon} size={12} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {order.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
            </View>
            <Text style={styles.orderTime}>{formatOrderTime(order.created_at || order.orderTime)}</Text>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.customerName}>{order.customer_details?.name || order.customer?.name || 'Unknown Customer'}</Text>
            {(order.customer_details?.phone || order.customer?.phone) && (
              <TouchableOpacity style={styles.phoneButton}>
                <Ionicons name="call-outline" size={14} color="#FF6B00" />
              </TouchableOpacity>
            )}
          </View>

          {/* Address */}
          <View style={styles.addressSection}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={2}>
              {order.delivery_address || order.deliveryAddress?.street || 'Address not available'}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.orderFooter}>
            <View style={styles.priceSection}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => handleOrderPress(order)}
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B00" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No Orders Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all' 
          ? "You don't have any accepted orders yet"
          : `No orders with status "${filterOptions.find(f => f.id === selectedFilter)?.label}"`
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={20} color="#FF6B00" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <FlatList
        data={filterOptions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderFilterButton}
        contentContainerStyle={styles.filterContainer}
      />
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading Orders</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      {isLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchButton: {
    padding: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listContainer: {
    flexGrow: 1,
  },
  orderCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderCardGradient: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  orderTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  phoneButton: {
    padding: 4,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSection: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B00',
    marginRight: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B00',
    borderRadius: 24,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default AcceptedOrdersScreen;