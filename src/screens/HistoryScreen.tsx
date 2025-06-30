import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

import { useOrders } from '../contexts/OrderContext';
import { useDriver } from '../contexts/DriverContext';
import { Order, OrderStatus } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DateRange {
  id: string;
  label: string;
  days: number;
  icon: string;
}

interface EarningsData {
  totalEarnings: number;
  totalOrders: number;
  avgOrderValue: number;
  completionRate: number;
}

const dateRanges: DateRange[] = [
  { id: 'today', label: 'Today', days: 1, icon: 'today-outline' },
  { id: 'week', label: 'This Week', days: 7, icon: 'calendar-outline' },
  { id: 'month', label: 'This Month', days: 30, icon: 'calendar-number-outline' },
  { id: 'all', label: 'All Time', days: 0, icon: 'time-outline' },
];

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    orderHistory, 
    getOrderHistory, 
    isLoading,
    error 
  } = useOrders();
  const { driver } = useDriver();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>('week');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Filter orders based on selected date range
  const filteredOrders = useMemo(() => {
    if (!orderHistory) return [];
    
    const now = new Date();
    const selectedRangeObj = dateRanges.find(r => r.id === selectedRange);
    
    if (!selectedRangeObj || selectedRangeObj.days === 0) {
      return orderHistory.sort((a, b) => {
        const dateA = a.orderTime ? new Date(a.orderTime).getTime() : 0;
        const dateB = b.orderTime ? new Date(b.orderTime).getTime() : 0;
        return dateB - dateA;
      });
    }
    
    const startDate = new Date(now.getTime() - (selectedRangeObj.days * 24 * 60 * 60 * 1000));
    
    return orderHistory
      .filter(order => {
        if (!order.orderTime) return false;
        const orderDate = new Date(order.orderTime);
        return !isNaN(orderDate.getTime()) && orderDate >= startDate;
      })
      .sort((a, b) => {
        const dateA = a.orderTime ? new Date(a.orderTime).getTime() : 0;
        const dateB = b.orderTime ? new Date(b.orderTime).getTime() : 0;
        return dateB - dateA;
      });
  }, [orderHistory, selectedRange]);

  // Calculate earnings data
  const earningsData = useMemo((): EarningsData => {
    const completedOrders = filteredOrders.filter(order => order.status === 'delivered');
    const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = completedOrders.length > 0 ? totalEarnings / completedOrders.length : 0;
    const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

    return {
      totalEarnings,
      totalOrders,
      avgOrderValue,
      completionRate,
    };
  }, [filteredOrders]);

  useEffect(() => {
    // Load order history on mount
    if (driver?.id) {
      getOrderHistory?.();
    }
  }, [driver?.id, getOrderHistory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getOrderHistory?.();
    } catch (error) {
      console.error('Error refreshing history:', error);
    } finally {
      setRefreshing(false);
    }
  }, [getOrderHistory]);

  const handleOrderPress = useCallback((order: Order) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  }, [navigation]);

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'in_transit': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'in_transit': return 'car-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) {
      return 'Unknown date';
    }
    
    const orderDate = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(orderDate.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return orderDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return orderDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderDateRangeButton = ({ item }: { item: DateRange }) => {
    const isSelected = selectedRange === item.id;
    const orderCount = item.days === 0 
      ? orderHistory?.length || 0
      : orderHistory?.filter(order => {
          if (!order.orderTime) return false;
          const orderDate = new Date(order.orderTime);
          if (isNaN(orderDate.getTime())) return false;
          const cutoffDate = new Date(Date.now() - (item.days * 24 * 60 * 60 * 1000));
          return orderDate >= cutoffDate;
        }).length || 0;

    return (
      <TouchableOpacity
        style={[
          styles.dateRangeButton,
          isSelected && styles.dateRangeButtonActive
        ]}
        onPress={() => setSelectedRange(item.id)}
      >
        <Ionicons 
          name={item.icon} 
          size={16} 
          color={isSelected ? '#3B82F6' : '#6B7280'} 
        />
        <Text style={[
          styles.dateRangeButtonText,
          isSelected && styles.dateRangeButtonTextActive
        ]}>
          {item.label}
        </Text>
        {orderCount > 0 && (
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{orderCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEarningsCard = () => (
    <View style={styles.earningsCard}>
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.earningsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsTitle}>
            {dateRanges.find(r => r.id === selectedRange)?.label} Earnings
          </Text>
          <Ionicons name="trending-up" size={24} color="#FFFFFF" />
        </View>
        
        <View style={styles.earningsStats}>
          <View style={styles.earningsStat}>
            <Text style={styles.earningsAmount}>
              ${earningsData.totalEarnings.toFixed(2)}
            </Text>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
          </View>
          
          <View style={styles.earningsStatDivider} />
          
          <View style={styles.earningsStat}>
            <Text style={styles.earningsAmount}>
              {earningsData.totalOrders}
            </Text>
            <Text style={styles.earningsLabel}>Total Orders</Text>
          </View>
        </View>
        
        <View style={styles.earningsSecondaryStats}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryStatValue}>
              ${earningsData.avgOrderValue.toFixed(2)}
            </Text>
            <Text style={styles.secondaryStatLabel}>Avg Order Value</Text>
          </View>
          
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryStatValue}>
              {earningsData.completionRate.toFixed(0)}%
            </Text>
            <Text style={styles.secondaryStatLabel}>Completion Rate</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    const statusColor = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);
    const isExpanded = expandedCard === order.id;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => setExpandedCard(isExpanded ? null : order.id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.historyCardGradient}
        >
          {/* Header */}
          <View style={styles.historyHeader}>
            <View style={styles.historyHeaderLeft}>
              <Text style={styles.historyOrderNumber}>#{order.orderNumber || 'Unknown'}</Text>
              <View style={[styles.historyStatusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon} size={12} color={statusColor} />
                <Text style={[styles.historyStatusText, { color: statusColor }]}>
                  {order.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
            </View>
            <View style={styles.historyHeaderRight}>
              <Text style={styles.historyAmount}>
                ${(order.total || 0).toFixed(2)}
              </Text>
              <Text style={styles.historyDate}>
                {formatDate(order.orderTime)}
              </Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.historyCustomer}>
            <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.historyCustomerName}>{order.customer?.name || 'Unknown Customer'}</Text>
          </View>

          {/* Expanded Details */}
          {isExpanded && (
            <View style={styles.expandedDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {order.deliveryAddress?.street || 'Address not available'}
                </Text>
              </View>
              
              {order.customer?.phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{order.customer.phone}</Text>
                </View>
              )}
              
              {order.specialInstructions && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{order.specialInstructions}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => handleOrderPress(order)}
              >
                <Text style={styles.viewDetailsText}>View Full Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          )}

          {/* Expand/Collapse Indicator */}
          <View style={styles.expandIndicator}>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#9CA3AF" 
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No Order History</Text>
      <Text style={styles.emptyStateText}>
        {selectedRange === 'all' 
          ? "You haven't completed any orders yet"
          : `No orders completed in the selected time period`
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={20} color="#3B82F6" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Date Range Filters */}
      <FlatList
        data={dateRanges}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderDateRangeButton}
        contentContainerStyle={styles.dateRangeContainer}
      />

      {/* Earnings Card */}
      {filteredOrders.length > 0 && renderEarningsCard()}
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading History</Text>
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
          <ActivityIndicator size="large" color="#3B82F6" />
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
    paddingBottom: 20,
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
  filterButton: {
    padding: 8,
  },
  dateRangeContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateRangeButton: {
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
  dateRangeButtonActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  dateRangeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dateRangeButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  orderCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  orderCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  earningsCard: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  earningsGradient: {
    padding: 20,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  earningsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsStat: {
    flex: 1,
    alignItems: 'center',
  },
  earningsStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  earningsSecondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  listContainer: {
    flexGrow: 1,
  },
  historyCard: {
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
  historyCardGradient: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyHeaderRight: {
    alignItems: 'flex-end',
  },
  historyOrderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCustomerName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 4,
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
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
    backgroundColor: '#3B82F6',
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

export default HistoryScreen;