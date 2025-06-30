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
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
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
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerBlur}>
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
              { backgroundColor: driver?.isOnline ? '#4ade80' : '#64748b' }
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
    </LinearGradient>
  );

  const renderStats = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        <Card style={styles.statCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="cube" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>{activeOrders?.length || 0}</Text>
            <Text style={styles.statLabel}>Available Orders</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient
            colors={['#4ade80', '#22c55e']}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="star" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIcon}>
              <Ionicons name="cash" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statValue}>$0</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </LinearGradient>
        </Card>
      </ScrollView>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AcceptedOrders')}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.quickActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="list" size={24} color="#ffffff" />
            <Text style={styles.quickActionText}>Accepted Orders</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={handleRefresh}
        >
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            style={styles.quickActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="refresh" size={24} color="#ffffff" />
            <Text style={styles.quickActionText}>Refresh Orders</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatusCard = () => (
    <Card style={styles.statusCard}>
      <LinearGradient
        colors={driver?.isOnline ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
        style={styles.statusGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
      </LinearGradient>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
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
              tintColor="#667eea"
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
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  onlineToggleActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  onlineToggleInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
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
    color: '#ffffff',
  },
  onlineToggleTextInactive: {
    color: 'rgba(255, 255, 255, 0.8)',
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
    padding: 0,
    overflow: 'hidden',
  },
  statGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
    padding: 0,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 24,
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
    overflow: 'hidden',
  },
  quickActionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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