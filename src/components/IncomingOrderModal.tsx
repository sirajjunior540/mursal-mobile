import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  // Platform,
  AppState,
  FlatList,
  ListRenderItem,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { extractOrderApiIds, getOrderDisplayId, isBatchOrder as checkIsBatchOrder, getBatchProperties, isSpecialHandlingObject, Order, BatchOrder } from '../types';
import { ExtendedOrder, BatchOrderItem, RouteStop } from '../types/orderModal.types';
import { /* COLORS, FONTS */ } from '../constants';
import { haptics } from '../utils/haptics';
import { soundService } from '../services/soundService';
import { Storage } from '../utils';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';
import { useTenant } from '../contexts/TenantContext';

const { /* width: SCREEN_WIDTH, */ height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IncomingOrderModalProps {
  visible: boolean;
  order: ExtendedOrder | null;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onSkip: (orderId: string) => void;
  onClose: () => void;
  timerDuration?: number; // in seconds
  onBatchAccept?: (batchId: string, selectedOrders: string[]) => void;
  onAcceptRoute?: (routeId: string, orderData?: ExtendedOrder) => void;
}

// Types for FlatList sections
type SectionType = 
  | 'order-number'
  | 'customer-info'
  | 'location-pickup'
  | 'location-delivery'
  | 'route-summary'
  | 'batch-orders-list'
  | 'route-stops'
  | 'metrics';

interface SectionData {
  id: string;
  type: SectionType;
  data?: {
    // For route-summary
    totalPickupStops?: number;
    totalDeliveryStops?: number;
    batchTotalOrders?: number;
    // For stops-preview
    stops?: RouteStop[];
    // For metrics
    estimatedTime?: string;
    distance?: string;
    totalAmount?: number;
    deliveryFee?: number;
    // For customer-info
    customerName?: string;
    customerPhone?: string;
    deliveryNotes?: string;
    // For order-number
    orderNumber?: string;
    // For location-pickup
    pickupAddress?: string;
    // For location-delivery
    deliveryAddress?: string;
    isWarehouseConsolidation?: boolean;
    // For batch-orders-list
    orders?: Order[];
  };
}

const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({
  visible,
  order,
  onAccept,
  onDecline,
  onSkip,
  onClose,
  timerDuration = 10,
  // onBatchAccept,
  onAcceptRoute,
}) => {
  // Get tenant settings for currency
  const { tenantSettings } = useTenant();
  const currency = order?.currency || tenantSettings?.currency || 'SDG';
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Batch order state
  const [/* selectedOrders, setSelectedOrders */] = useState<string[]>([]);
  const [/* showBatchDetails, setShowBatchDetails */] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  
  // Background wake state
  const [wasInBackground, setWasInBackground] = useState(false);
  
  // Check if this is a batch order
  const isBatchOrder = order && checkIsBatchOrder(order);
  const batchProperties = order ? getBatchProperties(order) : null;
  
  // Determine batch type and consolidation status
  const isWarehouseConsolidation = React.useMemo(() => {
    if (!order) return false;
    
    // For batch orders from available_orders endpoint
    if (order.type === 'batch') {
      const batchOrder = order as BatchOrder;
      return batchOrder.is_consolidated || 
             batchOrder.delivery_address_info?.is_warehouse || 
             batchOrder.warehouse_info?.consolidate_to_warehouse ||
             false;
    }
    
    // For regular orders with batch info
    if (order.current_batch) {
      return order.is_consolidated || 
             order.current_batch.is_consolidated || 
             order.current_batch.is_consolidated_batch ||
             order.current_batch.delivery_address_info?.is_warehouse ||
             order.current_batch.warehouse_info?.consolidate_to_warehouse ||
             order.delivery_address_info?.is_warehouse ||
             false;
    }
    
    // Check for consolidation_warehouse_address field
    if (order.consolidation_warehouse_address) {
      return true;
    }
    
    return false;
  }, [order]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[IncomingOrderModal] Modal state changed:', { visible, hasOrder: !!order });

    if (order && visible) {
      console.log('[IncomingOrderModal] Full Order data:', JSON.stringify(order, null, 2));
      console.log('[IncomingOrderModal] Order type:', order.type);
      console.log('[IncomingOrderModal] Order fields:', {
        id: order.id,
        order_number: order.order_number,
        customer: order.customer,
        customer_name: order.customer_name,
        customer_details: order.customer_details,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        dropoff_address: order.dropoff_address,
        total: order.total,
        delivery_fee: order.delivery_fee,
        items: order.items,
        special_handling: order.special_handling,
        cash_on_delivery: order.cash_on_delivery,
        cod_amount: order.cod_amount,
        consolidation_warehouse_address: order.consolidation_warehouse_address
      });
      console.log('[IncomingOrderModal] Is batch order:', isBatchOrder);
      console.log('[IncomingOrderModal] Batch properties:', batchProperties);
      console.log('[IncomingOrderModal] Is warehouse consolidation:', isWarehouseConsolidation);
      if (order.type === 'batch') {
        const batchOrder = order as BatchOrder;
        console.log('[IncomingOrderModal] Batch warehouse info:', batchOrder.warehouse_info);
        console.log('[IncomingOrderModal] Batch delivery address info:', batchOrder.delivery_address_info);
        console.log('[IncomingOrderModal] Batch is_consolidated:', batchOrder.is_consolidated);
        console.log('[IncomingOrderModal] Batch orders count:', batchOrder.current_batch?.orders?.length || 0);
      }
      if (order.current_batch) {
        console.log('[IncomingOrderModal] Current batch:', order.current_batch);
        console.log('[IncomingOrderModal] Current batch warehouse info:', order.current_batch.warehouse_info);
        console.log('[IncomingOrderModal] Current batch delivery address info:', order.current_batch.delivery_address_info);
        console.log('[IncomingOrderModal] Current batch orders:', order.current_batch.orders?.length || 0);
      }
    }
  }, [order, visible, isBatchOrder, batchProperties, isWarehouseConsolidation]);
  
  const isDistributionBatch = React.useMemo(() => {
    if (!isBatchOrder || !batchProperties?.orders) return false;
    // Skip if this is warehouse consolidation
    if (isWarehouseConsolidation) return false;
    // Distribution batch has multiple unique delivery addresses
    const uniqueDeliveryAddresses = new Set(
      batchProperties.orders.map(o => o.delivery_address).filter(Boolean)
    );
    return uniqueDeliveryAddresses.size > 1;
  }, [isBatchOrder, batchProperties, isWarehouseConsolidation]);
  
  // const isConsolidatedBatch = (isBatchOrder && !isDistributionBatch && (batchProperties?.orders?.length || 0) > 1) || isWarehouseConsolidation;
  
  // Get delivery address based on consolidation
  const getDeliveryAddress = React.useCallback(() => {
    if (!order) return 'Delivery location';
    
    // Debug logging for warehouse consolidation
    console.log('🏭 Getting delivery address - isWarehouseConsolidation:', isWarehouseConsolidation);
    
    // For warehouse consolidation, show warehouse address
    if (isWarehouseConsolidation) {
      // For batch orders from available_orders endpoint
      if (order.type === 'batch') {
        const deliveryInfo = (order as BatchOrder).delivery_address_info;
        const warehouseInfo = (order as BatchOrder).warehouse_info;
        
        console.log('🏭 Batch order - deliveryInfo:', deliveryInfo);
        console.log('🏭 Batch order - warehouseInfo:', warehouseInfo);
        
        if (deliveryInfo?.is_warehouse && deliveryInfo?.address) {
          return `🏭 Warehouse: ${deliveryInfo.address}`;
        } else if (warehouseInfo?.warehouse_address) {
          return `🏭 Warehouse: ${warehouseInfo.warehouse_address}`;
        } else if (order.delivery_address && (order.is_consolidated || deliveryInfo?.is_warehouse)) {
          // If marked as warehouse but no specific warehouse address, use delivery address as warehouse
          return `🏭 Warehouse: ${order.delivery_address}`;
        } else if (order.delivery_address) {
          // For batch orders marked as consolidated, treat delivery address as warehouse
          return `🏭 Warehouse: ${order.delivery_address}`;
        }
      } else {
        // For regular orders
        const warehouseInfo = (order as BatchOrder).warehouse_info || order.current_batch?.warehouse_info;
        const deliveryInfo = (order as BatchOrder).delivery_address_info || order.current_batch?.delivery_address_info;
        
        console.log('🏭 Regular order - deliveryInfo:', deliveryInfo);
        console.log('🏭 Regular order - warehouseInfo:', warehouseInfo);
        console.log('🏭 Regular order - consolidation_warehouse_address:', order.consolidation_warehouse_address);
        
        if (deliveryInfo?.is_warehouse && deliveryInfo?.address) {
          return `🏭 Warehouse: ${deliveryInfo.address}`;
        } else if (warehouseInfo?.warehouse_address) {
          return `🏭 Warehouse: ${warehouseInfo.warehouse_address}`;
        } else if (order.consolidation_warehouse_address) {
          // Check for consolidation_warehouse_address field
          return `🏭 Warehouse: ${order.consolidation_warehouse_address}`;
        } else if (order.delivery_address && (order.is_consolidated || deliveryInfo?.is_warehouse)) {
          // If marked as warehouse but no specific warehouse address, use delivery address as warehouse
          return `🏭 Warehouse: ${order.delivery_address}`;
        }
      }
    }
    
    // For batch orders, check if all orders have the same delivery address
    if (isBatchOrder && batchProperties) {
      // First check batch-level warehouse info
      if (batchProperties.warehouseInfo?.warehouse_address) {
        return `🏭 Warehouse: ${batchProperties.warehouseInfo.warehouse_address}`;
      }
      if (batchProperties.deliveryAddressInfo?.is_warehouse && batchProperties.deliveryAddressInfo?.address) {
        return `🏭 Warehouse: ${batchProperties.deliveryAddressInfo.address}`;
      }
      
      // Then check individual orders in batch
      if (batchProperties.orders && batchProperties.orders.length > 0) {
        const firstOrder = batchProperties.orders[0] as BatchOrderItem;
        if (firstOrder?.consolidation_warehouse_address || firstOrder?.warehouse_info?.warehouse_address) {
          return `🏭 Warehouse: ${firstOrder.consolidation_warehouse_address || firstOrder.warehouse_info?.warehouse_address}`;
        }
        
        const deliveryAddresses = new Set(batchProperties.orders.map(o => o.delivery_address).filter(Boolean));
        if (deliveryAddresses.size === 1) {
          return Array.from(deliveryAddresses)[0];
        } else if (deliveryAddresses.size > 1) {
          return 'Multiple delivery locations';
        }
      }
    }
    
    return order.delivery_address || 'Delivery location';
  }, [order, isWarehouseConsolidation, isBatchOrder, batchProperties]);

  // Generate route stops for batch orders
  const routeStops = React.useMemo((): RouteStop[] => {
    if (!isBatchOrder || !batchProperties || !order) return [];
    
    const stops: RouteStop[] = [];
    
    // Add pickup stop(s)
    if (order.pickup_address) {
      stops.push({
        id: `pickup-${order.id}`,
        type: 'pickup' as const,
        address: order.pickup_address,
        orderNumber: order.order_number,
        customerName: order.customer?.name || 
                    order.customer_name || 
                    order.customer_details?.name || 
                    order.customer_details?.customer_name ||
                    (order.customer && typeof order.customer === 'string' ? order.customer : null) ||
                    'Customer'
      });
    }
    
    // Add delivery stops
    if (isWarehouseConsolidation) {
      // For warehouse consolidation, show only the warehouse as the delivery stop
      const warehouseAddress = getDeliveryAddress();
      stops.push({
        id: `delivery-warehouse`,
        type: 'delivery' as const,
        address: warehouseAddress,
        orderNumber: `${batchProperties.orders?.length || 1} orders`,
        customerName: 'Warehouse Drop-off'
      });
    } else if (batchProperties.orders && batchProperties.orders.length > 0) {
      // For regular batch orders, show individual delivery addresses
      batchProperties.orders.forEach((batchOrderItem: BatchOrderItem) => {
        if (batchOrderItem.delivery_address) {
          stops.push({
            id: `delivery-${batchOrderItem.id}`,
            type: 'delivery' as const,
            address: batchOrderItem.delivery_address || '',
            orderNumber: batchOrderItem.order_number,
            customerName: batchOrderItem.customer?.name || 
                        batchOrderItem.customer_name || 
                        batchOrderItem.customer_details?.name || 
                        batchOrderItem.customer_details?.customer_name ||
                        (batchOrderItem.customer && typeof batchOrderItem.customer === 'string' ? batchOrderItem.customer : null) ||
                        'Customer'
          });
        }
      });
    } else if (order.delivery_address) {
      // Single delivery for single orders
      stops.push({
        id: `delivery-${order.id}`,
        type: 'delivery' as const,
        address: order.delivery_address || '',
        orderNumber: order.order_number,
        customerName: order.customer?.name || 
                    order.customer_name || 
                    order.customer_details?.name || 
                    order.customer_details?.customer_name ||
                    (order.customer && typeof order.customer === 'string' ? order.customer : null) ||
                    'Customer'
      });
    }
    
    return stops;
  }, [isBatchOrder, batchProperties, order, isWarehouseConsolidation, getDeliveryAddress]);

  // Start countdown timer
  const startTimer = useCallback(() => {
    if (!visible || !order) return;
    
    setTimeRemaining(timerDuration);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-skip when timer reaches 0
          const apiIds = extractOrderApiIds(order);
          console.log('⏰ Timer expired, auto-skipping order:', getOrderDisplayId(order));
          console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
          onSkip(apiIds.deliveryId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [visible, order, timerDuration, onSkip]);
  

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  

  // Handle actions
  const handleAccept = useCallback(() => {
    if (!order) return;
    
    // Stop all notifications immediately to prevent auto-skip
    stopTimer();
    soundService.stopRinging();
    haptics.stop(); // Stop any ongoing vibrations
    
    // Give success feedback
    haptics.success();
    
    // Close modal immediately to prevent timer from continuing
    onClose();
    
    if (isBatchOrder && onAcceptRoute && order.current_batch?.id) {
      // For batch orders, accept the entire batch using the batch ID
      const batchId = order.current_batch.id;
      console.log('✅ Driver accepted batch:', batchId);
      console.log('🔍 Batch details:', {
        batchId,
        batchName: order.current_batch.name,
        orderCount: batchProperties?.orders?.length || 1,
        isBatchOrder,
        hasOnAcceptRoute: !!onAcceptRoute
      });
      
      // Call accept route handler after closing modal
      onAcceptRoute(batchId, order);
    } else {
      const apiIds = extractOrderApiIds(order);
      console.log('✅ Driver accepted order:', getOrderDisplayId(order));
      console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
      
      // Call accept handler after closing modal
      onAccept(apiIds.deliveryId);
    }
  }, [order, stopTimer, isBatchOrder, onAcceptRoute, batchProperties, onAccept, onClose]);

  const handleDecline = useCallback(() => {
    if (!order) return;
    stopTimer();
    soundService.stopRinging();
    haptics.stop(); // Stop any ongoing vibrations
    haptics.warning();
    const apiIds = extractOrderApiIds(order);
    console.log('❌ Driver declined order:', getOrderDisplayId(order));
    console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
    onDecline(apiIds.deliveryId);
  }, [order, stopTimer, onDecline]);

  const handleSkip = useCallback(() => {
    if (!order) return;
    stopTimer();
    soundService.stopRinging();
    haptics.stop(); // Stop any ongoing vibrations
    haptics.light();
    const apiIds = extractOrderApiIds(order);
    console.log('⏭️ Driver skipped order:', getOrderDisplayId(order));
    console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
    onSkip(apiIds.deliveryId);
  }, [order, stopTimer, onSkip]);
  
  // Handle batch order selection
  // const toggleOrderSelection = useCallback((orderId: string) => {
  //   setSelectedOrders(prev => {
  //     if (prev.includes(orderId)) {
  //       return prev.filter(id => id !== orderId);
  //     } else {
  //       return [...prev, orderId];
  //     }
  //   });
  // }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure everything is stopped when component unmounts
      haptics.stop();
      soundService.stopRinging();
      stopTimer();
    };
  }, [stopTimer]);

  // Handle app state changes for background wake
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && wasInBackground && visible) {
        // App was woken from background due to notification
        console.log('📱 App woken from background for order notification');
        soundService.startRinging(); // Resume ringing if order is still visible
        setWasInBackground(false);
      } else if (nextAppState === 'background') {
        setWasInBackground(true);
        soundService.stopRinging(); // Stop ringing when app goes to background
        haptics.stop(); // Stop vibration when app goes to background
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [wasInBackground, visible]);

  // Timer progress animation
  // const timerProgress = timeRemaining / timerDuration;
  const progressColor = timeRemaining <= 3 ? '#FF4757' : timeRemaining <= 6 ? '#FFA726' : '#4CAF50';

  // Calculate batch total orders before sections useMemo
  const batchTotalOrders = React.useMemo(() => {
    return isBatchOrder ? (batchProperties?.orders?.length || 1) : 1;
  }, [isBatchOrder, batchProperties]);

  // Simplified data extraction - use first available value, no complex fallbacks
  const orderData = React.useMemo(() => {
    console.log('📊 [IncomingOrderModal] Calculating orderData, order:', !!order);
    if (!order) {
      console.log('📊 [IncomingOrderModal] No order, returning null');
      return null;
    }

    // Extract customer name - simple fallback chain
    const customerName = order.customer_name ||
                        order.customer?.name ||
                        order.customer_details?.name ||
                        order.dropoff_contact_name ||
                        'Customer';
    console.log('📊 [IncomingOrderModal] customerName:', customerName);

    // Extract addresses - simple fallback chain
    const pickupAddress = order.pickup_address || 'Pickup location';
    console.log('📊 [IncomingOrderModal] pickupAddress:', pickupAddress);

    const deliveryAddress = getDeliveryAddress();
    console.log('📊 [IncomingOrderModal] deliveryAddress:', deliveryAddress);

    // Extract amounts
    const total = Number(order.total || order.total_amount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    console.log('📊 [IncomingOrderModal] total:', total, 'deliveryFee:', deliveryFee);

    // Distance and time
    const distance = order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
    const estimatedTime = order.estimated_delivery_time || '15 min';
    console.log('📊 [IncomingOrderModal] distance:', distance, 'estimatedTime:', estimatedTime);

    // Order identifier
    const orderNumber = getOrderDisplayId(order);
    console.log('📊 [IncomingOrderModal] orderNumber:', orderNumber);

    const result = {
      customerName,
      pickupAddress,
      deliveryAddress,
      total,
      deliveryFee,
      distance,
      estimatedTime,
      orderNumber,
      isBatch: isBatchOrder,
      batchCount: batchTotalOrders,
    };
    console.log('📊 [IncomingOrderModal] Final orderData:', JSON.stringify(result, null, 2));
    return result;
  }, [order, isBatchOrder, batchTotalOrders, getDeliveryAddress]);

  // Simplified render - no complex sections, just straightforward layout

  // Effects
  useEffect(() => {
    if (visible && order) {
      // Always show route details for batch orders
      if (isBatchOrder) {
        setShowRouteDetails(true);
      }
      
      // Check notification settings and start ringing accordingly
      Storage.getItem('notification_settings').then(settings => {
        const notificationSettings = settings as { sound_enabled?: boolean; vibration_enabled?: boolean };
        if (notificationSettings?.sound_enabled !== false) {
          soundService.startRinging();
        }
        if (notificationSettings?.vibration_enabled !== false) {
          haptics.notification();
        }
      }).catch(() => {
        // Default behavior if settings not available
        soundService.startRinging();
        haptics.notification();
      });

      // Start entrance animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulse animation for urgency
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Start timer
      startTimer();

      return () => {
        stopTimer();
        soundService.stopRinging();
        haptics.stop(); // Stop vibrations on cleanup
        pulseAnimation.stop();
      };
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      stopTimer();
      soundService.stopRinging();
      haptics.stop(); // Stop any ongoing vibrations
    }
    
    // Return cleanup function for consistency
    return () => {
      stopTimer();
      soundService.stopRinging();
      haptics.stop();
    };
  }, [visible, order, isBatchOrder]); // Removed startTimer and stopTimer from deps to prevent re-renders

  // These are now calculated inside the sections useMemo to avoid forward references
  // Keeping them commented for reference
  // const distance = React.useMemo(() => {
  //   if (!order) return '2.5 km';
  //   return order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
  // }, [order]);
  
  // const estimatedTime = React.useMemo(() => {
  //   if (!order) return '15 min';
  //   return order.estimated_delivery_time || '15 min';
  // }, [order]);
  
  // const batchTotalAmount = React.useMemo(() => {
  //   if (isBatchOrder && batchProperties?.orders) {
  //     return batchProperties.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  //   }
  //   return Number(order?.total) || 0;
  // }, [isBatchOrder, batchProperties, order]);
  
  // const totalDeliveryStops = React.useMemo(() => {
  //   return routeStops.filter(stop => stop.type === 'delivery').length;
  // }, [routeStops]);
  
  // const totalPickupStops = React.useMemo(() => {
  //   return routeStops.filter(stop => stop.type === 'pickup').length;
  // }, [routeStops]);

  if (!order) return null;
  
  // TypeScript type narrowing helper
  const orderDeliveryType = order.delivery_type;
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const hasItems = orderItems.length > 0;
  const topItems = orderItems.slice(0, 3);
  const codAmount = order.cash_on_delivery ? Number(order.cod_amount || order.total || 0) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#FF7A1A', '#FFB347']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.badgeRow}>
                <View style={styles.orderTypePill}>
                  <Ionicons
                    name={isBatchOrder ? 'map' : orderDeliveryType === 'food' ? 'restaurant' : 'cube'}
                    size={16}
                    color={flatColors.backgrounds.primary}
                  />
                  <Text style={styles.pillText}>
                    {isBatchOrder ? 'Route request' : 'Incoming order'}
                  </Text>
                </View>
                {order.priority && order.priority !== 'normal' && (
                  <View style={[styles.priorityPill, order.priority === 'urgent' && styles.priorityPillUrgent]}>
                    <Text style={styles.priorityText}>{order.priority.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.timerCircle}>
                <Animated.Text style={styles.timerText}>
                  {timeRemaining > 0 ? timeRemaining : 0}
                </Animated.Text>
                <Text style={styles.timerSub}>sec</Text>
              </View>
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>
                  {orderData?.customerName || 'New delivery'}
                </Text>
                <Text style={styles.headerSub}>
                  Auto-skip if not accepted
                </Text>
              </View>
              <Text style={styles.orderNumber}>#{orderData?.orderNumber}</Text>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {orderData && (
              <>
                <View style={styles.payoutCard}>
                  <View style={styles.payoutRow}>
                    <View>
                      <Text style={styles.payoutLabel}>Payout</Text>
                      <Text style={styles.payoutAmount}>
                        {currency} {orderData.total.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.metaPills}>
                      {order.cash_on_delivery && (
                        <View style={[styles.metaPill, styles.codPill]}>
                          <Ionicons name="cash" size={14} color="#fff" />
                          <Text style={styles.metaPillText}>COD {currency} {codAmount.toFixed(2)}</Text>
                        </View>
                      )}
                      {orderData.deliveryFee > 0 && (
                        <View style={styles.metaPill}>
                          <Ionicons name="car" size={14} color={flatColors.brand.secondary} />
                          <Text style={[styles.metaPillText, { color: flatColors.brand.text }]}>
                            +{currency} {orderData.deliveryFee.toFixed(2)} fee
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.metricRow}>
                    <View style={styles.metricItem}>
                      <Ionicons name="location-outline" size={18} color={flatColors.brand.secondary} />
                      <Text style={styles.metricLabel}>Distance</Text>
                      <Text style={styles.metricValue}>{orderData.distance}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="time-outline" size={18} color={flatColors.brand.secondary} />
                      <Text style={styles.metricLabel}>ETA</Text>
                      <Text style={styles.metricValue}>{orderData.estimatedTime}</Text>
                    </View>
                    {orderData.isBatch && (
                      <View style={styles.metricItem}>
                        <Ionicons name="layers-outline" size={18} color={flatColors.brand.secondary} />
                        <Text style={styles.metricLabel}>Orders</Text>
                        <Text style={styles.metricValue}>{orderData.batchCount}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.pickupDot]} />
                    <View style={styles.locationTextWrap}>
                      <Text style={styles.locationLabel}>Pickup</Text>
                      <Text style={styles.locationValue} numberOfLines={2}>{orderData.pickupAddress}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.dropoffDot]} />
                    <View style={styles.locationTextWrap}>
                      <Text style={styles.locationLabel}>{isWarehouseConsolidation ? 'Warehouse drop-off' : 'Delivery'}</Text>
                      {!orderData.isBatch && (
                        <Text style={styles.customerName}>{orderData.customerName}</Text>
                      )}
                      <Text style={styles.locationValue} numberOfLines={2}>{orderData.deliveryAddress}</Text>
                    </View>
                  </View>
                </View>

                {(order.special_handling && order.special_handling !== 'none') || order.requires_signature || order.requires_id_verification ? (
                  <View style={styles.chipRow}>
                    {order.special_handling && (typeof order.special_handling === 'string' ? order.special_handling !== 'none' : true) && (
                      <View style={[styles.chip, styles.alertChip]}>
                        <Ionicons name="alert-circle" size={14} color="#fff" />
                        <Text style={styles.chipText}>
                          {typeof order.special_handling === 'string'
                            ? order.special_handling.replace(/_/g, ' ')
                            : 'Special handling'}
                        </Text>
                      </View>
                    )}
                    {order.requires_signature && (
                      <View style={styles.chip}>
                        <Ionicons name="create" size={14} color={flatColors.brand.secondary} />
                        <Text style={[styles.chipText, { color: flatColors.brand.text }]}>Signature</Text>
                      </View>
                    )}
                    {order.requires_id_verification && (
                      <View style={styles.chip}>
                        <Ionicons name="card" size={14} color={flatColors.brand.secondary} />
                        <Text style={[styles.chipText, { color: flatColors.brand.text }]}>ID Check</Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {hasItems && (
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>Items ({orderItems.length})</Text>
                      <Ionicons name="cube-outline" size={18} color={flatColors.brand.secondary} />
                    </View>
                    {topItems.map((item, idx) => (
                      <View key={idx} style={[styles.itemRow, idx !== topItems.length - 1 && styles.itemDivider]}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name || item.title || `Item ${idx + 1}`}</Text>
                        {item.quantity && <Text style={styles.itemQty}>x{item.quantity}</Text>}
                      </View>
                    ))}
                    {orderItems.length > topItems.length && (
                      <Text style={styles.moreItemsText}>+{orderItems.length - topItems.length} more</Text>
                    )}
                  </View>
                )}

                {isBatchOrder && batchProperties?.orders?.length ? (
                  <View style={styles.detailCard}>
                    <TouchableOpacity
                      style={styles.cardHeader}
                      onPress={() => setShowRouteDetails(!showRouteDetails)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name="map-outline" size={18} color={flatColors.brand.secondary} />
                        <Text style={styles.cardTitle}>Route orders ({batchProperties.orders.length})</Text>
                      </View>
                      <Ionicons
                        name={showRouteDetails ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={flatColors.neutral[700]}
                      />
                    </TouchableOpacity>
                    {showRouteDetails && (
                      <View style={styles.batchList}>
                        {batchProperties.orders.map((batchOrder, index) => (
                          <View key={batchOrder.id || index} style={[styles.batchRow, index !== batchProperties.orders.length - 1 && styles.batchDivider]}>
                            <View style={styles.batchRowLeft}>
                              <Text style={styles.batchOrderId}>#{batchOrder.order_number || `Order ${index + 1}`}</Text>
                              <Text style={styles.batchCustomer} numberOfLines={1}>
                                {batchOrder.customer?.name || batchOrder.customer_name || 'Customer'}
                              </Text>
                            </View>
                            <View style={styles.batchRowRight}>
                              <Text style={styles.batchAmount}>{currency} {Number(batchOrder.total || 0).toFixed(2)}</Text>
                              {batchOrder.cash_on_delivery && (
                                <View style={[styles.metaPill, styles.codPill, { marginTop: 4 }]}>
                                  <Text style={styles.metaPillText}>COD</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name="information-circle-outline" size={18} color={flatColors.brand.secondary} />
                        <Text style={styles.cardTitle}>Order details</Text>
                      </View>
                      <Text style={styles.orderNumber}>#{orderData.orderNumber}</Text>
                    </View>
                    <Text style={styles.detailHint}>Confirm addresses and handling requirements before accepting.</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color={flatColors.accent.red} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.85}
            >
              <Ionicons name="play-forward" size={18} color={flatColors.neutral[700]} />
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FF7A1A', '#FF9F45']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.acceptGradient}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.acceptText}>{isBatchOrder ? 'Accept route' : 'Accept order'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.9,
    overflow: 'hidden',
    ...premiumShadows.large,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillText: {
    ...premiumTypography.caption.medium,
    color: '#fff',
    fontWeight: '700',
  },
  priorityPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  priorityPillUrgent: {
    backgroundColor: 'rgba(255,59,48,0.18)',
  },
  priorityText: {
    ...premiumTypography.caption.medium,
    color: '#fff',
    fontWeight: '700',
  },
  timerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  timerText: {
    ...premiumTypography.title3,
    color: flatColors.brand.text,
    fontWeight: '800',
  },
  timerSub: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    marginTop: -4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...premiumTypography.title3,
    color: '#fff',
    fontWeight: '800',
  },
  headerSub: {
    ...premiumTypography.caption.medium,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
  },
  orderNumber: {
    ...premiumTypography.caption.medium,
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  contentInner: {
    padding: 18,
    gap: 12,
    paddingBottom: 100,
  },
  payoutCard: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.small,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  payoutLabel: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    fontWeight: '600',
  },
  payoutAmount: {
    ...premiumTypography.title2,
    color: flatColors.neutral[900],
    fontWeight: '800',
  },
  metaPills: {
    alignItems: 'flex-end',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: flatColors.backgrounds.primary,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  metaPillText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[800],
    fontWeight: '600',
  },
  codPill: {
    backgroundColor: flatColors.accent.green,
    borderColor: flatColors.accent.green,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    marginTop: 6,
  },
  metricValue: {
    ...premiumTypography.callout,
    color: flatColors.neutral[900],
    fontWeight: '700',
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  pickupDot: {
    backgroundColor: flatColors.accent.blue,
  },
  dropoffDot: {
    backgroundColor: flatColors.accent.green,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    fontWeight: '700',
  },
  locationValue: {
    ...premiumTypography.body,
    color: flatColors.neutral[900],
    marginTop: 2,
    lineHeight: 20,
  },
  customerName: {
    ...premiumTypography.callout,
    fontWeight: '700',
    color: flatColors.neutral[900],
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: flatColors.neutral[200],
    marginVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.secondary,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  alertChip: {
    backgroundColor: flatColors.accent.red,
    borderColor: flatColors.accent.red,
  },
  chipText: {
    ...premiumTypography.caption.medium,
    color: flatColors.brand.text,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...premiumTypography.callout,
    fontWeight: '700',
    color: flatColors.neutral[900],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  itemName: {
    ...premiumTypography.body,
    color: flatColors.neutral[800],
    flex: 1,
  },
  itemQty: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    marginLeft: 10,
  },
  moreItemsText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    marginTop: 6,
  },
  batchList: {
    marginTop: 6,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  batchDivider: {
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  batchRowLeft: {
    flex: 1,
  },
  batchOrderId: {
    ...premiumTypography.callout,
    fontWeight: '700',
    color: flatColors.neutral[900],
  },
  batchCustomer: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    marginTop: 2,
  },
  batchRowRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  batchAmount: {
    ...premiumTypography.callout,
    fontWeight: '700',
    color: flatColors.neutral[900],
  },
  detailHint: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
    backgroundColor: flatColors.backgrounds.primary,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.accent.red,
    backgroundColor: flatColors.backgrounds.primary,
  },
  declineText: {
    ...premiumTypography.button,
    color: flatColors.accent.red,
    fontWeight: '700',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    backgroundColor: flatColors.backgrounds.primary,
  },
  skipText: {
    ...premiumTypography.button,
    color: flatColors.neutral[700],
    fontWeight: '700',
  },
  acceptButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  acceptText: {
    ...premiumTypography.button,
    color: '#fff',
    fontWeight: '800',
  },
});

export default IncomingOrderModal;
