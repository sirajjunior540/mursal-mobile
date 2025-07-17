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
import OrderDetailsModal from '../components/OrderDetailsModal';
import AppLogo from '../components/AppLogo';
import FloatingQRButton from '../components/FloatingQRButton';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '@/types';
import { QRScanResult } from '../types/tracking';
import { Design, getCardStyle } from '../constants/designSystem';
import { orderActionService } from '../services/orderActionService';
import { notificationService } from '../services/notificationService';

interface DashboardStackParamList extends Record<string, object | undefined> {
  AvailableOrders: undefined;
  AcceptedOrders: undefined;
  Navigation: undefined;
  History: undefined;
}

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'Home'>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { 
    orders: availableOrders, 
    driverOrders: activeOrders,
    refreshOrders, 
    getDriverOrders,
    acceptOrder, 
    declineOrder,
    setOrderNotificationCallback,
    canAcceptOrder 
  } = useOrders();
  const { driver, updateOnlineStatus, balance, getDriverBalance } = useDriver();
  
  const [refreshing, setRefreshing] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true);
  const [showAvailableOrders, setShowAvailableOrders] = useState(true);
  const [showActiveDeliveries, setShowActiveDeliveries] = useState(true);
  
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
    await Promise.all([
      refreshOrders(),
      getDriverOrders(),
      getDriverBalance(),
    ]);
    setRefreshing(false);
  }, [refreshOrders, getDriverOrders, getDriverBalance]);

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
        navigation.navigate('Navigation');
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept order';
      Alert.alert('Error', `Failed to accept order: ${errorMessage}`);
    }
  }, [acceptOrder, navigation]);

  const handleAcceptRoute = useCallback(async (routeId: string, orderData?: any) => {
    
    Haptics.trigger('notificationSuccess');
    setShowIncomingModal(false);
    
    try {
      const result = await orderActionService.acceptRoute(routeId, orderData || incomingOrder, {
        showConfirmation: false,
        onSuccess: () => {
          // Navigate directly to route screen
          navigation.navigate('Navigation');
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
  }, [orderActionService, navigation, incomingOrder]);

  const handleDeclineOrder = useCallback(async (deliveryId: string) => {
    Haptics.trigger('impactLight');
    setShowIncomingModal(false);
    
    try {
      await declineOrder(deliveryId);
      Alert.alert('Order Declined', 'The order has been declined');
    } catch (error) {
      Alert.alert('Error', 'Failed to decline order');
    }
  }, [declineOrder]);

  const handleSkipOrder = useCallback(async (deliveryId: string) => {
    Haptics.trigger('selection');
    setShowIncomingModal(false);
    
    try {
      console.log('⏭️ Skipping order with delivery ID:', deliveryId);
      const result = await orderActionService.skipOrder(deliveryId, {
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

  const handleShowOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
    Haptics.trigger('selection');
  }, []);

  const handleCloseOrderDetails = useCallback(() => {
    setShowOrderDetailsModal(false);
    setSelectedOrder(null);
  }, []);

  const handleOrderDetailsAccept = useCallback(async (orderId: string, newStatus: string) => {
    // For available orders, accept the order
    if (selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)) {
      handleCloseOrderDetails();
      await handleAcceptOrder(orderId);
    } else {
      // For active orders, update status
      // This would need to be implemented based on your status update logic
      console.log('Update order status to:', newStatus);
      handleCloseOrderDetails();
    }
  }, [handleAcceptOrder, handleCloseOrderDetails, selectedOrder, activeOrders]);

  const handleOrderDetailsNavigate = useCallback(() => {
    handleCloseOrderDetails();
    navigation.navigate('Navigation');
  }, [navigation, handleCloseOrderDetails]);

  const handleQRScanResult = useCallback((result: QRScanResult) => {
    if (result.success) {
      console.log('QR Code scanned:', result.data);
      
      // Handle different types of QR codes
      if (result.data) {
        // Check if it's an order number or tracking code
        if (result.data.match(/^(ORD|ORDER|#)/i)) {
          // It's an order number - navigate to order details
          const orderId = result.data.replace(/^(ORD|ORDER|#)/i, '');
          Alert.alert(
            'Order QR Code',
            `Order ${orderId} detected. Would you like to view details?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'View Order', 
                onPress: () => {
                  // Navigate to order details if it exists
                  console.log('Navigate to order:', orderId);
                }
              }
            ]
          );
        } else {
          // Generic QR code - show the data
          Alert.alert(
            'QR Code Scanned',
            `Data: ${result.data}`,
            [{ text: 'OK' }]
          );
        }
      }
    } else {
      Alert.alert('Scan Failed', result.message || 'Failed to scan QR code');
    }
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
          <Text style={styles.statLabel}>Active Deliveries</Text>
        </View>

        <View style={[styles.statCard, styles.statCardGreen]}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>{balance?.totalDeliveries || driver?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>

        <View style={[styles.statCard, styles.statCardYellow]}>
          <View style={styles.statIcon}>
            <Ionicons name="star" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>
            {balance?.averageRating?.toFixed(1) || driver?.rating?.toFixed(1) || '0.0'}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>

        <View style={[styles.statCard, styles.statCardPurple]}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>
            ${balance?.todayEarnings?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.statLabel}>Today&apos;s Earnings</Text>
        </View>

        <View style={[styles.statCard, styles.statCardOrange]}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statValue}>
            {balance?.averageDeliveryTime ? `${balance.averageDeliveryTime.toFixed(0)}m` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Avg Time</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderPerformanceMetrics = () => (
    <View style={styles.performanceContainer}>
      <View style={styles.collapsibleCard}>
        <TouchableOpacity 
          style={styles.collapsibleHeader}
          onPress={() => {
            Haptics.trigger('selection');
            setShowPerformanceMetrics(!showPerformanceMetrics);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.collapsibleHeaderLeft}>
            <View style={styles.collapsibleHeaderIcon}>
              <Ionicons name="analytics" size={16} color="#3B82F6" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              {!showPerformanceMetrics && (
                <Text style={styles.summaryText}>
                  {balance?.completedOrders || 0} completed • {balance?.successRate ? `${balance.successRate.toFixed(0)}%` : '0%'} success rate
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {showPerformanceMetrics && (
          <View style={styles.collapsibleContent}>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceIcon, styles.performanceIconPurple]}>
                  <Ionicons name="list-outline" size={18} color="#ffffff" />
                </View>
                <Text style={styles.performanceValue}>{balance?.availableOrders || 0}</Text>
                <Text style={styles.performanceLabel}>Available</Text>
              </View>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceIcon, styles.performanceIconGreen]}>
                  <Ionicons name="checkmark-done-outline" size={18} color="#ffffff" />
                </View>
                <Text style={styles.performanceValue}>{balance?.completedOrders || 0}</Text>
                <Text style={styles.performanceLabel}>Completed</Text>
              </View>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceIcon, styles.performanceIconOrange]}>
                  <Ionicons name="today-outline" size={18} color="#ffffff" />
                </View>
                <Text style={styles.performanceValue}>{balance?.todayCompletedOrders || 0}</Text>
                <Text style={styles.performanceLabel}>Today</Text>
              </View>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceIcon, styles.performanceIconRed]}>
                  <Ionicons name="trending-up-outline" size={18} color="#ffffff" />
                </View>
                <Text style={styles.performanceValue}>
                  {balance?.successRate ? `${balance.successRate.toFixed(0)}%` : '0%'}
                </Text>
                <Text style={styles.performanceLabel}>Success Rate</Text>
              </View>
            </View>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.collapseArrow}
          onPress={() => {
            Haptics.trigger('selection');
            setShowPerformanceMetrics(!showPerformanceMetrics);
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showPerformanceMetrics ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderAvailableOrders = () => (
    <View style={styles.availableOrdersContainer}>
      <View style={styles.collapsibleCard}>
        <TouchableOpacity 
          style={styles.collapsibleHeader}
          onPress={() => {
            Haptics.trigger('selection');
            setShowAvailableOrders(!showAvailableOrders);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.collapsibleHeaderLeft}>
            <View style={styles.collapsibleHeaderIcon}>
              <Ionicons name="cube-outline" size={16} color="#3B82F6" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.sectionTitle}>Available Orders</Text>
              {!showAvailableOrders && (
                <Text style={styles.summaryText}>
                  {driver?.isOnline ? 'Ready to accept new orders' : 'Go online to see orders'}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.collapsibleHeaderRight}>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        {showAvailableOrders && (
          <View style={styles.collapsibleContent}>
            {availableOrders && availableOrders.length > 0 ? (
              <View style={styles.availableOrdersList}>
                {availableOrders.filter(order => canAcceptOrder(order)).slice(0, 5).map((order, index) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.availableOrderItem}
                    onPress={() => handleShowOrderDetails(order)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderItemLeft}>
                      <Text style={styles.orderItemNumber}>#{order.order_number || order.id}</Text>
                      <Text style={styles.orderItemCustomer}>
                        {order.customer?.name || 'Unknown Customer'}
                      </Text>
                    </View>
                    <View style={styles.orderItemRight}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemStatus}>{order.status}</Text>
                        <Text style={styles.orderItemTime}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                    </View>
                  </TouchableOpacity>
                ))}
                {availableOrders.filter(order => canAcceptOrder(order)).length > 5 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('AvailableOrders')}
                  >
                    <Text style={styles.viewAllButtonText}>View all {availableOrders.filter(order => canAcceptOrder(order)).length} orders</Text>
                    <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noAvailableOrders}>
                <Ionicons name="cube-outline" size={32} color="#6B7280" />
                <Text style={styles.noAvailableOrdersText}>No available orders</Text>
                <Text style={styles.noAvailableOrdersSubtext}>
                  {driver?.isOnline 
                    ? 'New orders will appear here when available' 
                    : 'Go online to see available orders'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.collapseArrow}
          onPress={() => {
            Haptics.trigger('selection');
            setShowAvailableOrders(!showAvailableOrders);
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showAvailableOrders ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      </View>
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
            size={24} 
            color="#ffffff" 
          />
          <Text style={styles.statusTitle}>
            {driver?.isOnline ? 'You are Online' : 'You are Offline'}
          </Text>
        </View>
        <Text style={styles.statusSubtitle}>
          {driver?.isOnline 
            ? 'Ready to receive orders' 
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

  const renderActiveDeliveries = () => (
    <View style={styles.activeDeliveriesContainer}>
      <View style={styles.collapsibleCard}>
        <TouchableOpacity 
          style={styles.collapsibleHeader}
          onPress={() => {
            Haptics.trigger('selection');
            setShowActiveDeliveries(!showActiveDeliveries);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.collapsibleHeaderLeft}>
            <View style={styles.collapsibleHeaderIcon}>
              <Ionicons name="car-outline" size={16} color="#10B981" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              {!showActiveDeliveries && (
                <Text style={styles.summaryText}>
                  {activeOrders?.length || 0} active {activeOrders?.length === 1 ? 'delivery' : 'deliveries'}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {showActiveDeliveries && (
          <View style={styles.collapsibleContent}>
            {activeOrders && activeOrders.length > 0 ? (
              <View style={styles.activeOrdersList}>
                {activeOrders.slice(0, 3).map((order, index) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.activeOrderItem}
                    onPress={() => handleShowOrderDetails(order)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderItemLeft}>
                      <Text style={styles.orderItemNumber}>#{order.order_number || order.id}</Text>
                      <Text style={styles.orderItemCustomer}>
                        {order.customer?.name || 'Unknown Customer'}
                      </Text>
                    </View>
                    <View style={styles.orderItemRight}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemStatus}>{order.status}</Text>
                        <Text style={styles.orderItemTime}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))}
                {activeOrders.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('Navigation')}
                  >
                    <Text style={styles.viewAllButtonText}>View all {activeOrders.length} orders</Text>
                    <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noActiveOrders}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
                <Text style={styles.noActiveOrdersText}>No active deliveries</Text>
                <Text style={styles.noActiveOrdersSubtext}>All deliveries completed</Text>
              </View>
            )}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.collapseArrow}
          onPress={() => {
            Haptics.trigger('selection');
            setShowActiveDeliveries(!showActiveDeliveries);
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showActiveDeliveries ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>
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
          {renderStatusCard()}
          {renderStats()}
          {renderPerformanceMetrics()}
          {renderActiveDeliveries()}
          {renderAvailableOrders()}
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

      <OrderDetailsModal
        visible={showOrderDetailsModal}
        order={selectedOrder}
        onClose={handleCloseOrderDetails}
        onStatusUpdate={handleOrderDetailsAccept}
        onNavigate={handleOrderDetailsNavigate}
        showStatusButton={selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)}
        readonly={selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)}
        title={selectedOrder && activeOrders?.some(o => o.id === selectedOrder.id) ? 'Active Delivery Details' : 'Order Details'}
      />

      <FloatingQRButton
        onScanResult={handleQRScanResult}
        bottom={100}
        right={20}
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
    marginTop: Design.spacing[4],
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
    padding: Design.spacing[4],
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
  sectionTitle: {
    ...Design.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: 0,
  },
  availableOrdersContainer: {
    paddingHorizontal: Design.spacing[5],
    marginTop: Design.spacing[4],
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
  featuredOrdersScroll: {
    marginBottom: Design.spacing[4],
  },
  featuredOrderCard: {
    ...getCardStyle(),
    marginRight: Design.spacing[4],
    width: 280,
  },
  orderListContainer: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    marginHorizontal: Design.spacing[1],
    ...Design.shadows.small,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  orderListTitle: {
    ...Design.typography.label,
    fontWeight: '600',
    color: Design.colors.textSecondary,
    paddingHorizontal: Design.spacing[4],
    paddingTop: Design.spacing[4],
    paddingBottom: Design.spacing[2],
  },
  orderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  orderListLeft: {
    flex: 2,
  },
  orderListCenter: {
    flex: 1,
    alignItems: 'center',
  },
  orderListRight: {
    width: 24,
    alignItems: 'center',
  },
  orderListNumber: {
    ...Design.typography.bodySmall,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  orderListCustomer: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  orderListTotal: {
    ...Design.typography.bodySmall,
    fontWeight: '600',
    color: Design.colors.success,
    marginBottom: Design.spacing[1],
  },
  orderListDistance: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  disabledOrderListItem: {
    opacity: 0.6,
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
  statCardOrange: {
    backgroundColor: '#F97316',
  },
  performanceContainer: {
    marginHorizontal: Design.spacing[5],
    marginTop: Design.spacing[4],
  },
  collapseArrow: {
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
  },
  collapsibleCard: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    ...Design.shadows.small,
    borderWidth: 1,
    borderColor: Design.colors.border,
    marginBottom: Design.spacing[3],
    minHeight: 70,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  summaryText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[1],
  },
  collapsibleHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
    marginTop: 2,
  },
  collapsibleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsibleContent: {
    paddingHorizontal: Design.spacing[4],
    paddingBottom: Design.spacing[3],
  },
  activeDeliveriesContainer: {
    marginHorizontal: Design.spacing[5],
    marginTop: Design.spacing[4],
  },
  activeOrdersList: {
    gap: Design.spacing[2],
  },
  activeOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[3],
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  orderItemLeft: {
    flex: 1,
  },
  orderItemNumber: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  orderItemCustomer: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  orderItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  orderItemInfo: {
    alignItems: 'flex-end',
  },
  orderItemStatus: {
    ...Design.typography.caption,
    color: Design.colors.success,
    fontWeight: '600',
    marginBottom: Design.spacing[1],
  },
  orderItemTime: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    backgroundColor: Design.colors.primaryLight,
    borderRadius: Design.borderRadius.md,
    marginTop: Design.spacing[2],
    gap: Design.spacing[2],
  },
  viewAllButtonText: {
    ...Design.typography.button,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  noActiveOrders: {
    alignItems: 'center',
    paddingVertical: Design.spacing[6],
  },
  noActiveOrdersText: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[3],
    marginBottom: Design.spacing[1],
  },
  noActiveOrdersSubtext: {
    ...Design.typography.caption,
    color: Design.colors.textTertiary,
    textAlign: 'center',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceItem: {
    width: '48%',
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.md,
    padding: Design.spacing[4],
    alignItems: 'center',
    marginBottom: Design.spacing[3],
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  performanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Design.spacing[3],
  },
  performanceIconPurple: {
    backgroundColor: '#8B5CF6',
  },
  performanceIconGreen: {
    backgroundColor: '#10B981',
  },
  performanceIconOrange: {
    backgroundColor: '#F59E0B',
  },
  performanceIconRed: {
    backgroundColor: '#EF4444',
  },
  performanceValue: {
    ...Design.typography.h4,
    fontWeight: '700',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  performanceLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeOrdersSummary: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    marginTop: Design.spacing[3],
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  summaryHeader: {
    marginBottom: Design.spacing[4],
  },
  summaryTitle: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  summarySubtitle: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  viewOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.primaryLight,
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    borderRadius: Design.borderRadius.md,
    gap: Design.spacing[2],
  },
  viewOrdersButtonText: {
    ...Design.typography.button,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  availableDeliveriesCard: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    marginTop: Design.spacing[3],
    borderWidth: 1,
    borderColor: Design.colors.primary,
    borderStyle: 'dashed',
  },
  deliveriesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveriesIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Design.borderRadius.md,
    backgroundColor: Design.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  deliveriesTextContainer: {
    flex: 1,
  },
  deliveriesTitle: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  deliveriesSubtext: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  availableOrdersList: {
    gap: Design.spacing[2],
  },
  availableOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[3],
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: Design.borderRadius.md,
    borderWidth: 1,
    borderColor: Design.colors.primary,
  },
  noAvailableOrders: {
    alignItems: 'center',
    paddingVertical: Design.spacing[6],
  },
  noAvailableOrdersText: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[3],
    marginBottom: Design.spacing[1],
  },
  noAvailableOrdersSubtext: {
    ...Design.typography.caption,
    color: Design.colors.textTertiary,
    textAlign: 'center',
  },
});

export default DashboardScreen;