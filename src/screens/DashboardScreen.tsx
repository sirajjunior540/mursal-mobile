import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Haptics from 'react-native-haptic-feedback';

import Card from '../components/ui/Card';
import IncomingOrderModal from '../components/IncomingOrderModal';

import { useOrders } from '../contexts/OrderContext';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStackParamList extends Record<string, object | undefined> {
  AcceptedOrders: undefined;
  Dashboard: undefined;
}

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { 
    orders: activeOrders, 
    refreshOrders, 
    acceptOrder, 
    declineOrder,
    setOrderNotificationCallback 
  } = useOrders();
  const { driver, updateOnlineStatus } = useDriver();
  
  const [refreshing, setRefreshing] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Set up notification callback for new orders
    const handleNewOrder = (order: Order) => {
      console.log('📱 New order received in Dashboard:', order.id);
      setIncomingOrder(order);
      setShowIncomingModal(true);
      Haptics.trigger('notificationSuccess');
    };
    
    setOrderNotificationCallback(handleNewOrder);

    return () => {
      setOrderNotificationCallback(null);
    };
  }, [setOrderNotificationCallback]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.trigger('impactLight');
    await refreshOrders();
    setRefreshing(false);
  }, [refreshOrders]);

  const handleToggleOnline = useCallback(async () => {
    if (driver) {
      Haptics.trigger('impactMedium');
      try {
        await updateOnlineStatus(!driver.isOnline);
      } catch (error) {
        Alert.alert('Error', 'Failed to update online status');
      }
    }
  }, [driver, updateOnlineStatus]);

  const handleAcceptOrder = useCallback(async (orderId: string) => {
    console.log('✅ Accepting order:', orderId);
    Haptics.trigger('notificationSuccess');
    setShowIncomingModal(false);
    
    try {
      const result = await acceptOrder(orderId);
      if (result) {
        Alert.alert('Success', 'Order accepted successfully!', [
          { 
            text: 'View Accepted Orders', 
            onPress: () => navigation.navigate('AcceptedOrders') 
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  }, [acceptOrder, navigation]);

  const handleDeclineOrder = useCallback(async (orderId: string) => {
    console.log('❌ Declining order:', orderId);
    Haptics.trigger('impactLight');
    setShowIncomingModal(false);
    
    try {
      await declineOrder(orderId);
      Alert.alert('Order Declined', 'The order has been declined');
    } catch (error) {
      console.error('Error declining order:', error);
      Alert.alert('Error', 'Failed to decline order');
    }
  }, [declineOrder]);

  const handleSkipOrder = useCallback((orderId: string) => {
    console.log('⏭️ Skipping order:', orderId);
    Haptics.trigger('selectionClick');
    setShowIncomingModal(false);
    Alert.alert('Order Skipped', 'The order has been skipped and moved to available orders');
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.greeting}>
            {new Date().getHours() < 12 ? 'Good Morning' : 
             new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
          </Text>
          <Text style={styles.driverName}>{driver?.firstName || 'Driver'}</Text>
        </View>
        
        <TouchableOpacity
          onPress={handleToggleOnline}
          style={[
            styles.onlineToggle,
            driver?.isOnline ? styles.onlineToggleActive : styles.onlineToggleInactive
          ]}
        >
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: driver?.isOnline ? '#10B981' : '#6B7280' }
          ]} />
          <Text style={[
            styles.onlineToggleText,
            driver?.isOnline ? styles.onlineToggleTextActive : styles.onlineToggleTextInactive
          ]}>
            {driver?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="cube" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{activeOrders?.length || 0}</Text>
          <Text style={styles.statLabel}>Available Orders</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="star" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>$0</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#8B5CF6' }]}
          onPress={() => navigation.navigate('AcceptedOrders')}
        >
          <Ionicons name="list" size={24} color="#ffffff" />
          <Text style={styles.quickActionText}>Accepted Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: '#3B82F6' }]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="#ffffff" />
          <Text style={styles.quickActionText}>Refresh Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatusCard = () => (
    <View style={[
      styles.statusCard,
      { backgroundColor: driver?.isOnline ? '#10B981' : '#6B7280' }
    ]}>
      <View style={styles.statusContent}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={driver?.isOnline ? 'radio' : 'radio-outline'} 
            size={28} 
            color="#ffffff" 
          />
          <Text style={styles.statusTitle}>
            {driver?.isOnline ? 'You are Online' : 'You are Offline'}
          </Text>
        </View>
        <Text style={styles.statusSubtitle}>
          {driver?.isOnline 
            ? 'Ready to receive new delivery orders' 
            : 'Go online to start receiving orders'}
        </Text>
        {!driver?.isOnline && (
          <TouchableOpacity onPress={handleToggleOnline} style={styles.goOnlineButton}>
            <Text style={styles.goOnlineButtonText}>Go Online</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader()}
        
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {renderStats()}
          {renderStatusCard()}
          {renderQuickActions()}
        </ScrollView>
      </SafeAreaView>

      <IncomingOrderModal
        visible={showIncomingModal}
        order={incomingOrder}
        onAccept={handleAcceptOrder}
        onDecline={handleDeclineOrder}
        onSkip={handleSkipOrder}
        onClose={() => setShowIncomingModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '700',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  onlineToggleActive: {
    backgroundColor: '#DCFCE7',
  },
  onlineToggleInactive: {
    backgroundColor: '#F3F4F6',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  onlineToggleTextActive: {
    color: '#059669',
  },
  onlineToggleTextInactive: {
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  statsContainer: {
    marginTop: 20,
  },
  statsScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    width: 120,
    height: 120,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 12,
  },
  statusSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  goOnlineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  goOnlineButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;