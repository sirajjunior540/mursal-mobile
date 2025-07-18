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
import { Design } from '../constants/designSystem';

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
        customerName: order.customer_details?.name
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
            customerName: batchOrderItem.customer_details?.name
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
        customerName: order.customer_details?.name
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
    
    // Play initial sound
    notificationService.playOrderSound();
    notificationService.vibrateForOrder();
    
    // Set up repeating ring every 3 seconds for 30 seconds
    let ringCount = 0;
    const maxRings = 10; // Ring for 30 seconds
    
    ringingRef.current = setInterval(() => {
      if (ringCount >= maxRings) {
        stopRinging();
        return;
      }
      
      notificationService.playOrderSound();
      if (ringCount % 2 === 0) { // Vibrate every other ring
        notificationService.vibrateForOrder();
      }
      ringCount++;
    }, 3000);
  }, [visible, order]);

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
  }, []);

  // Handle actions
  const handleAccept = useCallback(() => {
    if (!order) return;
    stopTimer();
    stopRinging();
    haptics.success();
    
    if (isBatchOrder && onAcceptRoute) {
      // For batch orders, accept the entire route
      console.log('✅ Driver accepted batch/route:', batchProperties?.batchId || order.id);
      onAcceptRoute(batchProperties?.batchId || order.id, order);
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
                  color={isBatchOrder ? "#FF6B6B" : Design.colors.primary} 
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
                  color={Design.colors.primary} 
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
                    COD ${order.cod_amount?.toFixed(2) || order.total?.toFixed(2) || '0.00'}
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
                {/* Single Order or Single-Order Batch - Pickup Info */}
                <View style={styles.locationSection}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="bag-outline" size={20} color={Design.colors.primary} />
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
                    <Ionicons name="home-outline" size={20} color={Design.colors.success} />
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
                      <Ionicons name="bag" size={16} color={Design.colors.primary} />
                      <Text style={styles.routeStatText}>{totalPickupStops} Pickups</Text>
                    </View>
                    <View style={styles.routeStat}>
                      <Ionicons name="home" size={16} color={Design.colors.success} />
                      <Text style={styles.routeStatText}>{totalDeliveryStops} Deliveries</Text>
                    </View>
                    <View style={styles.routeStat}>
                      <Ionicons name="receipt" size={16} color={Design.colors.warning} />
                      <Text style={styles.routeStatText}>{batchTotalOrders} Orders</Text>
                    </View>
                  </View>
                </View>
                
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
                  <Ionicons name="layers-outline" size={16} color={Design.colors.success} />
                  <Text style={[styles.metricText, styles.successMetricText]}>
                    {batchTotalOrders} orders
                  </Text>
                </View>
              )}
              {!isBatchOrder && order.delivery_fee && (
                <View style={styles.metric}>
                  <Ionicons name="car-outline" size={16} color={Design.colors.success} />
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
    paddingHorizontal: Design.spacing[5],
  },
  container: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    ...Design.shadows.large,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  timerHeader: {
    backgroundColor: Design.colors.backgroundSecondary,
    paddingVertical: Design.spacing[4],
    paddingHorizontal: Design.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[3],
  },
  timerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Design.colors.background,
  },
  timerText: {
    ...Design.typography.h5,
    fontWeight: '700',
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    ...Design.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
  },
  timerSubtitle: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[1],
  },
  timerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Design.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchTimerIcon: {
    backgroundColor: '#FFE5E5',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: Design.spacing[2],
    paddingHorizontal: Design.spacing[5],
    paddingTop: Design.spacing[3],
    paddingBottom: Design.spacing[2],
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primaryLight,
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
    gap: Design.spacing[2],
    borderWidth: 1,
    borderColor: Design.colors.primary,
  },
  foodBadge: {
    backgroundColor: Design.colors.errorBackground,
    borderColor: Design.colors.error,
  },
  fastBadge: {
    backgroundColor: Design.colors.warningBackground,
    borderColor: Design.colors.warning,
  },
  orderTypeText: {
    ...Design.typography.caption,
    fontWeight: '600',
    color: Design.colors.primary,
  },
  priorityBadge: {
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
    backgroundColor: Design.colors.warningBackground,
    borderWidth: 1,
    borderColor: Design.colors.warning,
  },
  urgentBadge: {
    backgroundColor: Design.colors.errorBackground,
    borderColor: Design.colors.error,
  },
  priorityText: {
    ...Design.typography.caption,
    fontWeight: '600',
    color: Design.colors.text,
  },
  orderSummary: {
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[4],
  },
  orderNumber: {
    ...Design.typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: Design.colors.text,
    marginBottom: Design.spacing[4],
    textAlign: 'center',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[3],
    gap: Design.spacing[3],
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Design.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    ...Design.typography.overline,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[1],
  },
  locationAddress: {
    ...Design.typography.body,
    color: Design.colors.text,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Design.spacing[4],
    paddingTop: Design.spacing[3],
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  metric: {
    alignItems: 'center',
    gap: Design.spacing[1],
  },
  metricText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    fontWeight: '500',
  },
  successMetricText: {
    color: Design.colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Design.spacing[2],
    padding: Design.spacing[5],
    backgroundColor: Design.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.errorBackground,
    borderRadius: Design.borderRadius.md,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[1],
    borderWidth: 1,
    borderColor: Design.colors.errorBorder,
  },
  declineButtonText: {
    ...Design.typography.button,
    color: Design.colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.backgroundTertiary,
    borderRadius: Design.borderRadius.md,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[1],
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  skipButtonText: {
    ...Design.typography.button,
    color: Design.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.success,
    borderRadius: Design.borderRadius.md,
    paddingVertical: Design.spacing[3],
    gap: Design.spacing[1],
  },
  acceptButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  batchBadge: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  batchOrderTypeText: {
    color: '#FF6B6B',
  },
  routeDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
    backgroundColor: Design.colors.background,
    gap: Design.spacing[1],
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  routeDetailsText: {
    ...Design.typography.caption,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  routeSummaryContainer: {
    marginBottom: Design.spacing[4],
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Design.spacing[4],
    backgroundColor: '#FFF5F5', // Light red background for batch
    borderRadius: Design.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  routeStat: {
    alignItems: 'center',
    gap: Design.spacing[1],
  },
  routeStatText: {
    ...Design.typography.caption,
    color: Design.colors.text,
    fontWeight: '600',
  },
  routeStopsList: {
    marginTop: Design.spacing[4],
    paddingTop: Design.spacing[4],
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  routeListTitle: {
    ...Design.typography.bodySmall,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[3],
  },
  routeStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[3],
    marginBottom: Design.spacing[2],
    gap: Design.spacing[3],
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Design.colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    ...Design.typography.caption,
    fontWeight: '700',
    color: Design.colors.text,
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupIcon: {
    backgroundColor: Design.colors.primary,
  },
  deliveryIcon: {
    backgroundColor: Design.colors.success,
  },
  stopDetails: {
    flex: 1,
  },
  stopType: {
    ...Design.typography.caption,
    fontWeight: '600',
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[1],
  },
  stopAddress: {
    ...Design.typography.body,
    color: Design.colors.text,
    marginBottom: Design.spacing[1],
  },
  stopOrderNumber: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  stopCustomer: {
    ...Design.typography.caption,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  // Special handling styles
  specialHandlingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Design.spacing[2],
    paddingHorizontal: Design.spacing[5],
    paddingBottom: Design.spacing[3],
  },
  specialHandlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.sm,
    gap: Design.spacing[1],
    backgroundColor: Design.colors.warning,
  },
  specialHandlingText: {
    ...Design.typography.caption,
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
  // Unused styles removed for ESLint compliance
  // batchOrdersList, batchListTitle, batchOrderItem, etc.
});

export default IncomingOrderModal;