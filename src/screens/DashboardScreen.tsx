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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Haptics from 'react-native-haptic-feedback';

import IncomingOrderModal from '../components/IncomingOrderModal';
import AppLogo from '../components/AppLogo';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '@/types';
import { Design, getCardStyle } from '../constants/designSystem';
import { orderActionService } from '../services/orderActionService';
import { notificationService } from '../services/notificationService';

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
    setOrderNotificationCallback,
    canAcceptOrder 
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
      setIncomingOrder(order);
      setShowIncomingModal(true);
      Haptics.trigger('notificationSuccess');
    };
    
    setOrderNotificationCallback(handleNewOrder);

    // Also set up push notification callback for background wake-up
    notificationService.setNotificationCallbacks({
      onNewOrder: handleNewOrder
    });

    return () => {
      setOrderNotificationCallback(null);
    };
  }, [setOrderNotificationCallback, fadeAnim, slideAnim]);

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
    
    Haptics.trigger('notificationSuccess');
    setShowIncomingModal(false);
    
    try {
      const result = await acceptOrder(orderId);
      if (result) {
        // Navigate directly to route screen instead of showing popup
        navigation.navigate('RouteNavigation');
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept order';
      Alert.alert('Error', `Failed to accept order: ${errorMessage}`);
    }
  }, [acceptOrder, navigation]);

  const handleAcceptRoute = useCallback(async (routeId: string) => {
    
    Haptics.trigger('notificationSuccess');
    setShowIncomingModal(false);
    
    try {
      const result = await orderActionService.acceptRoute(routeId, {}, {
        showConfirmation: false,
        onSuccess: () => {
          // Navigate directly to route screen
          navigation.navigate('RouteNavigation');
        },
        onError: (error) => {
          Alert.alert('Error', `Failed to accept route: ${error}`);
        }
      });
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to accept route');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept route';
      Alert.alert('Error', errorMessage);
    }
  }, [orderActionService, navigation]);

  const handleDeclineOrder = useCallback(async (orderId: string) => {
    Haptics.trigger('impactLight');
    setShowIncomingModal(false);
    
    try {
      await declineOrder(orderId);
      Alert.alert('Order Declined', 'The order has been declined');
    } catch (error) {
      Alert.alert('Error', 'Failed to decline order');
    }
  }, [declineOrder]);

  const handleSkipOrder = useCallback(async (orderId: string) => {
    Haptics.trigger('selection');
    setShowIncomingModal(false);
    
    try {
      console.log('⏭️ Skipping order:', orderId);
      const result = await orderActionService.skipOrder(orderId, {
        showConfirmation: false,
        onSuccess: () => {
          console.log('✅ Order skipped successfully');
          // Refresh orders to update the available list
          refreshOrders().catch(() => {
            console.warn('Failed to refresh orders after skip');
          });
        },
        onError: (error) => {
          console.error('❌ Failed to skip order:', error);
          Alert.alert('Error', 'Failed to skip order');
        }
      });
      
      if (result.success) {
        console.log('🎉 Order skipped and marked as viewed - won\'t appear again');
      }
    } catch (error) {
      console.error('❌ Error in handleSkipOrder:', error);
      Alert.alert('Error', 'Failed to skip order');
    }
  }, [refreshOrders]);

  // Test function to trigger popup manually
  const testIncomingOrder = useCallback(() => {
    const testDeliveryId = `test-delivery-${Date.now()}`;
    const testOrder: Order = {
      id: testDeliveryId, // Use delivery ID as the primary ID
      deliveryId: testDeliveryId, // Store delivery ID separately 
      order_number: `TEST-${Math.floor(Math.random() * 1000)}`,
      customer_details: { 
        id: 'test-customer', 
        name: 'Test Customer',
        phone: '+1234567890'
      },
      delivery_address: 'Test Delivery Address, Ajman',
      pickup_address: 'Test Pickup Location',
      total: 45.50,
      delivery_fee: 12.00,
      delivery_type: 'food',
      priority: 'high',
      status: 'pending',
      created_at: new Date(),
      estimated_delivery_time: '25 min'
    };
    
    setIncomingOrder(testOrder);
    setShowIncomingModal(true);
    Haptics.trigger('notificationSuccess');
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <AppLogo size="small" showText={false} style={styles.headerLogo} />
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good Morning' : 
               new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.driverName}>{driver?.firstName || 'Driver'}</Text>
          </View>
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
            driver?.isOnline ? styles.onlineIndicatorActive : styles.onlineIndicatorInactive
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
        <View style={[styles.statCard, styles.statCardBlue]}>
          <View style={styles.statIcon}>
            <Ionicons name="cube" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{activeOrders?.length || 0}</Text>
          <Text style={styles.statLabel}>Available Orders</Text>
        </View>

        <View style={[styles.statCard, styles.statCardGreen]}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={[styles.statCard, styles.statCardYellow]}>
          <View style={styles.statIcon}>
            <Ionicons name="star" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>

        <View style={[styles.statCard, styles.statCardPurple]}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>$0</Text>
          <Text style={styles.statLabel}>Today&apos;s Earnings</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionButton, styles.quickActionButtonPurple]}
          onPress={() => navigation.navigate('AcceptedOrders')}
        >
          <Ionicons name="list" size={24} color="#ffffff" />
          <Text style={styles.quickActionText}>Accepted Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionButton, styles.quickActionButtonBlue]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="#ffffff" />
          <Text style={styles.quickActionText}>Refresh Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionButton, styles.quickActionButtonYellow]}
          onPress={testIncomingOrder}
        >
          <Ionicons name="notifications" size={24} color="#ffffff" />
          <Text style={styles.quickActionText}>Test Popup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailableOrders = () => (
    <View style={styles.availableOrdersContainer}>
      <View style={styles.availableOrdersHeader}>
        <Text style={styles.sectionTitle}>Available Orders</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      {activeOrders && activeOrders.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.availableOrdersScroll}>
          {activeOrders.slice(0, 5).map((order) => {
            const canAccept = canAcceptOrder(order);
            return (
              <View key={order.id} style={[
                styles.availableOrderCard,
                !canAccept && styles.disabledOrderCard
              ]}>
                <View style={styles.orderCardHeader}>
                  <Text style={styles.orderNumber}>#{order.order_number || order.id}</Text>
                  <View style={[styles.orderTypeBadge, 
                    order.delivery_type === 'food' && styles.foodBadge,
                    order.delivery_type === 'fast' && styles.fastBadge,
                  ]}>
                    <Text style={styles.orderTypeText}>{(order.delivery_type || 'regular').toUpperCase()}</Text>
                  </View>
                </View>
                
                <View style={styles.orderDetails}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {order.customer_details?.name || 'Customer'}
                  </Text>
                  <Text style={styles.deliveryAddress} numberOfLines={2}>
                    {order.delivery_address || 'Delivery location'}
                  </Text>
                </View>
                
                <View style={styles.orderMetrics}>
                  <View style={styles.orderMetric}>
                    <Ionicons name="cash-outline" size={14} color="#666" />
                    <Text style={styles.metricValue}>${order.total || '0.00'}</Text>
                  </View>
                  <View style={styles.orderMetric}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.metricValue}>2.5 km</Text>
                  </View>
                </View>
                
                {!canAccept && (
                  <View style={styles.capacityWarning}>
                    <Ionicons name="information-circle" size={14} color="#F59E0B" />
                    <Text style={styles.capacityWarningText}>
                      {order.delivery_type === 'food' || order.delivery_type === 'fast' 
                        ? 'Complete current orders first' 
                        : 'At capacity (5 orders max)'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.orderActions}>
                  <TouchableOpacity 
                    style={styles.miniDeclineButton}
                    onPress={() => handleDeclineOrder(order.id)}
                  >
                    <Ionicons name="close" size={16} color="#FF4757" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.miniAcceptButton,
                      !canAccept && styles.disabledAcceptButton
                    ]}
                    onPress={() => canAccept && handleAcceptOrder(order.id)}
                    disabled={!canAccept}
                  >
                    <Ionicons name="checkmark" size={16} color={canAccept ? "#fff" : "#999"} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          
          {activeOrders.length > 5 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('AcceptedOrders')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Text style={styles.viewAllCount}>+{activeOrders.length - 5}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <View style={styles.noOrdersContainer}>
          <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
          <Text style={styles.noOrdersText}>No available orders</Text>
          <Text style={styles.noOrdersSubtext}>
            {driver?.isOnline ? 'New orders will appear here' : 'Go online to see available orders'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderStatusCard = () => (
    <View style={[
      styles.statusCard,
      driver?.isOnline ? styles.statusCardOnline : styles.statusCardOffline
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
          {renderAvailableOrders()}
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
        onAcceptRoute={handleAcceptRoute}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: Design.colors.background,
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    marginRight: Design.spacing[3],
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    ...Design.typography.label,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[1],
  },
  driverName: {
    ...Design.typography.h3,
    color: Design.colors.text,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.full,
    backgroundColor: Design.colors.gray100,
  },
  onlineToggleActive: {
    backgroundColor: Design.colors.successBackground,
  },
  onlineToggleInactive: {
    backgroundColor: Design.colors.gray100,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Design.spacing[2],
  },
  onlineToggleText: {
    ...Design.typography.label,
  },
  onlineToggleTextActive: {
    color: Design.colors.success,
  },
  onlineToggleTextInactive: {
    color: Design.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  statsContainer: {
    marginTop: Design.spacing[5],
  },
  statsScroll: {
    paddingHorizontal: Design.spacing[5],
    gap: Design.spacing[4],
  },
  statCard: {
    width: 120,
    height: 120,
    borderRadius: Design.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Design.spacing[4],
    ...Design.shadows.medium,
  },
  statIcon: {
    marginBottom: Design.spacing[2],
  },
  statValue: {
    ...Design.typography.h4,
    color: Design.colors.textInverse,
    marginBottom: Design.spacing[1],
  },
  statLabel: {
    ...Design.typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statusCard: {
    margin: Design.spacing[5],
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[6],
    ...Design.shadows.medium,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[2],
  },
  statusTitle: {
    ...Design.typography.h4,
    color: Design.colors.textInverse,
    marginLeft: Design.spacing[3],
  },
  statusSubtitle: {
    ...Design.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Design.spacing[4],
  },
  goOnlineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Design.spacing[6],
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.xl,
  },
  goOnlineButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
  },
  quickActionsContainer: {
    paddingHorizontal: Design.spacing[5],
    marginTop: Design.spacing[5],
  },
  sectionTitle: {
    ...Design.typography.h4,
    color: Design.colors.text,
    marginBottom: Design.spacing[4],
  },
  quickActions: {
    flexDirection: 'row',
    gap: Design.spacing[3],
    flexWrap: 'wrap',
  },
  quickActionButton: {
    flex: 1,
    minWidth: 100,
    height: 80,
    borderRadius: Design.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Design.shadows.medium,
  },
  quickActionText: {
    ...Design.typography.buttonSmall,
    color: Design.colors.textInverse,
    marginTop: Design.spacing[2],
    textAlign: 'center',
  },
  availableOrdersContainer: {
    paddingHorizontal: Design.spacing[5],
    marginTop: Design.spacing[5],
  },
  availableOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[4],
  },
  refreshButton: {
    padding: Design.spacing[2],
    borderRadius: Design.borderRadius.base,
    backgroundColor: 'rgba(103, 126, 234, 0.1)',
  },
  availableOrdersScroll: {
    marginBottom: Design.spacing[2],
  },
  availableOrderCard: {
    ...getCardStyle(),
    marginRight: Design.spacing[4],
    width: 280,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[3],
  },
  orderNumber: {
    ...Design.typography.body,
    fontWeight: '700',
    color: Design.colors.text,
  },
  orderTypeBadge: {
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.md,
  },
  foodBadge: {
    backgroundColor: Design.colors.error,
  },
  fastBadge: {
    backgroundColor: Design.colors.warning,
  },
  orderTypeText: {
    ...Design.typography.overline,
    color: Design.colors.textInverse,
  },
  orderDetails: {
    marginBottom: Design.spacing[3],
  },
  customerName: {
    ...Design.typography.label,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  deliveryAddress: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    lineHeight: 16,
  },
  orderMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Design.spacing[4],
  },
  orderMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[1],
  },
  metricValue: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontWeight: '500',
  },
  orderActions: {
    flexDirection: 'row',
    gap: Design.spacing[2],
  },
  miniDeclineButton: {
    flex: 1,
    backgroundColor: Design.colors.errorBackground,
    borderRadius: Design.borderRadius.md,
    paddingVertical: Design.spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Design.colors.errorBorder,
  },
  miniAcceptButton: {
    flex: 2,
    backgroundColor: Design.colors.success,
    borderRadius: Design.borderRadius.md,
    paddingVertical: Design.spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    backgroundColor: Design.colors.gray100,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Design.colors.border,
  },
  viewAllText: {
    ...Design.typography.label,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[1],
  },
  viewAllCount: {
    ...Design.typography.caption,
    color: Design.colors.textTertiary,
  },
  noOrdersContainer: {
    alignItems: 'center',
    paddingVertical: Design.spacing[8],
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    marginHorizontal: Design.spacing[1],
  },
  noOrdersText: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[3],
    marginBottom: Design.spacing[1],
  },
  noOrdersSubtext: {
    ...Design.typography.bodySmall,
    color: Design.colors.textTertiary,
    textAlign: 'center',
  },
  disabledOrderCard: {
    opacity: 0.7,
    borderColor: Design.colors.gray300,
  },
  disabledAcceptButton: {
    backgroundColor: Design.colors.gray400,
    opacity: 0.5,
  },
  capacityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.warningBackground,
    padding: Design.spacing[2],
    borderRadius: Design.borderRadius.sm,
    marginBottom: Design.spacing[2],
    gap: Design.spacing[1],
  },
  capacityWarningText: {
    ...Design.typography.caption,
    color: Design.colors.warning,
    flex: 1,
    fontSize: 11,
  },
  statusCardOnline: {
    backgroundColor: '#10B981',
  },
  statusCardOffline: {
    backgroundColor: '#6B7280',
  },
  onlineIndicatorActive: {
    backgroundColor: '#10B981',
  },
  onlineIndicatorInactive: {
    backgroundColor: '#6B7280',
  },
  statCardBlue: {
    backgroundColor: '#3B82F6',
  },
  statCardGreen: {
    backgroundColor: '#10B981',
  },
  statCardYellow: {
    backgroundColor: '#F59E0B',
  },
  statCardPurple: {
    backgroundColor: '#8B5CF6',
  },
  quickActionButtonPurple: {
    backgroundColor: '#8B5CF6',
  },
  quickActionButtonBlue: {
    backgroundColor: '#3B82F6',
  },
  quickActionButtonYellow: {
    backgroundColor: '#F59E0B',
  },
});

export default DashboardScreen;