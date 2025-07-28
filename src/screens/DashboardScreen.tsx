import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Haptics from 'react-native-haptic-feedback';

import IncomingOrderModal from '../components/IncomingOrderModal';
import { FlatOrderDetailsModal } from '../components/OrderDetails';
import FloatingQRButton from '../components/FloatingQRButton';
import {
  FlatDashboardHeader,
  FlatStatsCards,
  FlatPerformanceMetrics,
  FlatStatusCard,
  FlatAvailableOrdersCard,
} from '../components/Dashboard/flat';
import { EnhancedActiveDeliveriesCard } from '../components/Dashboard/EnhancedActiveDeliveriesCard';
import DriverBalanceCard from '../features/finance/components/DriverBalanceCard';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order, OrderStatus } from '@/types';
import { QRScanResult } from '../types/tracking';
import { Design } from '../constants/designSystem';
import { flatColors } from '../design/dashboard/flatColors';
import { orderActionService } from '../services/orderActionService';
import { notificationService } from '../services/notificationService';
import { apiService } from '../services/api';
import { cacheService } from '../services/comprehensiveCacheService';

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
    updateOrderStatus,
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
      console.log('🔥 [DashboardScreen] handleNewOrder called with order:', order.order_number || order.id);
      console.log('🔥 [DashboardScreen] Setting incoming order and showing modal...');
      setIncomingOrder(order);
      setShowIncomingModal(true);
      Haptics.trigger('notificationSuccess');
      console.log('🔥 [DashboardScreen] Modal should now be visible!');
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
    
    // Force refresh all data when user manually refreshes
    await Promise.all([
      refreshOrders(true),    // Force refresh available orders
      getDriverOrders(true),  // Force refresh driver orders
      getDriverBalance(),     // Get fresh balance
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
      console.log('🚀 Accepting batch route:', routeId, orderData?.current_batch);
      
      const result = await orderActionService.acceptRoute(routeId, orderData || incomingOrder, {
        showConfirmation: false,
        onSuccess: async () => {
          console.log('✅ Batch accepted successfully, refreshing orders...');
          
          // Refresh both available and driver orders
          await Promise.all([
            refreshOrders(),    // This will remove the accepted orders from available
            getDriverOrders()   // This will add them to driver's active orders
          ]);
          
          // Small delay to ensure data is loaded
          setTimeout(() => {
            // Navigate directly to route screen
            navigation.navigate('Navigation');
          }, 500);
        },
        onError: (error) => {
          console.error('❌ Failed to accept batch:', error);
          Alert.alert('Error', `Failed to accept route: ${error}`);
        }
      });
      
      if (!result.success) {
        console.error('❌ Accept route failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to accept route');
      }
    } catch (error) {
      console.error('💥 Exception in handleAcceptRoute:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept route';
      Alert.alert('Error', errorMessage);
    }
  }, [navigation, incomingOrder, refreshOrders, getDriverOrders]);

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
  }, []);

  const handleCloseOrderDetails = useCallback(() => {
    setShowOrderDetailsModal(false);
    setSelectedOrder(null);
  }, []);

  const handleOrderDetailsAccept = useCallback(async (orderId: string, newStatus: string, photoId?: string) => {
    // For available orders, accept the order
    if (selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)) {
      handleCloseOrderDetails();
      await handleAcceptOrder(orderId);
    } else {
      // For active orders, update status
      try {
        console.log('Updating order status to:', newStatus, 'with photoId:', photoId);
        const success = await updateOrderStatus(orderId, newStatus as OrderStatus, photoId);
        if (success) {
          // Refresh orders to reflect the status change
          await getDriverOrders();
          handleCloseOrderDetails();
        } else {
          Alert.alert('Error', 'Failed to update order status');
        }
      } catch (error) {
        console.error('Error updating order status:', error);
        Alert.alert('Error', 'Failed to update order status');
      }
    }
  }, [handleAcceptOrder, handleCloseOrderDetails, selectedOrder, activeOrders, updateOrderStatus, getDriverOrders]);

  const handleOrderDetailsNavigate = useCallback(() => {
    handleCloseOrderDetails();
    navigation.navigate('Navigation');
  }, [navigation, handleCloseOrderDetails]);

  const handleQRScanResult = useCallback((result: QRScanResult) => {
    if (result.success) {
      console.log('QR Code scanned:', result.data);
      
      // Handle different types of QR codes
      if (result.data) {
        // Check if it's an order batch data URL format: data:orderbatch...
        if (result.data.startsWith('data:orderbatch')) {
          try {
            // Extract the data after "data:orderbatch,"
            const dataContent = result.data.replace('data:orderbatch,', '');
            console.log('Extracted orderbatch data:', dataContent);
            
            // Try to parse as JSON
            const parsedData = JSON.parse(decodeURIComponent(dataContent));
            console.log('Parsed orderbatch data:', parsedData);
            
            // Extract order information
            const orderId = parsedData.order_id || parsedData.orderId || parsedData.id;
            const orderNumber = parsedData.order_number || parsedData.orderNumber;
            const batchId = parsedData.batch_id || parsedData.batchId;
            
            // First check if order is in active deliveries (already assigned to driver)
            const activeOrder = activeOrders?.find(order => 
              order.id === orderId ||
              order.order_number === orderNumber ||
              order.id === String(orderId) ||
              order.order_number === String(orderNumber)
            );
            
            if (activeOrder) {
              // Open order details modal instead of directly updating status
              setSelectedOrder(activeOrder);
              setShowOrderDetailsModal(true);
              Alert.alert(
                'Order Scanned',
                `Order #${activeOrder.order_number}\n\nPlease review the order details and update status from there.`,
                [{ text: 'OK' }]
              );
              return;
            } else {
              // Check if order is available but not assigned
              const availableOrder = availableOrders?.find(order => 
                order.id === orderId ||
                order.order_number === orderNumber ||
                order.id === String(orderId) ||
                order.order_number === String(orderNumber)
              );
              
              if (availableOrder) {
                // Order is available - show accept confirmation
                Alert.alert(
                  'Accept Order?',
                  `Order #${availableOrder.order_number}\n\nWould you like to accept this order?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Accept', 
                      onPress: async () => {
                        await handleAcceptOrder(availableOrder.id);
                      }
                    }
                  ]
                );
              } else {
                // Order not found in any list - driver not authorized
                console.log('Order not found in driver assignments:', { orderId, orderNumber, batchId });
                Alert.alert(
                  'Not Authorized', 
                  'This order is not assigned to you.',
                  [{ text: 'OK' }]
                );
              }
            }
            return;
          } catch (error) {
            console.error('Failed to parse orderbatch data:', error);
            Alert.alert('QR Code Error', 'Failed to parse order batch data from QR code.');
            return;
          }
        }
        
        // Check if it's the new pipe-delimited format: ORDER123|http://...|456|BATCH789
        if (result.data.includes('|')) {
          const parts = result.data.split('|');
          if (parts.length >= 3) {
            const orderIdentifier = parts[0]; // ORDER123
            const trackingUrl = parts[1]; // http://...
            const orderId = parts[2]; // 456
            const batchId = parts.length > 3 ? parts[3] : null; // BATCH789
            
            // Extract order number from identifier
            const orderNumber = orderIdentifier.replace(/^(ORD|ORDER|#)/i, '');
            
            // Apply same logic as data:orderbatch format
            const activeOrder = activeOrders?.find(order => 
              order.id === orderId || 
              order.order_number === orderNumber ||
              order.order_number === orderIdentifier
            );
            
            if (activeOrder) {
              // Open order details modal instead of directly updating status
              setSelectedOrder(activeOrder);
              setShowOrderDetailsModal(true);
              Alert.alert(
                'Order Scanned',
                `Order #${activeOrder.order_number}\n\nPlease review the order details and update status from there.`,
                [{ text: 'OK' }]
              );
              return;
            } else {
              const availableOrder = availableOrders?.find(order => 
                order.id === orderId || 
                order.order_number === orderNumber ||
                order.order_number === orderIdentifier
              );
              
              if (availableOrder) {
                Alert.alert(
                  'Accept Order?',
                  `Order #${availableOrder.order_number}\n\nWould you like to accept this order?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Accept', onPress: async () => await handleAcceptOrder(availableOrder.id) }
                  ]
                );
              } else {
                Alert.alert('Not Authorized', 'This order is not assigned to you.', [{ text: 'OK' }]);
              }
            }
            return;
          }
        }
        
        // Check if it's a simple order number or tracking code
        if (result.data.match(/^(ORD|ORDER|#)/i)) {
          // It's an order number - apply same security logic
          const orderNumber = result.data.replace(/^(ORD|ORDER|#)/i, '');
          
          const activeOrder = activeOrders?.find(order => 
            order.order_number === orderNumber ||
            order.order_number === result.data ||
            order.id === orderNumber
          );
          
          if (activeOrder) {
            // Open order details modal instead of directly updating status
            setSelectedOrder(activeOrder);
            setShowOrderDetailsModal(true);
            Alert.alert(
              'Order Scanned',
              `Order #${activeOrder.order_number}\n\nPlease review the order details and update status from there.`,
              [{ text: 'OK' }]
            );
            return;
          } else {
            const availableOrder = availableOrders?.find(order => 
              order.order_number === orderNumber ||
              order.order_number === result.data ||
              order.id === orderNumber
            );
            
            if (availableOrder) {
              Alert.alert(
                'Accept Order?',
                `Order #${availableOrder.order_number}\n\nWould you like to accept this order?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Accept', onPress: async () => await handleAcceptOrder(availableOrder.id) }
                ]
              );
            } else {
              Alert.alert('Not Authorized', 'This order is not assigned to you.', [{ text: 'OK' }]);
            }
          }
        } else {
          // Try to parse as JSON (legacy format)
          try {
            const parsedData = JSON.parse(result.data);
            if (parsedData.order_id || parsedData.orderId) {
              const orderId = parsedData.order_id || parsedData.orderId;
              
              // Apply same security logic for JSON format
              const activeOrder = activeOrders?.find(order => order.id === orderId);
              
              if (activeOrder) {
                // Open order details modal instead of directly updating status
                setSelectedOrder(activeOrder);
                setShowOrderDetailsModal(true);
                Alert.alert(
                  'Order Scanned',
                  `Order #${activeOrder.order_number}\n\nPlease review the order details and update status from there.`,
                  [{ text: 'OK' }]
                );
                return;
              } else {
                const availableOrder = availableOrders?.find(order => order.id === orderId);
                
                if (availableOrder) {
                  Alert.alert(
                    'Accept Order?',
                    `Order #${availableOrder.order_number}\n\nWould you like to accept this order?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Accept', onPress: async () => await handleAcceptOrder(availableOrder.id) }
                    ]
                  );
                } else {
                  Alert.alert('Not Authorized', 'This order is not assigned to you.', [{ text: 'OK' }]);
                }
              }
            } else {
              // Generic QR code
              Alert.alert('QR Code Scanned', `Data: ${result.data}`, [{ text: 'OK' }]);
            }
          } catch {
            // Not JSON, treat as generic QR code
            Alert.alert('QR Code Scanned', `Data: ${result.data}`, [{ text: 'OK' }]);
          }
        }
      }
    } else {
      Alert.alert('Scan Failed', result.message || 'Failed to scan QR code');
    }
  }, [availableOrders, activeOrders]);

  // Prepare stats data for StatsCards component
  const statsData = {
    activeDeliveries: activeOrders?.length || 0,
    totalOrders: balance?.totalDeliveries || driver?.totalDeliveries || 0,
    rating: balance?.averageRating || driver?.rating || 0,
    todayEarnings: balance?.todayEarnings || 0,
    averageDeliveryTime: balance?.averageDeliveryTime || null,
    trends: balance?.trends,
  };

  // Prepare performance data for PerformanceMetrics component
  const performanceData = {
    availableOrders: balance?.availableOrders || 0,
    completedOrders: balance?.completedOrders || 0,
    todayCompletedOrders: balance?.todayCompletedOrders || 0,
    successRate: balance?.successRate || 0,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatDashboardHeader
          driver={driver}
          isOnline={driver?.isOnline || false}
          onToggleOnline={handleToggleOnline}
        />
        
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
          <FlatStatusCard
            isOnline={driver?.isOnline || false}
            onToggleOnline={handleToggleOnline}
          />
          
          <FlatStatsCards stats={statsData} />
          
          <DriverBalanceCard 
            onRefresh={handleRefresh}
            compact={false}
          />
          
          <FlatPerformanceMetrics
            data={performanceData}
            isExpanded={showPerformanceMetrics}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowPerformanceMetrics(!showPerformanceMetrics);
            }}
          />
          
          <EnhancedActiveDeliveriesCard
            orders={activeOrders || []}
            isExpanded={showActiveDeliveries}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowActiveDeliveries(!showActiveDeliveries);
            }}
            onOrderPress={handleShowOrderDetails}
            onViewAll={() => navigation.navigate('Navigation')}
          />
          
          <FlatAvailableOrdersCard
            orders={availableOrders || []}
            isExpanded={showAvailableOrders}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowAvailableOrders(!showAvailableOrders);
            }}
            onRefresh={handleRefresh}
            onOrderPress={handleShowOrderDetails}
            onViewAll={() => navigation.navigate('AvailableOrders')}
            canAcceptOrder={canAcceptOrder}
            isOnline={driver?.isOnline || false}
            onAcceptBatch={async (batchId, orders) => {
              try {
                console.log('🚀 Accepting batch from available orders card:', batchId);
                const response = await apiService.acceptBatchOrder(batchId);
                if (response.success) {
                  Alert.alert('Success', 'Batch accepted successfully');
                  
                  // Invalidate caches for batch acceptance
                  await cacheService.invalidateByEvent('batchAccepted');
                  
                  // Force refresh to update both available and active orders
                  await Promise.all([
                    refreshOrders(true),
                    getDriverOrders(true)
                  ]);
                } else {
                  Alert.alert('Error', response.error || 'Failed to accept batch');
                }
              } catch (error) {
                console.error('Failed to accept batch:', error);
                Alert.alert('Error', 'Failed to accept batch order');
              }
            }}
          />
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

      <FlatOrderDetailsModal
        visible={showOrderDetailsModal}
        order={selectedOrder}
        onClose={handleCloseOrderDetails}
        onStatusUpdate={handleOrderDetailsAccept}
        onAccept={
          // Only show Accept button for available orders (not in active deliveries)
          selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)
            ? async (order) => {
                handleCloseOrderDetails();
                await handleAcceptOrder(order.id);
              }
            : undefined
        }
        onAcceptRoute={
          // For batch orders, accept the entire batch
          selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)
            ? async (order) => {
                handleCloseOrderDetails();
                // Check if this is a batch order
                if (order.current_batch?.id) {
                  try {
                    console.log('🚀 Accepting batch order:', order.current_batch.id);
                    const response = await apiService.acceptBatchOrder(order.current_batch.id);
                    if (response.success) {
                      Alert.alert('Success', 'Batch accepted successfully');
                      
                      // Invalidate caches for batch acceptance
                      await cacheService.invalidateByEvent('batchAccepted');
                      
                      // Force refresh to update both available and active orders
                      await Promise.all([
                        refreshOrders(true),
                        getDriverOrders(true)
                      ]);
                    } else {
                      Alert.alert('Error', response.error || 'Failed to accept batch');
                    }
                  } catch (error) {
                    console.error('Failed to accept batch:', error);
                    Alert.alert('Error', 'Failed to accept batch order');
                  }
                } else {
                  // Fallback to regular order acceptance
                  await handleAcceptOrder(order.id);
                }
              }
            : undefined
        }
        onDecline={
          // Only show Decline button for available orders (not in active deliveries)
          selectedOrder && !activeOrders?.some(o => o.id === selectedOrder.id)
            ? async (order) => {
                handleCloseOrderDetails();
                await handleDeclineOrder(order.id);
              }
            : undefined
        }
        onNavigate={handleOrderDetailsNavigate}
        onCall={(phone) => {
          // Handle phone call
          console.log('Call:', phone);
        }}
        showStatusButton={true}
        readonly={false}
        title="Delivery Details"
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
    backgroundColor: flatColors.backgrounds.secondary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Design.spacing[4],
  },
});

export default DashboardScreen;