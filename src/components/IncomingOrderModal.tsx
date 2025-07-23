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
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order, BatchOrder, extractOrderApiIds, getOrderDisplayId, isBatchOrder as checkIsBatchOrder, getBatchProperties } from '../types';
import { /* COLORS, FONTS */ } from '../constants';
import { haptics } from '../utils/haptics';
import { soundService } from '../services/soundService';
import { notificationService } from '../services/notificationService';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';

const { /* width: SCREEN_WIDTH, */ height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IncomingOrderModalProps {
  visible: boolean;
  order: (Order | BatchOrder) | null;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onSkip: (orderId: string) => void;
  onClose: () => void;
  timerDuration?: number; // in seconds
  onBatchAccept?: (batchId: string, selectedOrders: string[]) => void;
  onAcceptRoute?: (routeId: string, orderData?: any) => void;
}

const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({
  visible,
  order,
  onAccept,
  onDecline,
  onSkip,
  // onClose,
  timerDuration = 10,
  // onBatchAccept,
  onAcceptRoute,
}) => {
  // Animation refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Batch order state
  const [/* selectedOrders, setSelectedOrders */] = useState<string[]>([]);
  const [/* showBatchDetails, setShowBatchDetails */] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  
  // Background wake state
  const [wasInBackground, setWasInBackground] = useState(false);
  
  // Check if this is a batch order
  const isBatchOrder = order && checkIsBatchOrder(order);
  const batchProperties = order ? getBatchProperties(order) : null;
  
  // Determine batch type
  const isDistributionBatch = React.useMemo(() => {
    if (!isBatchOrder || !batchProperties?.orders) return false;
    // Distribution batch has multiple unique delivery addresses
    const uniqueDeliveryAddresses = new Set(
      batchProperties.orders.map(o => o.delivery_address).filter(Boolean)
    );
    return uniqueDeliveryAddresses.size > 1;
  }, [isBatchOrder, batchProperties]);
  
  const isConsolidatedBatch = isBatchOrder && !isDistributionBatch && (batchProperties?.orders?.length || 0) > 1;

  // Generate route stops for batch orders
  const routeStops = React.useMemo(() => {
    if (!isBatchOrder || !batchProperties || !order) return [];
    
    const stops = [];
    
    // Add pickup stop(s)
    if (order.pickup_address) {
      stops.push({
        id: `pickup-${order.id}`,
        type: 'pickup' as const,
        address: order.pickup_address,
        orderNumber: order.order_number,
        customerName: order.customer?.name || order.customer_details?.name
      });
    }
    
    // Add delivery stops
    if (batchProperties.orders && batchProperties.orders.length > 0) {
      batchProperties.orders.forEach(batchOrderItem => {
        if (batchOrderItem.delivery_address) {
          stops.push({
            id: `delivery-${batchOrderItem.id}`,
            type: 'delivery' as const,
            address: batchOrderItem.delivery_address || '',
            orderNumber: batchOrderItem.order_number,
            customerName: batchOrderItem.customer?.name || batchOrderItem.customer_details?.name
          });
        }
      });
    } else if (order.delivery_address) {
      // Single delivery for consolidated orders
      stops.push({
        id: `delivery-${order.id}`,
        type: 'delivery' as const,
        address: order.delivery_address || '',
        orderNumber: order.order_number,
        customerName: order.customer?.name || order.customer_details?.name
      });
    }
    
    return stops;
  }, [isBatchOrder, batchProperties, order]);

  // Start countdown timer
  const startTimer = useCallback(() => {
    if (!visible || !order) return;
    
    setTimeRemaining(timerDuration);
    setIsTimerActive(true);
    
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
  
  // Start persistent ringing
  const startRinging = useCallback(() => {
    if (!visible || !order) return;
    
    // Clear any existing ringing interval first
    stopRinging();
    
    // Play initial sound
    notificationService.playOrderSound();
    notificationService.vibrateForOrder();
    
    // Set up repeating ring every 3 seconds for 30 seconds
    let ringCount = 0;
    const maxRings = 10; // Ring for 30 seconds
    
    ringingRef.current = setInterval(() => {
      ringCount++;
      if (ringCount >= maxRings) {
        stopRinging();
        return;
      }
      
      notificationService.playOrderSound();
      if (ringCount % 2 === 0) { // Vibrate every other ring
        notificationService.vibrateForOrder();
      }
    }, 3000);
  }, [visible, order, stopRinging]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);
  
  // Stop ringing
  const stopRinging = useCallback(() => {
    if (ringingRef.current) {
      clearInterval(ringingRef.current);
      ringingRef.current = null;
    }
    // Also stop any ongoing vibrations
    notificationService.stopVibration();
  }, []);

  // Handle actions
  const handleAccept = useCallback(() => {
    if (!order) return;
    stopTimer();
    stopRinging();
    haptics.success();
    
    if (isBatchOrder && onAcceptRoute && order.current_batch?.id) {
      // For batch orders, accept the entire batch using the batch ID
      const batchId = order.current_batch.id;
      console.log('✅ Driver accepted batch:', batchId);
      console.log('🔍 Batch details:', {
        batchId: batchId,
        batchName: order.current_batch.name,
        orderCount: batchProperties?.orders?.length || 1
      });
      onAcceptRoute(batchId, order);
    } else {
      const apiIds = extractOrderApiIds(order);
      console.log('✅ Driver accepted order:', getOrderDisplayId(order));
      console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
      onAccept(apiIds.deliveryId);
    }
  }, [order, stopTimer, stopRinging, isBatchOrder, onAcceptRoute, batchProperties, onAccept]);

  const handleDecline = useCallback(() => {
    if (!order) return;
    stopTimer();
    stopRinging();
    haptics.warning();
    const apiIds = extractOrderApiIds(order);
    console.log('❌ Driver declined order:', getOrderDisplayId(order));
    console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
    onDecline(apiIds.deliveryId);
  }, [order, stopTimer, stopRinging, onDecline]);

  const handleSkip = useCallback(() => {
    if (!order) return;
    stopTimer();
    stopRinging();
    haptics.light();
    const apiIds = extractOrderApiIds(order);
    console.log('⏭️ Driver skipped order:', getOrderDisplayId(order));
    console.log('🔍 Using delivery ID for API call:', apiIds.deliveryId);
    onSkip(apiIds.deliveryId);
  }, [order, stopTimer, stopRinging, onSkip]);
  
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
  
  // Handle app state changes for background wake
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && wasInBackground && visible) {
        // App was woken from background due to notification
        console.log('📱 App woken from background for order notification');
        startRinging(); // Resume ringing if order is still visible
        setWasInBackground(false);
      } else if (nextAppState === 'background') {
        setWasInBackground(true);
        stopRinging(); // Stop ringing when app goes to background
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [wasInBackground, visible, startRinging, stopRinging]);

  // Timer progress animation
  // const timerProgress = timeRemaining / timerDuration;
  const progressColor = timeRemaining <= 3 ? '#FF4757' : timeRemaining <= 6 ? '#FFA726' : '#4CAF50';

  // Effects
  useEffect(() => {
    if (visible && order) {
      // Always show route details for batch orders
      if (isBatchOrder) {
        setShowRouteDetails(true);
      }
      
      // Play notification sound and start ringing
      soundService.playOrderNotification();
      haptics.notification();
      startRinging();

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
        stopRinging();
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
      stopRinging();
    }
  }, [visible, order, startTimer, stopTimer, startRinging, stopRinging, isBatchOrder, batchProperties]);

  if (!order) return null;

  // Calculate distance (placeholder - should come from backend)
  const distance = order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
  const estimatedTime = order.estimated_delivery_time || '15 min';
  
  // Calculate batch totals
  const batchTotalOrders = isBatchOrder ? (batchProperties?.orders?.length || 1) : 1;
  const batchTotalAmount = isBatchOrder && batchProperties?.orders ? 
    batchProperties.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) : 
    (Number(order.total) || 0);
  const totalDeliveryStops = routeStops.filter(stop => stop.type === 'delivery').length;
  const totalPickupStops = routeStops.filter(stop => stop.type === 'pickup').length;

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
              <View style={[styles.orderTypeBadge, styles.batchBadge]}>
                <Ionicons name={isDistributionBatch ? "git-branch" : "layers"} size={16} color="#FF6B6B" />
                <Text style={[styles.orderTypeText, styles.batchOrderTypeText]}>
                  {isDistributionBatch ? 'DISTRIBUTION' : 'CONSOLIDATED'} ({batchTotalOrders} ORDERS)
                </Text>
              </View>
            ) : (
              <View style={[
                styles.orderTypeBadge,
                order.delivery_type === 'food' && styles.foodBadge,
                order.delivery_type === 'fast' && styles.fastBadge,
              ]}>
                <Ionicons 
                  name={order.delivery_type === 'food' ? 'restaurant' : order.delivery_type === 'fast' ? 'flash' : 'cube'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.orderTypeText}>
                  {(order.delivery_type || 'regular').toUpperCase()} ORDER
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
          {(order.special_handling && order.special_handling !== 'none' || 
            order.cash_on_delivery || 
            order.requires_signature || 
            order.requires_id_verification) && (
            <View style={styles.specialHandlingContainer}>
              {order.special_handling && order.special_handling !== 'none' && (
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
                    {order.special_handling.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              )}
              {order.cash_on_delivery && (
                <View style={[styles.specialHandlingBadge, styles.codBadge]}>
                  <Ionicons name="cash" size={14} color="#fff" />
                  <Text style={styles.specialHandlingText}>
                    COD ${Number(order.cod_amount || order.total || 0).toFixed(2)}
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

          {/* Order Summary */}
          <ScrollView style={styles.orderSummary} showsVerticalScrollIndicator={false}>
            <Text style={styles.orderNumber}>
              {isBatchOrder ? `Route #${batchProperties?.batchId || getOrderDisplayId(order)}` : getOrderDisplayId(order)}
            </Text>
            
            {!isBatchOrder || (batchProperties?.orders?.length || 0) <= 1 ? (
              <>
                {/* Customer Info */}
                <View style={styles.locationSection}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="person-outline" size={20} color={flatColors.primary} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>CUSTOMER</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {order.customer?.name || order.customer_details?.name || 'Customer Name'}
                    </Text>
                  </View>
                </View>

                {/* Single Order or Single-Order Batch - Pickup Info */}
                <View style={styles.locationSection}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="bag-outline" size={20} color={flatColors.accent.blue} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationAddress} numberOfLines={2}>
                      {order.pickup_address || 'Pickup location'}
                    </Text>
                  </View>
                </View>

                {/* Single Order or Single-Order Batch - Drop-off Info */}
                <View style={styles.locationSection}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="home-outline" size={20} color={flatColors.accent.green} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>DELIVERY</Text>
                    <Text style={styles.locationAddress} numberOfLines={2}>
                      {order.delivery_address || 'Delivery location'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Batch Order - Route Summary */}
                <View style={styles.routeSummaryContainer}>
                  <View style={styles.routeStats}>
                    <View style={styles.routeStat}>
                      <Ionicons name="bag" size={16} color={flatColors.accent.blue} />
                      <Text style={styles.routeStatText}>{totalPickupStops} Pickups</Text>
                    </View>
                    <View style={styles.routeStat}>
                      <Ionicons name="home" size={16} color={flatColors.accent.green} />
                      <Text style={styles.routeStatText}>{totalDeliveryStops} Deliveries</Text>
                    </View>
                    <View style={styles.routeStat}>
                      <Ionicons name="receipt" size={16} color={flatColors.accent.orange} />
                      <Text style={styles.routeStatText}>{batchTotalOrders} Orders</Text>
                    </View>
                  </View>
                </View>

                {/* Batch Orders List */}
                {batchProperties?.orders && batchProperties.orders.length > 0 && (
                  <View style={styles.batchOrdersList}>
                    <Text style={styles.batchOrdersTitle}>Orders in this batch:</Text>
                    {batchProperties.orders.map((batchOrder, index) => (
                      <View key={batchOrder.id || index} style={styles.batchOrderItem}>
                        <View style={styles.batchOrderHeader}>
                          <View style={styles.batchOrderNumber}>
                            <Text style={styles.batchOrderNumberText}>
                              #{batchOrder.order_number || `Order ${index + 1}`}
                            </Text>
                          </View>
                          <View style={styles.batchOrderAmount}>
                            <Text style={styles.batchOrderAmountText}>
                              ${Number(batchOrder.total || 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.batchOrderCustomer}>
                          <Ionicons name="person" size={14} color="#666" />
                          <Text style={styles.batchOrderCustomerText}>
                            {batchOrder.customer?.name || batchOrder.customer_details?.name || 'Customer'}
                          </Text>
                        </View>
                        
                        <View style={styles.batchOrderAddress}>
                          <Ionicons name="location" size={14} color="#666" />
                          <Text style={styles.batchOrderAddressText} numberOfLines={1}>
                            {batchOrder.delivery_address || 'Delivery address'}
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
                )}
                
                {/* Route Details */}
                {showRouteDetails && (
                  <View style={styles.routeStopsList}>
                    <Text style={styles.routeListTitle}>Route Stops:</Text>
                    {routeStops.map((stop, index) => (
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
                )}
              </>
            )}

            {/* Order Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.metricText}>{estimatedTime}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.metricText}>{distance}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.metricText}>
                  ${isBatchOrder ? batchTotalAmount.toFixed(2) : (order.total ? parseFloat(String(order.total)).toFixed(2) : '0.00')}
                </Text>
              </View>
              {isBatchOrder && (
                <View style={styles.metric}>
                  <Ionicons name="layers-outline" size={16} color={flatColors.accent.green} />
                  <Text style={[styles.metricText, styles.successMetricText]}>
                    {batchTotalOrders} orders
                  </Text>
                </View>
              )}
              {!isBatchOrder && order.delivery_fee && (
                <View style={styles.metric}>
                  <Ionicons name="car-outline" size={16} color={flatColors.accent.green} />
                  <Text style={[styles.metricText, styles.successMetricText]}>
                    +${parseFloat(String(order.delivery_fee)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
            
          </ScrollView>

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
    overflow: 'hidden',
    ...premiumShadows.large,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  batchOrderTypeText: {
    color: flatColors.accent.red,
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
    paddingHorizontal: 20,
  },
  batchOrdersTitle: {
    ...premiumTypography.body.medium,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 12,
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
});

export default IncomingOrderModal;