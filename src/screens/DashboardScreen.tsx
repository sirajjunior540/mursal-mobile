import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ListRenderItem,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import HeartbeatIndicator from '../components/HeartbeatIndicator';
import OrderNotificationModal from '../components/OrderNotificationModal';
// import { BlurView } from '@react-native-community/blur'; // Uncomment if blur effects are needed

import { useOrders } from '../contexts/OrderContext';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '../types';
import { COLORS, FONTS } from '../constants';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_METHOD_ICONS } from '../constants';
import { realtimeService, RealtimeMode } from '../services/realtimeService';
import { forceLocationUpdate, testNotifications } from '../utils/locationTest';
import { locationService } from '../services/locationService';


interface DashboardStackParamList extends Record<string, object | undefined> {
  OrderDetails: { orderId: string };
  Dashboard: undefined;
}

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'Dashboard'>;


interface RealtimeConfig {
  enabled: boolean;
  mode: RealtimeMode;
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { orders: activeOrders, refreshOrders, acceptOrder, isLoading } = useOrders();
  const { driver, updateOnlineStatus } = useDriver();
  const [connectionMode, setConnectionMode] = useState<RealtimeMode>('polling');
  const [isConnected, setIsConnected] = useState(false);
  const [notificationOrder, setNotificationOrder] = useState<Order | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const initializeConnectionMode = useCallback(async (): Promise<void> => {
    try {
      // Don't re-initialize if already done by OrderContext
      // Just get current config and status
      const config: RealtimeConfig = realtimeService.getConfig();
      setConnectionMode(config.mode);
      setIsConnected(realtimeService.isConnectedToServer());
      
      console.log('📊 Dashboard initialized realtime status:', {
        mode: config.mode,
        enabled: config.enabled,
        connected: realtimeService.isConnectedToServer(),
        running: realtimeService.isRunning()
      });
    } catch (error) {
      console.error('Error initializing connection mode:', error);
    }
  }, []);

  useEffect(() => {
     
    refreshOrders();
    
    // Delay dashboard initialization to ensure OrderContext has set up realtime service
    const initTimer = setTimeout(() => {
       
      initializeConnectionMode();
      
      // Set up realtime service callbacks
      const callbacks = {
        onConnectionChange: (connected: boolean) => {
          console.log('🔌 Dashboard connection change:', connected);
          setIsConnected(connected);
        },
        onNewOrder: (order: Order) => {
          console.log('🔔 New order notification received in Dashboard:', order.id);
          // Show notification modal for new order
          setNotificationOrder(order);
          setShowNotificationModal(true);
        },
        onOrderUpdate: (order: Order) => {
          console.log('📝 Order update received in Dashboard:', order.id);
          // Handle order updates (already handled by OrderContext)
        },
        onError: (error: string) => {
          console.error('❌ Realtime error in Dashboard:', error);
        }
      };
      
      try {
        // Set callbacks (these will be merged with existing ones in the service)
        realtimeService.setCallbacks(callbacks);
        console.log('✅ Dashboard callbacks set successfully');
      } catch (error) {
        console.error('❌ Failed to set dashboard callbacks:', error);
      }
    }, 1000); // 1 second delay
    
    // Cleanup timer
    return () => {
      clearTimeout(initTimer);
    };
  }, [refreshOrders, initializeConnectionMode]);

  // Separate effect for animations
  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleToggleOnline = useCallback(async (): Promise<void> => {
    if (driver) {
      try {
        await updateOnlineStatus(!driver.isOnline);
      } catch (error) {
        console.error('Error toggling online status:', error);
        Alert.alert('Error', 'Failed to update online status');
      }
    }
  }, [driver, updateOnlineStatus]);

  const handleToggleConnectionMode = useCallback(async (): Promise<void> => {
    try {
      const newMode: RealtimeMode = connectionMode === 'polling' ? 'websocket' : 'polling';
      const currentConfig: RealtimeConfig = realtimeService.getConfig();
      
      await realtimeService.setConfig({ ...currentConfig, mode: newMode });
      setConnectionMode(newMode);
      
      // Restart the service if enabled
      if (currentConfig.enabled) {
        realtimeService.stop();
        realtimeService.start();
      }
      
      Alert.alert(
        'Connection Mode Changed',
        `Switched to ${newMode === 'polling' ? 'API (Polling)' : 'WebSocket'} mode`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to switch connection mode');
      console.error('Connection mode toggle error:', error);
    }
  }, [connectionMode]);

  const handleAcceptOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      const result = await acceptOrder(orderId);
      if (result) {
        setShowNotificationModal(false);
        setNotificationOrder(null);
        navigation.navigate('OrderDetails', { orderId });
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  }, [acceptOrder, navigation]);

  const handleDeclineOrder = useCallback(async (orderId: string): Promise<void> => {
    setShowNotificationModal(false);
    setNotificationOrder(null);
    // You could add a decline API call here if needed
  }, []);

  const handleCloseNotification = useCallback(() => {
    setShowNotificationModal(false);
    setNotificationOrder(null);
  }, []);

  // Simulate new order notification for testing
  const showTestNotification = useCallback(() => {
    if (activeOrders.length > 0) {
      const testOrder = activeOrders[0];
      setNotificationOrder(testOrder);
      setShowNotificationModal(true);
    }
  }, [activeOrders]);

  const renderOrderItem: ListRenderItem<Order> = useCallback(({ item, index }) => {
    // Add comprehensive null/undefined checks
    if (!item) {
      console.error('❌ Null/undefined order item at index:', index);
      // Return empty view instead of null to maintain child count
      return <View key={`empty-${index}`} style={{ height: 0 }} />;
    }
    
    // Check if order has required ID
    if (!item.id) {
      console.error('❌ Order missing ID:', item);
      // Return empty view instead of null to maintain child count
      return <View key={`missing-id-${index}`} style={{ height: 0 }} />;
    }
    
    // Log if customer data is missing but don't filter out the order
    if (!item.customer) {
      console.warn(`⚠️ Order missing customer data - using fallbacks: orderId=${item.id}, orderNumber=${item.orderNumber}`);
    }
    
    // Validate other required fields with fallbacks
    const orderNumber = String(item.orderNumber || `#${item.id}`);
    const orderTime = item.orderTime ? new Date(item.orderTime) : new Date();
    
    // Ensure orderTime is valid
    const isValidDate = orderTime instanceof Date && !isNaN(orderTime.getTime());
    const safeOrderTime = isValidDate ? orderTime : new Date();
    
    // Create customer data with comprehensive fallbacks
    const customer = {
      id: String(item.customer?.id || `customer_${item.id}`),
      name: String(item.customer?.name || 
                   item.customer?.full_name || 
                   'Unknown Customer'),
      phone: String(item.customer?.phone || 
                    item.customer?.phone_number || 
                    ''),
      email: String(item.customer?.email || '')
    };
    
    const total = typeof item.total === 'number' ? item.total : 0;
    const status = String(item.status || 'pending');
    const estimatedTime = String(item.estimatedDeliveryTime || '30 min');
    
    // Safe address extraction
    const getAddressText = (address: any): string => {
      if (!address) return 'No address';
      if (typeof address === 'string') return address;
      if (typeof address === 'object' && address.street) return String(address.street);
      if (typeof address === 'object' && address.toString) return address.toString();
      return 'No address';
    };
    
    console.log(`✅ Rendering valid order: ${item.id}, customer: ${customer.name}, status: ${status}`);
    
    const statusColor = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || COLORS.text.secondary;
    const paymentIcon = PAYMENT_METHOD_ICONS[item.paymentMethod as keyof typeof PAYMENT_METHOD_ICONS] || 'cash';
    return (
      <View
        key={`order-wrapper-${item.id}`}
      >
        <TouchableOpacity 
          style={styles.orderCard}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderNumberContainer}>
              <Text style={styles.orderNumber}>Order {orderNumber}</Text>
              <Text style={styles.orderTime}>{safeOrderTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor  }20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status}
              </Text>
            </View>
          </View>

          <View style={styles.orderDivider} />

          <View style={styles.orderContent}>
            <View style={styles.customerSection}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {customer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerAddress} numberOfLines={1}>
                  {getAddressText(item.deliveryAddress)}
                </Text>
              </View>
            </View>

            <View style={styles.orderMetrics}>
              <View style={styles.metricItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.text.secondary} />
                <Text style={styles.metricText}>{estimatedTime}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Ionicons name={paymentIcon as any} size={16} color={COLORS.text.secondary} />
                <Text style={styles.metricText}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {status === 'pending' && (
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleAcceptOrder(item.id)}
            >
              <Text style={styles.acceptButtonText}>Accept Order</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [handleAcceptOrder, navigation]);

  const EmptyState = useCallback(() => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="cube-outline" size={48} color={COLORS.text.secondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Active Orders</Text>
      <Text style={styles.emptyStateText}>
        {driver?.isOnline 
          ? 'New orders will appear here'
          : 'Go online to start receiving orders'}
      </Text>
      {!driver?.isOnline && (
        <TouchableOpacity 
          style={styles.goOnlineButton}
          onPress={handleToggleOnline}
        >
          <Text style={styles.goOnlineButtonText}>Go Online</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  ), [driver?.isOnline, fadeAnim, handleToggleOnline]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
          </Text>
          <Text style={styles.headerTitle}>
            {driver?.firstName || 'Driver'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.onlineButton, 
            driver?.isOnline ? styles.onlineButtonActive : styles.onlineButtonInactive
          ]}
          onPress={handleToggleOnline}
        >
          <HeartbeatIndicator 
            isActive={driver?.isOnline || false} 
            size={12}
            color={driver?.isOnline ? COLORS.white : COLORS.text.secondary}
            pulseColor={driver?.isOnline ? `${COLORS.white  }40` : `${COLORS.text.secondary  }40`}
          />
          <Text style={[
            styles.onlineButtonText,
            !driver?.isOnline && styles.onlineButtonTextInactive
          ]}>
            {driver?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="car" size={20} color={COLORS.primary.default} />
          </View>
          <Text style={styles.statValue}>{activeOrders.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          </View>
          <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="star" size={20} color={COLORS.warning} />
          </View>
          <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Connection Status - Minimal */}
      <View style={styles.connectionBar}>
        <View style={styles.connectionStatus}>
          <HeartbeatIndicator 
            isActive={isConnected} 
            size={6}
            color={isConnected ? COLORS.success : COLORS.text.secondary}
            pulseColor={isConnected ? `${COLORS.success  }30` : 'transparent'}
          />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.connectionToggle}
          onPress={handleToggleConnectionMode}
        >
          <Ionicons 
            name={connectionMode === 'websocket' ? 'wifi' : 'sync'} 
            size={14} 
            color={COLORS.text.secondary} 
          />
        </TouchableOpacity>
        
        {__DEV__ && (
          <>
            <TouchableOpacity 
              style={[styles.connectionToggle, { marginLeft: 8 }]}
              onPress={async () => {
                console.log('🧪 Manual location test triggered');
                
                // Try both methods
                try {
                  console.log('🔄 Method 1: Using locationService.forceLocationUpdate()');
                  const result1 = await locationService.forceLocationUpdate();
                  console.log('Result 1:', result1);
                  
                  console.log('🔄 Method 2: Using test utility');
                  await forceLocationUpdate();
                  
                  console.log('✅ Both location update methods completed');
                } catch (error) {
                  console.error('❌ Location update failed:', error);
                }
              }}
            >
              <Ionicons 
                name="location" 
                size={14} 
                color={COLORS.primary.default} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.connectionToggle, { marginLeft: 8 }]}
              onPress={() => {
                console.log('🔔 Manual notification test triggered');
                testNotifications();
              }}
            >
              <Ionicons 
                name="notifications" 
                size={14} 
                color={COLORS.warning} 
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Orders Section */}
      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>Active Orders</Text>
        <FlatList
          data={activeOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item, index) => `order-${String(item.id || index)}-${String(item.orderNumber || '')}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshOrders}
              tintColor={COLORS.primary.default}
            />
          }
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={10}
        />
      </View>

      {/* Order Notification Modal */}
      <OrderNotificationModal
        visible={showNotificationModal}
        order={notificationOrder}
        onAccept={handleAcceptOrder}
        onDecline={handleDeclineOrder}
        onClose={handleCloseNotification}
        autoCloseTime={30}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Apple system background
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerContent: {
    marginBottom: 16,
  },
  headerGreeting: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  onlineButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  onlineButtonActive: {
    backgroundColor: COLORS.success,
  },
  onlineButtonInactive: {
    backgroundColor: '#E5E5EA',
  },
  onlineButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 13,
    marginLeft: 4,
  },
  onlineButtonTextInactive: {
    color: COLORS.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  connectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginLeft: 6,
  },
  connectionToggle: {
    padding: 8,
  },
  ordersSection: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    textTransform: 'capitalize',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  orderContent: {
    padding: 16,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInitial: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.primary.default,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  orderMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  metricText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginLeft: 6,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#D1D1D6',
    marginHorizontal: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary.default,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  goOnlineButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary.default,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  goOnlineButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
});

export default DashboardScreen;