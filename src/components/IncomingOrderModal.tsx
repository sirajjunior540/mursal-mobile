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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  const currency = order?.currency || tenantSettings?.currency || 'SAR';
  
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

  // Generate sections for FlatList
  const sections = React.useMemo(() => {
    if (!order) {
      console.log('[IncomingOrderModal] No order data available');
      return [];
    }

    console.log('[IncomingOrderModal] Generating sections for order:', {
      orderId: order.id,
      orderNumber: order.order_number,
      orderType: order.type,
      isBatchOrder,
      customer: order.customer,
      customer_name: order.customer_name,
      customer_details: order.customer_details,
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      dropoff_address: order.dropoff_address,
      total: order.total,
      delivery_fee: order.delivery_fee,
    });

    // Extract customer name with multiple fallbacks
    const extractedCustomerName =
      (order.customer && typeof order.customer === 'object' && order.customer.name) ||
      order.customer_name ||
      (order.customer_details && typeof order.customer_details === 'object' && order.customer_details.name) ||
      (order.customer_details && typeof order.customer_details === 'object' && order.customer_details.customer_name) ||
      (order.dropoff_contact_name) ||
      (typeof order.customer === 'string' ? order.customer : null) ||
      'Customer';

    // Extract pickup address with fallbacks
    const extractedPickupAddress =
      order.pickup_address ||
      (order as any).restaurant_address ||
      'Pickup location';

    // Extract delivery address with fallbacks
    const extractedDeliveryAddress =
      order.delivery_address ||
      order.dropoff_address ||
      (order as any).customer_address ||
      'Delivery location';

    console.log('[IncomingOrderModal] Extracted values:', {
      customerName: extractedCustomerName,
      pickupAddress: extractedPickupAddress,
      deliveryAddress: extractedDeliveryAddress,
    });
    
    // Calculate values within this useMemo to avoid forward references
    const totalPickupStops = routeStops.filter(stop => stop.type === 'pickup').length;
    const totalDeliveryStops = routeStops.filter(stop => stop.type === 'delivery').length;
    const batchTotalAmount = isBatchOrder && batchProperties?.orders 
      ? batchProperties.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      : Number(order?.total) || 0;
    const distance = order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
    const estimatedTime = order.estimated_delivery_time || '15 min';
    
    const sectionsList: SectionData[] = [];
    
    // Order number section
    sectionsList.push({
      id: 'order-number',
      type: 'order-number',
      data: {
        orderNumber: isBatchOrder ? `Route #${batchProperties?.batchId || getOrderDisplayId(order)}` : getOrderDisplayId(order)
      }
    });
    
    if (!isBatchOrder || (batchProperties?.orders?.length || 0) <= 1) {
      // Single order sections - use extracted values with fallbacks
      sectionsList.push(
        {
          id: 'customer-info',
          type: 'customer-info',
          data: {
            customerName: extractedCustomerName
          }
        },
        {
          id: 'location-pickup',
          type: 'location-pickup',
          data: {
            pickupAddress: extractedPickupAddress
          }
        },
        {
          id: 'location-delivery',
          type: 'location-delivery',
          data: {
            deliveryAddress: getDeliveryAddress() || extractedDeliveryAddress,
            isWarehouseConsolidation
          }
        }
      );
    } else {
      // Batch order sections
      // Always show pickup and delivery locations first
      sectionsList.push(
        {
          id: 'location-pickup',
          type: 'location-pickup',
          data: {
            pickupAddress: extractedPickupAddress
          }
        },
        {
          id: 'location-delivery',
          type: 'location-delivery',
          data: {
            deliveryAddress: getDeliveryAddress() || extractedDeliveryAddress,
            isWarehouseConsolidation
          }
        }
      );
      
      // Then show route summary
      sectionsList.push({
        id: 'route-summary',
        type: 'route-summary',
        data: {
          totalPickupStops,
          totalDeliveryStops,
          batchTotalOrders
        }
      });
      
      if (batchProperties?.orders && batchProperties.orders.length > 0) {
        console.log('[IncomingOrderModal] Adding batch orders list section:', {
          ordersCount: batchProperties.orders.length,
          firstOrder: batchProperties.orders[0],
          orders: batchProperties.orders
        });
        sectionsList.push({
          id: 'batch-orders-list',
          type: 'batch-orders-list',
          data: {
            orders: batchProperties.orders
          }
        });
      } else {
        console.log('[IncomingOrderModal] No batch orders to display:', {
          isBatchOrder,
          batchProperties,
          hasOrders: !!batchProperties?.orders,
          ordersLength: batchProperties?.orders?.length
        });
      }
      
      if (showRouteDetails && routeStops.length > 0) {
        sectionsList.push({
          id: 'route-stops',
          type: 'route-stops',
          data: {
            stops: routeStops
          }
        });
      }
    }
    
    // Metrics section
    sectionsList.push({
      id: 'metrics',
      type: 'metrics',
      data: {
        estimatedTime,
        distance,
        totalAmount: Number(isBatchOrder ? batchTotalAmount : (order?.total || 0)) || 0,
        batchTotalOrders: isBatchOrder ? batchTotalOrders : undefined,
        deliveryFee: !isBatchOrder ? order?.delivery_fee : undefined
      }
    });
    
    return sectionsList;
  }, [order, isBatchOrder, batchProperties, showRouteDetails, routeStops, getDeliveryAddress, isWarehouseConsolidation, batchTotalOrders]);

  // Render functions for each section type
  const renderSection: ListRenderItem<SectionData> = ({ item }) => {
    switch (item.type) {
      case 'order-number':
        return (
          <Text style={styles.orderNumber}>
            {item.data?.orderNumber}
          </Text>
        );
        
      case 'customer-info':
        return (
          <View style={styles.locationSection}>
            <View style={styles.locationIcon}>
              <Ionicons name="person-outline" size={20} color={flatColors.primary[500]} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>CUSTOMER</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {item.data?.customerName}
              </Text>
            </View>
          </View>
        );
        
      case 'location-pickup':
        return (
          <View style={styles.locationSection}>
            <View style={styles.locationIcon}>
              <Ionicons name="bag-outline" size={20} color={flatColors.accent.blue} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {item.data?.pickupAddress}
              </Text>
            </View>
          </View>
        );
        
      case 'location-delivery':
        return (
          <View style={styles.locationSection}>
            <View style={styles.locationIcon}>
              <Ionicons 
                name={item.data?.isWarehouseConsolidation ? "business-outline" : "home-outline"} 
                size={20} 
                color={item.data?.isWarehouseConsolidation ? flatColors.accent.orange : flatColors.accent.green} 
              />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>
                {item.data?.isWarehouseConsolidation ? 'DELIVER TO WAREHOUSE' : 'DELIVERY'}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {item.data?.deliveryAddress}
              </Text>
            </View>
          </View>
        );
        
      case 'route-summary':
        return (
          <View style={styles.routeSummaryContainer}>
            <View style={styles.routeStats}>
              <View style={styles.routeStat}>
                <Ionicons name="bag" size={16} color={flatColors.accent.blue} />
                <Text style={styles.routeStatText}>{item.data?.totalPickupStops} Pickups</Text>
              </View>
              <View style={styles.routeStat}>
                <Ionicons name="home" size={16} color={flatColors.accent.green} />
                <Text style={styles.routeStatText}>{item.data?.totalDeliveryStops} Deliveries</Text>
              </View>
              <View style={styles.routeStat}>
                <Ionicons name="receipt" size={16} color={flatColors.accent.orange} />
                <Text style={styles.routeStatText}>{item.data?.batchTotalOrders} Orders</Text>
              </View>
            </View>
          </View>
        );
        
      case 'batch-orders-list':
        const totalBatchAmount = item.data?.orders?.reduce((sum: number, o: BatchOrderItem) => 
          sum + (Number(o.total) || Number(o.total_amount) || 0), 0) || 0;
        const batchTypeText = isWarehouseConsolidation ? 'Warehouse Consolidation' : 
                             isDistributionBatch ? 'Distribution Batch' : 'Batch Orders';
        
        return (
          <View style={styles.batchOrdersList}>
            <View style={styles.batchOrdersHeader}>
              <Text style={styles.batchOrdersTitle}>{batchTypeText}</Text>
              <Text style={styles.batchOrdersSubtitle}>
                {item.data?.orders?.length || 0} orders • Total: {currency} {totalBatchAmount.toFixed(2)}
              </Text>
            </View>
            
            {isWarehouseConsolidation && order && (
              <View style={styles.warehouseInfoBox}>
                <Ionicons name="business" size={16} color={flatColors.accent.orange} />
                <View style={styles.warehouseInfoContent}>
                  <Text style={styles.warehouseInfoLabel}>Warehouse Destination:</Text>
                  <Text style={styles.warehouseInfoAddress}>
                    {(order as BatchOrder).warehouse_info?.warehouse_address || 
                     order.current_batch?.warehouse_info?.warehouse_address || 
                     'Warehouse address pending'}
                  </Text>
                </View>
              </View>
            )}
            
            {item.data?.orders?.map((batchOrder: BatchOrderItem, index: number) => (
              <View key={batchOrder.id || index} style={styles.batchOrderItem}>
                <View style={styles.batchOrderHeader}>
                  <View style={styles.batchOrderNumber}>
                    <Text style={styles.batchOrderNumberText}>
                      #{batchOrder.order_number || `Order ${index + 1}`}
                    </Text>
                  </View>
                  <View style={styles.batchOrderAmount}>
                    <Text style={styles.batchOrderAmountText}>
                      {currency} {Number(batchOrder.total || batchOrder.total_amount || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.batchOrderCustomer}>
                  <Ionicons name="person" size={14} color="#666" />
                  <Text style={styles.batchOrderCustomerText}>
                    {batchOrder.customer?.name || 
                     batchOrder.customer_name || 
                     batchOrder.customer_details?.name || 
                     'Customer'}
                  </Text>
                </View>
                
                <View style={styles.batchOrderAddress}>
                  <Ionicons name="location" size={14} color="#666" />
                  <Text style={styles.batchOrderAddressText} numberOfLines={1}>
                    {isWarehouseConsolidation 
                      ? '🏭 Via warehouse → ' + (batchOrder.delivery_address || 'Final destination') 
                      : (batchOrder.delivery_address || 'Delivery address')}
                  </Text>
                </View>
                
                {/* Special handling indicators for each order */}
                {(batchOrder.cash_on_delivery || batchOrder.requires_signature || batchOrder.special_handling) && (
                  <View style={styles.batchOrderBadges}>
                    {batchOrder.cash_on_delivery && (
                      <View style={[styles.batchOrderBadge, styles.codBadge]}>
                        <Ionicons name="cash" size={12} color="#fff" />
                        <Text style={styles.batchOrderBadgeText}>COD</Text>
                      </View>
                    )}
                    {batchOrder.requires_signature && (
                      <View style={[styles.batchOrderBadge, styles.signatureBadge]}>
                        <Ionicons name="create" size={12} color="#fff" />
                        <Text style={styles.batchOrderBadgeText}>SIG</Text>
                      </View>
                    )}
                    {batchOrder.special_handling && (
                      <View style={[styles.batchOrderBadge, styles.specialBadge]}>
                        <Ionicons name="warning" size={12} color="#fff" />
                        <Text style={styles.batchOrderBadgeText}>
                          {typeof batchOrder.special_handling === 'object' 
                            ? (batchOrder.special_handling.fragile ? 'FRAGILE' : 'SPECIAL')
                            : 'SPECIAL'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        );
        
      case 'route-stops':
        return (
          <View style={styles.routeStopsList}>
            <Text style={styles.routeListTitle}>Route Stops:</Text>
            {item.data?.stops?.map((stop: RouteStop, index: number) => (
              <View key={stop.id} style={styles.routeStopItem}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={[
                  styles.stopIcon,
                  stop.type === 'pickup' ? styles.pickupIcon : styles.deliveryIcon
                ]}>
                  <Ionicons 
                    name={stop.type === 'pickup' ? 'bag' : 'home'} 
                    size={16} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.stopDetails}>
                  <Text style={styles.stopType}>
                    {stop.type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                  </Text>
                  <Text style={styles.stopAddress} numberOfLines={1}>
                    {stop.address}
                  </Text>
                  {stop.orderNumber && (
                    <Text style={styles.stopOrderNumber}>
                      Order #{stop.orderNumber}
                    </Text>
                  )}
                  {stop.customerName && (
                    <Text style={styles.stopCustomer}>
                      {stop.customerName}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );
        
      case 'metrics':
        return (
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.metricText}>{item.data?.estimatedTime}</Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.metricText}>{item.data?.distance}</Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.metricText}>
                {currency} {(item.data?.totalAmount || 0).toFixed(2)}
              </Text>
            </View>
            {item.data?.batchTotalOrders && (
              <View style={styles.metric}>
                <Ionicons name="layers-outline" size={16} color={flatColors.accent.green} />
                <Text style={[styles.metricText, styles.successMetricText]}>
                  {item.data?.batchTotalOrders} orders
                </Text>
              </View>
            )}
            {item.data?.deliveryFee && (
              <View style={styles.metric}>
                <Ionicons name="car-outline" size={16} color={flatColors.accent.green} />
                <Text style={[styles.metricText, styles.successMetricText]}>
                  +{currency} {parseFloat(String(item.data?.deliveryFee)).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        );
        
      default:
        return null;
    }
  };

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
          <Animated.View 
            style={[
              styles.timerHeader,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.timerContainer}>
              <View style={[styles.timerIconContainer, isBatchOrder && styles.batchTimerIcon]}>
                <Ionicons 
                  name={isBatchOrder ? "map" : "cube"} 
                  size={20} 
                  color={isBatchOrder ? flatColors.accent.red : flatColors.accent.blue} 
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
              <View style={[styles.timerCircle, { borderColor: progressColor }]}>
                <Text style={[styles.timerText, { color: progressColor }]}>
                  {timeRemaining}
                </Text>
              </View>
            </View>
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

          {/* Order Summary - Using FlatList for better performance */}
          <FlatList
            data={sections}
            renderItem={renderSection}
            keyExtractor={(item) => item.id}
            style={styles.orderSummary}
            contentContainerStyle={styles.orderSummaryContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => {
              // Optimize scrolling by providing estimated item heights
              const heights: { [key: string]: number } = {
                'order-number': 50,
                'customer-info': 68,
                'location-pickup': 68,
                'location-delivery': 68,
                'route-summary': 100,
                'batch-orders-list': 200, // Approximate
                'route-stops': 300, // Approximate
                'metrics': 80,
              };
              const section = data?.[index];
              const height = section ? (heights[section.type] || 100) : 100;
              return {
                length: height,
                offset: height * index,
                index,
              };
            }}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.declineButton} 
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#FF4757" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Ionicons name="play-forward" size={20} color="#666" />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>
                {isBatchOrder ? 'Accept Route' : 'Accept Order'}
              </Text>
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
    backgroundColor: flatColors.backgrounds.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  timerTitle: {
    ...premiumTypography.callout,
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  timerSubtitle: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    marginTop: 4,
  },
  timerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: flatColors.cards.blue.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchTimerIcon: {
    backgroundColor: flatColors.cards.red.background,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.blue.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: flatColors.accent.blue,
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
    gap: 12,
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
    gap: 4,
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
    flexDirection: 'row',
    gap: 8,
    padding: 20,
    backgroundColor: flatColors.backgrounds.secondary,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.cards.red.background,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: flatColors.accent.red,
  },
  declineButtonText: {
    ...premiumTypography.button,
    color: flatColors.accent.red,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.tertiary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  skipButtonText: {
    ...premiumTypography.button,
    color: flatColors.neutral[600],
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.green,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
    ...premiumShadows.small,
  },
  acceptButtonText: {
    ...premiumTypography.button,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    gap: 4,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
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
});

export default IncomingOrderModal;