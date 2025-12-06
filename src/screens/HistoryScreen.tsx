import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useRoute } from '@react-navigation/native';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order, DriverBalance, BalanceTransaction } from '../types';
import { apiService } from '../services/api';
import { flatColors } from '../design/dashboard/flatColors';

// Components
import { HistoryHeader } from '../components/History/HistoryHeader';
import { DateRangeFilter } from '../components/History/DateRangeFilter';
import { OrderHistoryCard } from '../components/History/OrderHistoryCard';
import { EarningsCard } from '../components/History/EarningsCard';
import { TransactionList } from '../components/History/TransactionList';
import { OrderHistoryDetailsModal } from '../components/History/OrderHistoryDetailsModal';
import EmptyState from '../components/EmptyState';

type RootStackParamList = {
  PickupScreen: { orderId: string };
  DeliveryScreen: { order: Order };
  HistoryScreen: { tab?: 'history' | 'earnings' };
};

interface HistoryScreenRouteParams {
  tab?: 'history' | 'earnings';
}

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as HistoryScreenRouteParams;
  
  const { 
    orderHistory, 
    getOrderHistory, 
    isLoading,
    error 
  } = useOrders();
  const { driver } = useDriver();
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>('week');
  const [currentTab, setCurrentTab] = useState<'history' | 'earnings'>(params?.tab || 'history');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<DriverBalance | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Show earnings tab if accessed from balance card
  const showEarningsTab = params?.tab === 'earnings';

  // Filter orders based on selected date range
  const filteredOrders = useMemo(() => {
    if (!orderHistory) return [];
    
    const now = new Date();
    let startDate: Date;
    
    switch (selectedRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      default: // 'all'
        return orderHistory.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
    }
    
    return orderHistory
      .filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return !isNaN(orderDate.getTime()) && orderDate >= startDate;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [orderHistory, selectedRange]);

  // Calculate order counts for each range
  const orderCounts = useMemo(() => {
    if (!orderHistory) return {};
    
    const now = new Date();
    const counts: Record<string, number> = {};
    
    // Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    counts.today = orderHistory.filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= todayStart;
    }).length;
    
    // Week
    const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    counts.week = orderHistory.filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= weekStart;
    }).length;
    
    // Month
    const monthStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    counts.month = orderHistory.filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= monthStart;
    }).length;
    
    // All
    counts.all = orderHistory.length;
    
    return counts;
  }, [orderHistory]);

  // Load earnings data
  const loadEarningsData = useCallback(async () => {
    setEarningsLoading(true);
    try {
      let response;
      
      switch (selectedRange) {
        case 'today':
          response = await apiService.getTodayEarnings();
          break;
        case 'week':
          response = await apiService.getWeekEarnings();
          break;
        case 'month':
          response = await apiService.getMonthEarnings();
          break;
        case 'all':
        default:
          response = await apiService.getDriverEarnings();
          break;
      }
      
      if (response.success) {
        setEarnings(response.data);
      }
    } catch (err) {
      console.error('Error loading earnings:', err);
    } finally {
      setEarningsLoading(false);
    }
  }, [selectedRange]);

  // Load transaction history
  const loadTransactionHistory = useCallback(async () => {
    try {
      const response = await apiService.getBalanceTransactions();
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  }, []);

  // Effects
  useEffect(() => {
    if (driver?.id) {
      getOrderHistory?.();
      loadTransactionHistory();
    }
  }, [driver?.id, getOrderHistory, loadTransactionHistory]);

  useEffect(() => {
    if (driver?.id && (currentTab === 'earnings' || showEarningsTab)) {
      loadEarningsData();
    }
  }, [driver?.id, selectedRange, currentTab, showEarningsTab, loadEarningsData]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getOrderHistory?.(),
        loadEarningsData(),
        loadTransactionHistory()
      ]);
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  }, [getOrderHistory, loadEarningsData, loadTransactionHistory]);

  const handleOrderPress = useCallback((order: Order) => {
    // For completed orders, show details modal
    // For active orders, navigate to pickup/delivery screen
    if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'failed') {
      setSelectedOrder(order);
      setDetailsModalVisible(true);
    } else if (order.status === 'picked_up' || order.status === 'in_transit') {
      navigation.navigate('DeliveryScreen', { order });
    } else {
      navigation.navigate('PickupScreen', { orderId: order.id });
    }
  }, [navigation]);

  const handleCardPress = useCallback((order: Order) => {
    setExpandedCard(expandedCard === order.id ? null : order.id);
  }, [expandedCard]);

  const handleTabChange = useCallback((tab: 'history' | 'earnings') => {
    setCurrentTab(tab);
  }, []);

  const handleViewDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDetailsModalVisible(true);
  }, []);

  // Render functions
  const renderOrderCard = ({ item: order }: { item: Order }) => (
    <OrderHistoryCard
      order={order}
      onPress={() => handleCardPress(order)}
      isExpanded={expandedCard === order.id}
      onViewDetails={() => handleViewDetails(order)}
    />
  );

  const renderContent = () => {
    if (currentTab === 'earnings') {
      return (
        <ScrollView 
          style={styles.earningsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <EarningsCard
            earnings={earnings}
            period={selectedRange}
            isLoading={earningsLoading}
          />
          <TransactionList 
            transactions={transactions}
            isLoading={earningsLoading}
          />
        </ScrollView>
      );
    }

    if (filteredOrders.length === 0 && !isLoading) {
      return (
        <EmptyState
          icon="time-outline"
          title="No Order History"
          message={
            selectedRange === 'all' 
              ? "You haven't completed any orders yet"
              : `No orders completed in the selected time period`
          }
          buttonText="Refresh"
          onRetry={handleRefresh}
        />
      );
    }

    return (
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <LinearGradient
        colors={[flatColors.brand.lighter, '#FFE7C7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorativeBlob, styles.blobTopLeft]} />
      <View style={[styles.decorativeBlob, styles.blobBottomRight]} />
      <View style={styles.ring} />
      <HistoryHeader
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onBack={() => navigation.goBack()}
        showEarningsTab={showEarningsTab}
      />
      
      <DateRangeFilter
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        orderCounts={orderCounts}
      />

      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Loading overlay */}
      {isLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={flatColors.brand.secondary} />
        </View>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderHistoryDetailsModal
          isVisible={detailsModalVisible}
          onClose={() => {
            setDetailsModalVisible(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.brand.lighter,
  },
  decorativeBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  blobTopLeft: {
    top: -40,
    left: -30,
  },
  blobBottomRight: {
    bottom: -60,
    right: -20,
  },
  ring: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.08)',
    top: '14%',
    right: '-16%',
  },
  content: {
    flex: 1,
  },
  earningsContent: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
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
