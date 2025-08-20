import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { useDriver } from '../contexts/DriverContext';
import { DriverBalance, BalanceTransaction } from '../types';
import { apiService } from '../services/api';

interface EarningsDetailsRouteParams {
  period: 'today' | 'week' | 'month' | 'all';
  earnings: DriverBalance;
}

const EarningsDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as EarningsDetailsRouteParams;
  const { driver } = useDriver();

  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [detailedEarnings, setDetailedEarnings] = useState<DriverBalance | null>(params?.earnings || null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions'>('overview');

  const period = params?.period || 'all';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [earningsResponse, transactionsResponse] = await Promise.all([
        period === 'today' ? apiService.getTodayEarnings() :
        period === 'week' ? apiService.getWeekEarnings() :
        period === 'month' ? apiService.getMonthEarnings() :
        apiService.getDriverEarnings(),
        apiService.getTransactionHistory()
      ]);

      if (earningsResponse.success) {
        setDetailedEarnings(earningsResponse.data);
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      }
    } catch (error) {
      console.error('Error loading earnings details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getPeriodTitle = () => {
    switch (period) {
      case 'today': return "Today's Earnings";
      case 'week': return "This Week's Earnings";
      case 'month': return "This Month's Earnings";
      default: return "All Time Earnings";
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{getPeriodTitle()}</Text>
      <TouchableOpacity style={styles.shareButton}>
        <Ionicons name="share-outline" size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  const renderEarningSummary = () => (
    <View style={styles.summaryContainer}>
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.summaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryAmount}>
            ${detailedEarnings?.totalEarnings?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.summaryPeriod}>{getPeriodTitle()}</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.breakdownGrid}>
        <View style={styles.breakdownItem}>
          <Ionicons name="car-outline" size={20} color="#10B981" />
          <Text style={styles.breakdownValue}>
            ${detailedEarnings?.breakdown?.deliveryEarnings?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.breakdownLabel}>Delivery Fees</Text>
        </View>
        
        <View style={styles.breakdownItem}>
          <Ionicons name="gift-outline" size={20} color="#F59E0B" />
          <Text style={styles.breakdownValue}>
            ${detailedEarnings?.breakdown?.tips?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.breakdownLabel}>Tips</Text>
        </View>
        
        <View style={styles.breakdownItem}>
          <Ionicons name="star-outline" size={20} color="#8B5CF6" />
          <Text style={styles.breakdownValue}>
            ${detailedEarnings?.breakdown?.bonuses?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.breakdownLabel}>Bonuses</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
        onPress={() => setSelectedTab('overview')}
      >
        <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
          Overview
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'transactions' && styles.activeTab]}
        onPress={() => setSelectedTab('transactions')}
      >
        <Text style={[styles.tabText, selectedTab === 'transactions' && styles.activeTabText]}>
          Transactions
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EBF4FF' }]}>
            <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{detailedEarnings?.completedOrders || 0}</Text>
          <Text style={styles.statLabel}>Completed Orders</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="trending-up-outline" size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>
            {detailedEarnings?.averageRating?.toFixed(1) || '0.0'}★
          </Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>
            {detailedEarnings?.averageDeliveryTime || 0}m
          </Text>
          <Text style={styles.statLabel}>Avg Delivery Time</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#EC4899" />
          </View>
          <Text style={styles.statValue}>
            {detailedEarnings?.successRate?.toFixed(0) || 0}%
          </Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: BalanceTransaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: item.type === 'earning' ? '#10B981' : 
                            item.type === 'withdrawal' ? '#EF4444' : '#6B7280' }
        ]}>
          <Ionicons
            name={item.type === 'earning' ? 'add' : 
                  item.type === 'withdrawal' ? 'remove' : 'swap-horizontal'}
            size={16}
            color="#FFFFFF"
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.description || 'Transaction'}
          </Text>
          <Text style={styles.transactionDate}>
            {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date'}
          </Text>
          {item.orderId && (
            <Text style={styles.transactionOrderId}>Order #{item.orderId}</Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'earning' ? '#10B981' : 
                   item.type === 'withdrawal' ? '#EF4444' : '#6B7280' }
        ]}>
          {item.type === 'earning' ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'completed' ? '#10B981' : 
                            item.status === 'pending' ? '#F59E0B' : '#EF4444' }
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  const renderTransactions = () => (
    <View style={styles.transactionsContainer}>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.transactionsList}
        />
      ) : (
        <View style={styles.emptyTransactions}>
          <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyText}>No transactions found for this period</Text>
        </View>
      )}
    </View>
  );

  if (isLoading && !detailedEarnings) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading earnings details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderEarningSummary()}
        {renderTabs()}
        {selectedTab === 'overview' ? renderOverview() : renderTransactions()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryContainer: {
    margin: 16,
  },
  summaryGradient: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  breakdownGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  overviewContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  transactionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  transactionsList: {
    paddingBottom: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionOrderId: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default EarningsDetailsScreen;