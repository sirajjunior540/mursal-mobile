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
import { FlatOrderDetailsModal } from '../components/OrderDetails/FlatOrderDetailsModal';
import FloatingQRButton from '../components/FloatingQRButton';
import {
  FlatDashboardHeader,
  FlatStatsCards,
  FlatPerformanceMetrics,
  FlatStatusCard,
  FlatAvailableOrdersCard,
  FlatActiveDeliveriesCard,
} from '../components/Dashboard/flat';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '@/types';
import { QRScanResult } from '../types/tracking';
import { Design } from '../constants/designSystem';
import { flatColors } from '../design/dashboard/flatColors';
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
  }, [navigation, incomingOrder]);

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
          
          <FlatPerformanceMetrics
            data={performanceData}
            isExpanded={showPerformanceMetrics}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowPerformanceMetrics(!showPerformanceMetrics);
            }}
          />
          
          <FlatActiveDeliveriesCard
            orders={activeOrders || []}
            isExpanded={showActiveDeliveries}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowActiveDeliveries(!showActiveDeliveries);
            }}
            onOrderPress={handleShowOrderDetails}
            onViewAll={() => {}} // No longer needed since card handles expansion internally
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
        onAccept={async (order) => {
          handleCloseOrderDetails();
          await handleAcceptOrder(order.id);
        }}
        onDecline={async (order) => {
          handleCloseOrderDetails();
          await handleDeclineOrder(order.id);
        }}
        onNavigate={handleOrderDetailsNavigate}
        onCall={(phone) => {
          // Handle phone call
          console.log('Call:', phone);
        }}
        showStatusButton={true}
        readonly={!activeOrders?.some(o => o.id === selectedOrder?.id)}
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