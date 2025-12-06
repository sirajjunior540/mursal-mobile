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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: opacityAnim }
        ]}
      >
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
          {/* Timer Header */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={['#FF6B00', '#FF8F33']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timerHeader}
            >
              <View style={styles.timerContainer}>
                <View style={[styles.timerIconContainer, isBatchOrder && styles.batchTimerIcon]}>
                  <Ionicons
                    name={isBatchOrder ? "map" : "cube"}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.timerInfo}>
                  <Text style={styles.timerTitle}>
                    {isBatchOrder ? 'New Route Available' : 'New Order Available'}
                  </Text>
                  <Text style={styles.timerSubtitle}>
                    {timeRemaining > 0 ? `Auto-skip in ${timeRemaining}s` : 'Skipped'}
                  </Text>
                </View>
                <View style={[styles.timerCircle, { borderColor: '#fff' }]}>
                  <Text style={[styles.timerText, { color: '#fff' }]}>
                    {timeRemaining}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Order Type Badge */}
          <View style={styles.orderTypeContainer}>
            {isBatchOrder ? (
              <View style={[styles.orderTypeBadge, styles.batchBadge, isWarehouseConsolidation && styles.warehouseBadge]}>
                <Ionicons 
                  name={isWarehouseConsolidation ? "business" : (isDistributionBatch ? "git-branch" : "layers")} 
                  size={16} 
                  color={isWarehouseConsolidation ? "#FF9F43" : "#FF6B6B"} 
                />
                <Text style={[styles.orderTypeText, isWarehouseConsolidation ? styles.warehouseOrderTypeText : styles.batchOrderTypeText]}>
                  {isWarehouseConsolidation ? 'WAREHOUSE CONSOLIDATION' : (isDistributionBatch ? 'DISTRIBUTION' : 'BATCH')} ({batchTotalOrders} ORDERS)
                </Text>
              </View>
            ) : (
              <View style={[
                styles.orderTypeBadge,
                orderDeliveryType === 'food' && styles.foodBadge,
                orderDeliveryType === 'fast' && styles.fastBadge,
              ]}>
                <Ionicons 
                  name={orderDeliveryType === 'food' ? 'restaurant' : orderDeliveryType === 'fast' ? 'flash' : 'cube'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.orderTypeText}>
                  {(orderDeliveryType || 'regular').toUpperCase()} ORDER
                </Text>
              </View>
            )}
            {order.priority && order.priority !== 'normal' && (
              <View style={[styles.priorityBadge, order.priority === 'urgent' && styles.urgentBadge]}>
                <Text style={styles.priorityText}>
                  {order.priority === 'urgent' ? '🔴' : '🟡'} {order.priority.toUpperCase()}
                </Text>
              </View>
            )}
            {isBatchOrder && (
              <TouchableOpacity 
                style={styles.routeDetailsButton}
                onPress={() => setShowRouteDetails(!showRouteDetails)}
              >
                <Text style={styles.routeDetailsText}>
                  {showRouteDetails ? 'Hide Route' : 'View Route'}
                </Text>
                <Ionicons 
                  name={showRouteDetails ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color={flatColors.accent.blue} 
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Special Handling Indicators */}
          {(order?.special_handling && order.special_handling !== 'none' || 
            order?.cash_on_delivery || 
            order?.requires_signature || 
            order?.requires_id_verification) && (
            <View style={styles.specialHandlingContainer}>
              {order?.special_handling && (typeof order.special_handling === 'string' ? order.special_handling !== 'none' : true) && (
                <View style={[
                  styles.specialHandlingBadge,
                  order.special_handling === 'fragile' && styles.fragileBadge,
                  order.special_handling === 'temperature_controlled' && styles.temperatureBadge,
                  order.special_handling === 'hazardous' && styles.hazardousBadge,
                ]}>
                  <Ionicons 
                    name={
                      order.special_handling === 'fragile' ? 'warning' :
                      order.special_handling === 'temperature_controlled' ? 'thermometer' :
                      order.special_handling === 'liquid' ? 'water' :
                      order.special_handling === 'hazardous' ? 'nuclear' :
                      order.special_handling === 'perishable' ? 'time' : 'alert-circle'
                    } 
                    size={14} 
                    color="#fff" 
                  />
                  <Text style={styles.specialHandlingText}>
                    {typeof order.special_handling === 'string' 
                      ? order.special_handling.replace(/_/g, ' ').toUpperCase()
                      : isSpecialHandlingObject(order.special_handling)
                        ? (order.special_handling.fragile ? 'FRAGILE' : 
                           order.special_handling.temperature_controlled ? 'TEMPERATURE CONTROLLED' :
                           order.special_handling.hazardous ? 'HAZARDOUS' :
                           order.special_handling.liquid ? 'LIQUID' :
                           order.special_handling.perishable ? 'PERISHABLE' : 'SPECIAL')
                        : 'SPECIAL'}
                  </Text>
                </View>
              )}
              {order.cash_on_delivery && (
                <View style={[styles.specialHandlingBadge, styles.codBadge]}>
                  <Ionicons name="cash" size={14} color="#fff" />
                  <Text style={styles.specialHandlingText}>
                    COD {currency} {Number(order.cod_amount || order.total || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.requires_signature && (
                <View style={[styles.specialHandlingBadge, styles.signatureBadge]}>
                  <Ionicons name="create" size={14} color="#fff" />
                  <Text style={styles.specialHandlingText}>SIGNATURE</Text>
                </View>
              )}
              {order.requires_id_verification && (
                <View style={[styles.specialHandlingBadge, styles.idBadge]}>
                  <Ionicons name="card" size={14} color="#fff" />
                  <Text style={styles.specialHandlingText}>ID CHECK</Text>
                </View>
              )}
            </View>
          )}

          {/* Order Summary - Simplified ScrollView */}
          <ScrollView
            style={styles.orderSummary}
            contentContainerStyle={styles.orderSummaryContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {orderData && (
              <>
                {/* Earnings Card - Most Important! */}
                <View style={styles.earningsCard}>
                  <View style={styles.earningsRow}>
                    <Ionicons name="cash" size={32} color={flatColors.brand.primary} />
                    <View style={styles.earningsInfo}>
                      <Text style={styles.earningsLabel}>TOTAL EARNINGS</Text>
                      <Text style={styles.earningsAmount}>
                        {currency} {orderData.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  {orderData.deliveryFee > 0 && (
                    <View style={styles.deliveryFeeRow}>
                      <Ionicons name="car" size={20} color={flatColors.accent.green} />
                      <Text style={styles.deliveryFeeText}>
                        Delivery Fee: +{currency} {orderData.deliveryFee.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Distance & Time - Quick Metrics */}
                <View style={styles.quickMetrics}>
                  <View style={styles.quickMetric}>
                    <Ionicons name="location" size={20} color={flatColors.brand.primary} />
                    <Text style={styles.quickMetricText}>{orderData.distance}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.quickMetric}>
                    <Ionicons name="time" size={20} color={flatColors.brand.primary} />
                    <Text style={styles.quickMetricText}>{orderData.estimatedTime}</Text>
                  </View>
                  {orderData.isBatch && (
                    <>
                      <View style={styles.metricDivider} />
                      <View style={styles.quickMetric}>
                        <Ionicons name="layers" size={20} color={flatColors.accent.orange} />
                        <Text style={styles.quickMetricText}>{orderData.batchCount} orders</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Pickup Location */}
                <View style={styles.locationCard}>
                  <View style={styles.locationHeader}>
                    <View style={[styles.locationDot, styles.pickupDot]} />
                    <Text style={styles.locationLabelText}>PICKUP</Text>
                  </View>
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {orderData.pickupAddress}
                  </Text>
                </View>

                {/* Delivery Location */}
                <View style={styles.locationCard}>
                  <View style={styles.locationHeader}>
                    <View style={[styles.locationDot, styles.deliveryDot]} />
                    <Text style={styles.locationLabelText}>
                      {isWarehouseConsolidation ? 'WAREHOUSE DROP-OFF' : 'DELIVERY'}
                    </Text>
                  </View>
                  {!orderData.isBatch && (
                    <Text style={styles.customerNameText}>{orderData.customerName}</Text>
                  )}
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {orderData.deliveryAddress}
                  </Text>
                </View>

                {/* Order Number */}
                <View style={styles.orderInfoCard}>
                  <Text style={styles.orderNumberText}>Order {orderData.orderNumber}</Text>
                </View>

                {/* Batch Orders Details - Collapsible */}
                {isBatchOrder && batchProperties?.orders && batchProperties.orders.length > 0 && (
                  <TouchableOpacity
                    style={styles.batchToggleButton}
                    onPress={() => setShowRouteDetails(!showRouteDetails)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.batchToggleHeader}>
                      <Ionicons name="list" size={20} color={flatColors.brand.primary} />
                      <Text style={styles.batchToggleText}>
                        {showRouteDetails ? 'Hide' : 'Show'} {batchProperties.orders.length} Orders
                      </Text>
                      <Ionicons
                        name={showRouteDetails ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={flatColors.brand.primary}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                {showRouteDetails && batchProperties?.orders && (
                  <View style={styles.batchOrdersList}>
                    {batchProperties.orders.map((batchOrder, index) => (
                      <View key={batchOrder.id || index} style={styles.batchOrderItem}>
                        <View style={styles.batchOrderHeader}>
                          <Text style={styles.batchOrderNumber}>
                            #{batchOrder.order_number || `Order ${index + 1}`}
                          </Text>
                          <Text style={styles.batchOrderAmount}>
                            {currency} {Number(batchOrder.total || 0).toFixed(2)}
                          </Text>
                        </View>
                        <Text style={styles.batchOrderCustomer} numberOfLines={1}>
                          {batchOrder.customer?.name || batchOrder.customer_name || 'Customer'}
                        </Text>
                        {batchOrder.cash_on_delivery && (
                          <View style={styles.codBadgeSmall}>
                            <Ionicons name="cash" size={12} color="#fff" />
                            <Text style={styles.codBadgeText}>COD</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={handleAccept}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>
                {isBatchOrder ? 'Accept Route' : 'Accept Order'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={styles.declineButton} 
                onPress={handleDecline}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#FF4757" />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipButton} 
                onPress={handleSkip}
                activeOpacity={0.8}
              >
                <Ionicons name="play-forward" size={18} color={flatColors.neutral[600]} />
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: SCREEN_HEIGHT * 0.9, // Increased to 90% of screen
    overflow: 'hidden',
    ...premiumShadows.large,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    paddingBottom: 88, // Space for action buttons (68px height + 20px padding)
  },
  timerHeader: {
    borderBottomWidth: 0,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.primary,
  },
  timerText: {
    ...premiumTypography.headline.medium,
    fontWeight: '700',
  },
  timerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  timerTitle: {
    ...premiumTypography.callout,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timerSubtitle: {
    ...premiumTypography.caption.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  timerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchTimerIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.blue.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.accent.blue,
    marginRight: 8,
    marginTop: 4,
  },
  foodBadge: {
    backgroundColor: flatColors.cards.red.background,
    borderColor: flatColors.accent.red,
  },
  fastBadge: {
    backgroundColor: flatColors.cards.yellow.background,
    borderColor: flatColors.accent.yellow,
  },
  orderTypeText: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.accent.blue,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: flatColors.cards.yellow.background,
    borderWidth: 1,
    borderColor: flatColors.accent.yellow,
    marginRight: 8,
    marginTop: 4,
  },
  urgentBadge: {
    backgroundColor: flatColors.cards.red.background,
    borderColor: flatColors.accent.red,
  },
  priorityText: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  orderSummary: {
    flex: 1,
    minHeight: 200, // Ensure minimum height
    maxHeight: SCREEN_HEIGHT * 0.55, // Increased to 55% of screen for FlatList
  },
  orderSummaryContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32, // Extra padding for last item
  },
  orderNumber: {
    ...premiumTypography.callout,
    fontSize: 16,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 16,
    textAlign: 'center',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 4,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: flatColors.backgrounds.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.neutral[600],
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  locationAddress: {
    ...premiumTypography.body,
    color: flatColors.neutral[800],
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  metric: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  metricText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    fontWeight: '500',
  },
  successMetricText: {
    color: flatColors.accent.green,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: flatColors.accent.red,
    backgroundColor: 'transparent',
    marginRight: 12,
    minWidth: 120,
  },
  declineButtonText: {
    ...premiumTypography.button,
    color: flatColors.accent.red,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  skipButtonText: {
    ...premiumTypography.button,
    color: flatColors.neutral[600],
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...premiumShadows.small,
    width: '100%',
  },
  acceptButtonText: {
    ...premiumTypography.button,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  batchBadge: {
    backgroundColor: flatColors.cards.red.background,
    borderColor: flatColors.accent.red,
  },
  warehouseBadge: {
    backgroundColor: `${flatColors.accent.orange}15`, // 15% opacity orange
    borderColor: flatColors.accent.orange,
  },
  batchOrderTypeText: {
    color: flatColors.accent.red,
  },
  warehouseOrderTypeText: {
    color: flatColors.accent.orange,
  },
  routeDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    marginTop: 4,
  },
  routeDetailsText: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.blue,
    fontWeight: '600',
  },
  routeSummaryContainer: {
    marginBottom: 16,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: flatColors.cards.red.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: flatColors.cards.red.border,
  },
  routeStat: {
    alignItems: 'center',
    gap: 4,
  },
  routeStatText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[800],
    fontWeight: '600',
  },
  routeStopsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  routeListTitle: {
    ...premiumTypography.callout,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  routeStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: flatColors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    ...premiumTypography.caption.medium,
    fontWeight: '700',
    color: flatColors.neutral[800],
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupIcon: {
    backgroundColor: flatColors.accent.blue,
  },
  deliveryIcon: {
    backgroundColor: flatColors.accent.green,
  },
  stopDetails: {
    flex: 1,
  },
  stopType: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.neutral[600],
    marginBottom: 4,
  },
  stopAddress: {
    ...premiumTypography.body,
    color: flatColors.neutral[800],
    marginBottom: 4,
  },
  stopOrderNumber: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
  },
  stopCustomer: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.blue,
    fontWeight: '600',
  },
  // Special handling styles
  specialHandlingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  specialHandlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    backgroundColor: flatColors.accent.yellow,
  },
  specialHandlingText: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: '#fff',
    fontSize: 11,
  },
  fragileBadge: {
    backgroundColor: '#FF6B6B',
  },
  temperatureBadge: {
    backgroundColor: '#4ECDC4',
  },
  hazardousBadge: {
    backgroundColor: '#FF4757',
  },
  codBadge: {
    backgroundColor: '#00D2D3',
  },
  signatureBadge: {
    backgroundColor: '#8B78E6',
  },
  idBadge: {
    backgroundColor: '#5F3DC4',
  },
  // Batch orders list styles
  batchOrdersList: {
    marginTop: 16,
  },
  batchOrdersHeader: {
    marginBottom: 12,
  },
  batchOrdersTitle: {
    ...premiumTypography.body.medium,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 4,
  },
  batchOrdersSubtitle: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
  },
  warehouseInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.yellow.background,
    borderWidth: 1,
    borderColor: flatColors.cards.yellow.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  warehouseInfoContent: {
    flex: 1,
  },
  warehouseInfoLabel: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    marginBottom: 2,
  },
  warehouseInfoAddress: {
    ...premiumTypography.body.small,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  batchOrderItem: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  batchOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchOrderNumber: {
    backgroundColor: flatColors.cards.blue.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  batchOrderNumberText: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.accent.blue,
  },
  batchOrderAmount: {
    backgroundColor: flatColors.cards.green.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  batchOrderAmountText: {
    ...premiumTypography.caption.medium,
    fontWeight: '700',
    color: flatColors.accent.green,
  },
  batchOrderCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  batchOrderCustomerText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
  },
  batchOrderAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  batchOrderAddressText: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[600],
    flex: 1,
  },
  batchOrderBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  batchOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  batchOrderBadgeText: {
    ...premiumTypography.caption.small,
    fontWeight: '600',
    color: '#fff',
    fontSize: 10,
  },
  specialBadge: {
    backgroundColor: '#FF9F43',
  },
  warehouseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${flatColors.accent.orange}15`, // 15% opacity orange
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  warehouseIndicatorText: {
    ...premiumTypography.caption.small,
    color: flatColors.accent.orange,
    fontWeight: '600',
    fontSize: 11,
  },
  // New simplified styles
  earningsCard: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: flatColors.brand.primary,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    ...premiumTypography.caption.medium,
    fontWeight: '700',
    color: flatColors.neutral[600],
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  earningsAmount: {
    ...premiumTypography.headline.large,
    fontWeight: '800',
    color: flatColors.brand.primary,
    fontSize: 32,
  },
  deliveryFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  deliveryFeeText: {
    ...premiumTypography.body,
    fontWeight: '600',
    color: flatColors.accent.green,
  },
  quickMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  quickMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickMetricText: {
    ...premiumTypography.body.medium,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: flatColors.neutral[300],
  },
  locationCard: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: flatColors.brand.primary,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickupDot: {
    backgroundColor: flatColors.accent.blue,
  },
  deliveryDot: {
    backgroundColor: flatColors.accent.green,
  },
  locationLabelText: {
    ...premiumTypography.caption.medium,
    fontWeight: '700',
    color: flatColors.neutral[600],
    letterSpacing: 0.5,
  },
  customerNameText: {
    ...premiumTypography.body.medium,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 4,
  },
  locationAddressText: {
    ...premiumTypography.body,
    color: flatColors.neutral[700],
    lineHeight: 20,
  },
  orderInfoCard: {
    backgroundColor: flatColors.backgrounds.tertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  orderNumberText: {
    ...premiumTypography.body.small,
    fontWeight: '600',
    color: flatColors.neutral[600],
  },
  batchToggleButton: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  batchToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchToggleText: {
    ...premiumTypography.body.medium,
    fontWeight: '600',
    color: flatColors.brand.primary,
    flex: 1,
    marginLeft: 8,
  },
  batchOrderNumber: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.accent.blue,
  },
  batchOrderCustomer: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    marginTop: 4,
  },
  codBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: flatColors.accent.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  codBadgeText: {
    ...premiumTypography.caption.small,
    fontWeight: '600',
    color: '#fff',
    fontSize: 10,
  },
});

export default IncomingOrderModal;
