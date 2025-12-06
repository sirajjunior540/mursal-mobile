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
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Haptics from 'react-native-haptic-feedback';
import Ionicons from 'react-native-vector-icons/Ionicons';

import IncomingOrderModal from '../components/IncomingOrderModal';
import { FlatOrderDetailsModal } from '../components/OrderDetails';
import FloatingQRButton from '../components/FloatingQRButton';
import FlashDealsSection from '../components/FlashDealsSection';
import {
  FlatDashboardHeader,
  FlatStatsCards,
  FlatPerformanceMetrics,
  FlatStatusCard,
} from '../components/Dashboard/flat';
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
import { FlashDeal } from '../services/apiEndpoints';

interface DashboardStackParamList extends Record<string, object | undefined> {
  AvailableOrders: undefined;
  AcceptedOrders: undefined;
  Navigation: undefined;
  History: undefined;
  SpecialOffers: {
    selectedDealId?: string;
    category?: 'all' | 'surge' | 'bonus' | 'incentive';
  };
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
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  
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
      console.log('[DashboardScreen] handleNewOrder called with order:', order.order_number || order.id);
      setIncomingOrder(order);
      setShowIncomingModal(true);
      Haptics.trigger('notificationSuccess');
      console.log('[DashboardScreen] Modal should now be visible');
    };
    
    setOrderNotificationCallback(handleNewOrder);

    // Also set up push notification callback for background wake-up
    notificationService.setNotificationCallbacks({
      onNewOrder: handleNewOrder,
      // Check if driver is active before processing notifications (prevents wake-up when offline)
      isDriverActive: () => {
        // Use correct field names from Driver type
        const isOnline = driver?.isOnline === true;
        const isAvailable = driver?.isAvailable !== false;
        const statusOk = !driver?.status || driver?.status === 'available' || driver?.status === 'online' || driver?.status === 'active';
        return isOnline && isAvailable && statusOk;
      }
    });

    return () => {
      setOrderNotificationCallback(null);
    };
  }, [setOrderNotificationCallback, fadeAnim, slideAnim, driver]);

  // Load flash deals on initial load
  useEffect(() => {
    loadFlashDeals();
  }, [loadFlashDeals]);

  const loadFlashDeals = useCallback(async () => {
    try {
      setLoadingDeals(true);
      const response = await apiService.getFlashDeals();
      if (response.success && response.data) {
        setFlashDeals(response.data);
      } else {
        console.warn('[Dashboard] Failed to load flash deals:', response.error);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading flash deals:', error);
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.trigger('impactLight');
    
    // Force refresh all data when user manually refreshes
    await Promise.all([
      refreshOrders(true),    // Force refresh available orders
      getDriverOrders(true),  // Force refresh driver orders
      getDriverBalance(),     // Get fresh balance
      loadFlashDeals(),       // Refresh flash deals
    ]);
    
    setRefreshing(false);
  }, [refreshOrders, getDriverOrders, getDriverBalance, loadFlashDeals]);

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
        // Refresh driver orders to get the latest data
        await getDriverOrders();

        // Navigate to PickupScreen with order details
        navigation.navigate('PickupScreen', {
          orderId: orderId,
          deliveryId: orderId, // orderId is the delivery ID
        });
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept order';
      Alert.alert('Error', `Failed to accept order: ${errorMessage}`);
    }
  }, [acceptOrder, getDriverOrders, navigation]);

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

  const handleDealPress = useCallback((deal: FlashDeal) => {
    Haptics.trigger('impactLight');
    
    // Determine deal category for better filtering
    const title = deal.title.toLowerCase();
    let category: 'all' | 'surge' | 'bonus' | 'incentive' = 'all';
    
    if (title.includes('surge') || title.includes('peak') || title.includes('rush')) {
      category = 'surge';
    } else if (title.includes('bonus') || title.includes('extra') || title.includes('double')) {
      category = 'bonus';
    } else if (title.includes('incentive') || title.includes('program') || title.includes('challenge')) {
      category = 'incentive';
    }
    
    // Navigate to special offers screen with pre-selected deal and category
    navigation.navigate('SpecialOffers', {
      selectedDealId: deal.id,
      category: category
    });
  }, [navigation]);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready';
      case 'picked_up':
        return 'Picked up';
      case 'in_transit':
        return 'On the way';
      case 'delivered':
        return 'Delivered';
      default:
        return status.replace('_', ' ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'confirmed':
      case 'ready':
      case 'picked_up':
      case 'in_transit':
        return Design.colors.primary;
      case 'preparing':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
      case 'failed':
        return Design.colors.error;
      default:
        return Design.colors.textSecondary;
    }
  };

  const formatCurrency = (amount?: number | string) => {
    if (amount === undefined || amount === null) return '$0.00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${val.toFixed(2)}`;
  };

  const availablePreview = (availableOrders || []).slice(0, 4);
  const activePreview = (activeOrders || []).slice(0, 3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <LinearGradient
        colors={[flatColors.brand.lighter, '#FFE7C7', '#FFF7ED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorativeBlob, styles.blobTopLeft]} />
      <View style={[styles.decorativeBlob, styles.blobBottomRight]} />
      <View style={styles.ring} />
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
              tintColor={flatColors.brand.secondary}
            />
          }
        >
          <FlatStatusCard
            isOnline={driver?.isOnline || false}
            onToggleOnline={handleToggleOnline}
          />
          
          <FlatStatsCards stats={statsData} />

          <DriverBalanceCard
            compact={true}
            onRefresh={handleRefresh}
          />

          <FlashDealsSection
            deals={flashDeals}
            onDealPress={handleDealPress}
            onRefresh={loadFlashDeals}
            onViewAll={() => {
              Haptics.trigger('impactLight');
              navigation.navigate('SpecialOffers', { category: 'all' });
            }}
            loading={loadingDeals}
          />
          
          <FlatPerformanceMetrics
            data={performanceData}
            isExpanded={showPerformanceMetrics}
            onToggle={() => {
              Haptics.trigger('selection');
              setShowPerformanceMetrics(!showPerformanceMetrics);
            }}
          />
          
          {/* Active deliveries */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={styles.sectionPill}>
                  <Ionicons name="bicycle" size={14} color={Design.colors.primary} />
                  <View style={styles.dot} />
                  <Ionicons name="navigate-outline" size={14} color={Design.colors.primary} />
                </View>
                <View style={styles.titleRow}>
                  <Ionicons name="flash" size={18} color={Design.colors.primary} />
                  <Animated.Text style={styles.sectionTitle}>On the move</Animated.Text>
                  <View style={styles.counterPill}>
                    <Ionicons name="cube-outline" size={12} color={Design.colors.white} />
                    <Animated.Text style={styles.counterText}>{activeOrders?.length || 0}</Animated.Text>
                  </View>
                </View>
                <Animated.Text style={styles.sectionSubtitle}>Deliveries you’re working on right now</Animated.Text>
              </View>
              <Ionicons.Button
                name="map-outline"
                size={16}
                color={Design.colors.primary}
                backgroundColor="transparent"
                underlayColor="transparent"
                onPress={() => navigation.navigate('Navigation')}
                iconStyle={{ marginRight: 6 }}
              >
                View map
              </Ionicons.Button>
            </View>

            {activePreview.length > 0 ? (
              <View style={styles.cardGrid}>
                {activePreview.map(order => (
                  <LinearGradient
                    key={order.id}
                    colors={['#FFF3E6', '#FFE7CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.deliveryCard}
                  >
                    <View style={styles.deliveryHeader}>
                      <View style={styles.badge}>
                        <Ionicons name="time-outline" size={14} color={Design.colors.primary} />
                        <Animated.Text style={styles.badgeText}>{getStatusLabel(order.status)}</Animated.Text>
                      </View>
                      <Animated.Text style={styles.orderId}>#{order.order_number || order.id}</Animated.Text>
                    </View>

                    <Animated.Text style={styles.restaurantName} numberOfLines={1}>
                      {order.restaurant_name || 'Restaurant'}
                    </Animated.Text>
                    <Animated.Text style={styles.addressText} numberOfLines={1}>
                      {order.delivery_address && typeof order.delivery_address === 'string'
                        ? order.delivery_address
                        : order.delivery_address?.street_address}
                    </Animated.Text>

                    <View style={styles.deliveryMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="cash-outline" size={14} color={Design.colors.textSecondary} />
                        <Animated.Text style={styles.metaText}>{formatCurrency(order.total_amount || order.total)}</Animated.Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={14} color={Design.colors.textSecondary} />
                        <Animated.Text style={styles.metaText}>{order.items?.length || 0} items</Animated.Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                      <Animated.Text style={[styles.statusLabel, { color: getStatusColor(order.status) }]}>
                        {getStatusLabel(order.status)}
                      </Animated.Text>
                      <View style={{ flex: 1 }} />
                      <Ionicons.Button
                        name="trail-sign-outline"
                        size={16}
                        color={Design.colors.white}
                        backgroundColor={Design.colors.primary}
                        underlayColor={Design.colors.primaryDark}
                        style={styles.smallButton}
                        onPress={() => handleShowOrderDetails(order)}
                      >
                        Manage
                      </Ionicons.Button>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="navigate-outline" size={22} color={Design.colors.textSecondary} />
                <Animated.Text style={styles.emptyText}>No active deliveries yet</Animated.Text>
                <Animated.Text style={styles.emptySubtext}>Start by accepting a new order</Animated.Text>
              </View>
            )}
          </View>

          {/* Available orders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={styles.sectionPill}>
                  <Ionicons name="flash-outline" size={14} color={Design.colors.primary} />
                  <View style={styles.dot} />
                  <Ionicons name="cube-outline" size={14} color={Design.colors.primary} />
                </View>
                <View style={styles.titleRow}>
                  <Ionicons name="bag-handle" size={18} color={Design.colors.primary} />
                  <Animated.Text style={styles.sectionTitle}>Ready for pickup</Animated.Text>
                  <View style={styles.counterPill}>
                    <Ionicons name="albums-outline" size={12} color={Design.colors.white} />
                    <Animated.Text style={styles.counterText}>{availableOrders?.length || 0}</Animated.Text>
                  </View>
                </View>
                <Animated.Text style={styles.sectionSubtitle}>Newest orders near you</Animated.Text>
              </View>
              <Ionicons.Button
                name="list-outline"
                size={16}
                color={Design.colors.primary}
                backgroundColor="transparent"
                underlayColor="transparent"
                onPress={() => navigation.navigate('AvailableOrders')}
                iconStyle={{ marginRight: 6 }}
              >
                View all
              </Ionicons.Button>
            </View>

            {!driver?.isOnline && (
              <View style={styles.offlineBanner}>
                <Ionicons name="power-outline" size={16} color={Design.colors.error} />
                <Animated.Text style={styles.offlineText}>Go online to accept orders</Animated.Text>
              </View>
            )}

            {availablePreview.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {availablePreview.map(order => (
                  <View key={order.id} style={styles.availableCard}>
                    <View style={styles.availableHeader}>
                      <Animated.Text style={styles.badgeMuted}>#{order.order_number || order.id}</Animated.Text>
                      <Ionicons name="location-outline" size={16} color={Design.colors.textSecondary} />
                    </View>
                    <Animated.Text style={styles.restaurantName} numberOfLines={1}>
                      {order.restaurant_name || 'Restaurant'}
                    </Animated.Text>
                    <Animated.Text style={styles.addressText} numberOfLines={1}>
                      {order.delivery_address && typeof order.delivery_address === 'string'
                        ? order.delivery_address
                        : order.delivery_address?.street_address}
                    </Animated.Text>

                    <View style={styles.orderMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="cash-outline" size={14} color={Design.colors.primary} />
                        <Animated.Text style={styles.metaBold}>{formatCurrency(order.total_amount || order.total)}</Animated.Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="timer-outline" size={14} color={Design.colors.textSecondary} />
                        <Animated.Text style={styles.metaText}>ASAP</Animated.Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <Ionicons.Button
                        name="eye-outline"
                        size={16}
                        color={Design.colors.textPrimary}
                        backgroundColor="transparent"
                        underlayColor="transparent"
                        onPress={() => handleShowOrderDetails(order)}
                        iconStyle={{ marginRight: 6 }}
                      >
                        View
                      </Ionicons.Button>
                      <Ionicons.Button
                        name="checkmark-circle-outline"
                        size={16}
                        color={Design.colors.white}
                        backgroundColor={driver?.isOnline ? Design.colors.primary : Design.colors.textTertiary}
                        underlayColor={Design.colors.primaryDark}
                        style={styles.primaryButton}
                        disabled={!driver?.isOnline || !canAcceptOrder}
                        onPress={() => handleAcceptOrder(order.id)}
                      >
                        Accept
                      </Ionicons.Button>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="bag-outline" size={22} color={Design.colors.textSecondary} />
                <Animated.Text style={styles.emptyText}>No available orders nearby</Animated.Text>
                <Animated.Text style={styles.emptySubtext}>We’ll surface new ones as they arrive</Animated.Text>
              </View>
            )}
          </View>
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
    backgroundColor: flatColors.brand.lighter,
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
  decorativeBlob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  blobTopLeft: {
    top: -60,
    left: -40,
  },
  blobBottomRight: {
    bottom: -80,
    right: -40,
  },
  ring: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.06)',
    top: '12%',
    right: '-18%',
  },
  section: {
    marginTop: Design.spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[2],
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Design.colors.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Design.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Design.colors.textSecondary,
    marginTop: 4,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
  },
  counterText: {
    color: Design.colors.white,
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 12,
  },
  cardGrid: {
    paddingHorizontal: Design.spacing[4],
  },
  deliveryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...(Design.shadows ? Design.shadows.md : {}),
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    marginLeft: 6,
    color: Design.colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  orderId: {
    fontWeight: '700',
    color: Design.colors.textPrimary,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: Design.colors.textPrimary,
  },
  addressText: {
    fontSize: 13,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  deliveryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 13,
    color: Design.colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusLabel: {
    fontWeight: '700',
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyCard: {
    backgroundColor: Design.colors.backgroundSecondary,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: Design.spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  emptyText: {
    marginTop: 8,
    fontWeight: '700',
    color: Design.colors.textPrimary,
  },
  emptySubtext: {
    color: Design.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  offlineBanner: {
    marginHorizontal: Design.spacing[4],
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    color: Design.colors.error,
    fontWeight: '600',
    marginLeft: 8,
  },
  horizontalList: {
    paddingHorizontal: Design.spacing[4],
  },
  availableCard: {
    width: 260,
    backgroundColor: Design.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Design.colors.border,
    marginRight: 12,
  },
  availableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeMuted: {
    fontSize: 12,
    color: Design.colors.textSecondary,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaBold: {
    fontWeight: '700',
    color: Design.colors.primary,
  },
  primaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});

export default DashboardScreen;
