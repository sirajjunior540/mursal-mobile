import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../types';
import { Design, getButtonStyle } from '../constants/designSystem';
import { haptics } from '../utils/haptics';
import { soundService } from '../services/soundService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Extended Order interface to support batch orders
interface BatchOrder extends Order {
  isBatch?: boolean;
  batchId?: string;
  batchSize?: number;
  consolidationWarehouseId?: string;
  finalDeliveryAddress?: string;
  orders?: Order[]; // For batch orders containing multiple individual orders
}

interface ImprovedOrderNotificationModalProps {
  visible: boolean;
  order: BatchOrder | null;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onSkip: (orderId: string) => void;
  onClose: () => void;
  timerDuration?: number; // in seconds
}

const ImprovedOrderNotificationModal: React.FC<ImprovedOrderNotificationModalProps> = ({
  visible,
  order,
  onAccept,
  onDecline,
  onSkip,
  onClose,
  timerDuration = 15, // Increased for batch orders
}) => {
  // Animation refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown timer with progress animation
  const startTimer = useCallback(() => {
    if (!visible || !order) return;
    
    setTimeRemaining(timerDuration);
    setIsTimerActive(true);
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: timerDuration * 1000,
      useNativeDriver: false,
    }).start();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-skip when timer reaches 0
          console.log('⏰ Timer expired, auto-skipping order:', order.id);
          onSkip(order.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [visible, order, timerDuration, onSkip, progressAnim]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setIsTimerActive(false);
    progressAnim.stopAnimation();
  }, [progressAnim]);

  // Handle actions with improved haptics
  const handleAccept = useCallback(() => {
    if (!order) return;
    stopTimer();
    haptics.success();
    console.log('✅ Driver accepted order:', order.id);
    onAccept(order.id);
  }, [order, stopTimer, onAccept]);

  const handleDecline = useCallback(() => {
    if (!order) return;
    stopTimer();
    haptics.warning();
    console.log('❌ Driver declined order:', order.id);
    onDecline(order.id);
  }, [order, stopTimer, onDecline]);

  const handleSkip = useCallback(() => {
    if (!order) return;
    stopTimer();
    haptics.light();
    console.log('⏭️ Driver skipped order:', order.id);
    onSkip(order.id);
  }, [order, stopTimer, onSkip]);

  // Timer progress and color
  const timerProgress = timeRemaining / timerDuration;
  const progressColor = timeRemaining <= 3 ? Design.colors.error : 
                       timeRemaining <= 6 ? Design.colors.warning : 
                       Design.colors.success;

  // Effects
  useEffect(() => {
    if (visible && order) {
      // Play notification sound
      soundService.playOrderNotification();
      haptics.notification();

      // Start entrance animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: Design.animation.medium,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulse animation for urgency
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Start timer
      startTimer();

      return () => {
        stopTimer();
        pulseAnimation.stop();
      };
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: Design.animation.fast,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: Design.animation.fast,
          useNativeDriver: true,
        }),
      ]).start();
      
      stopTimer();
    }
  }, [visible, order, startTimer, stopTimer, opacityAnim, slideAnim, scaleAnim, pulseAnim]);

  if (!order) return null;

  const isBatchOrder = order.isBatch && order.batchSize && order.batchSize > 1;
  const estimatedDistance = order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
  const estimatedTime = isBatchOrder ? `${15 + ((order.batchSize || 1) * 5)} min` : '15 min';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
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
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: progressColor,
                }
              ]} 
            />
          </View>

          {/* Timer Header */}
          <Animated.View 
            style={[
              styles.timerHeader,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.timerContainer}>
              <View style={[styles.timerCircle, { borderColor: progressColor }]}>
                <Text style={[styles.timerText, { color: progressColor }]}>
                  {timeRemaining}
                </Text>
              </View>
              <View style={styles.timerInfo}>
                <Text style={styles.timerTitle}>
                  {isBatchOrder ? '📦 Batch Order!' : '🚚 New Order!'}
                </Text>
                <Text style={styles.timerSubtitle}>
                  {timeRemaining > 0 ? `Auto-skip in ${timeRemaining}s` : 'Skipped'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleSkip}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Design.colors.textInverse} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Order Type and Priority Badges */}
          <View style={styles.badgeContainer}>
            {isBatchOrder ? (
              <View style={styles.batchBadge}>
                <Ionicons name="layers" size={16} color={Design.colors.textInverse} />
                <Text style={styles.batchBadgeText}>
                  BATCH ({order.batchSize} ORDERS)
                </Text>
              </View>
            ) : (
              <View style={[
                styles.orderTypeBadge,
                order.delivery_type === 'food' && styles.foodBadge,
                order.delivery_type === 'fast' && styles.fastBadge,
              ]}>
                <Ionicons 
                  name={order.delivery_type === 'food' ? 'restaurant' : 
                       order.delivery_type === 'fast' ? 'flash' : 'cube'} 
                  size={16} 
                  color={Design.colors.textInverse} 
                />
                <Text style={styles.orderTypeText}>
                  {(order.delivery_type || 'regular').toUpperCase()}
                </Text>
              </View>
            )}
            
            {order.priority && order.priority !== 'normal' && (
              <View style={[
                styles.priorityBadge, 
                order.priority === 'urgent' && styles.urgentBadge,
                order.priority === 'high' && styles.highBadge
              ]}>
                <Text style={styles.priorityText}>
                  {order.priority === 'urgent' ? '🔴' : 
                   order.priority === 'high' ? '🟡' : '🟢'} {order.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Order Content */}
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Order Number */}
            <Text style={styles.orderNumber}>
              {isBatchOrder && order.batchId ? 
                `Batch #${order.batchId}` : 
                `Order #${order.order_number || order.id}`}
            </Text>
            
            {/* Route Information */}
            <View style={styles.routeContainer}>
              {/* Pickup Location */}
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, styles.pickupDot]} />
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {order.pickup_address || 'Customer location'}
                  </Text>
                </View>
              </View>

              {/* Route Line */}
              <View style={styles.routeLine} />

              {/* Warehouse Stop (for batch orders) */}
              {isBatchOrder && order.consolidationWarehouseId && (
                <>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.warehouseDot]} />
                    <View style={styles.locationContent}>
                      <Text style={styles.locationLabel}>WAREHOUSE</Text>
                      <Text style={styles.locationAddress} numberOfLines={2}>
                        Consolidation Hub #{order.consolidationWarehouseId}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeLine} />
                </>
              )}

              {/* Final Delivery */}
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, styles.deliveryDot]} />
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>
                    {isBatchOrder ? `DELIVERIES (${order.batchSize})` : 'DELIVERY'}
                  </Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {isBatchOrder ? 
                      order.finalDeliveryAddress || 'Multiple delivery locations' :
                      order.delivery_address || 'Delivery location'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Order Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metric}>
                <Ionicons name="time-outline" size={18} color={Design.colors.primary} />
                <Text style={styles.metricLabel}>Time</Text>
                <Text style={styles.metricValue}>{estimatedTime}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="location-outline" size={18} color={Design.colors.primary} />
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue}>{estimatedDistance}</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="cash-outline" size={18} color={Design.colors.success} />
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>
                  ${order.total ? parseFloat(String(order.total)).toFixed(2) : '0.00'}
                </Text>
              </View>
              {order.delivery_fee && (
                <View style={styles.metric}>
                  <Ionicons name="car-outline" size={18} color={Design.colors.success} />
                  <Text style={styles.metricLabel}>Earnings</Text>
                  <Text style={[styles.metricValue, { color: Design.colors.success }]}>
                    +${parseFloat(String(order.delivery_fee)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Batch Order Details */}
            {isBatchOrder && order.orders && (
              <View style={styles.batchDetailsContainer}>
                <Text style={styles.batchDetailsTitle}>Orders in this batch:</Text>
                {order.orders.slice(0, 3).map((batchOrder, index) => (
                  <View key={batchOrder.id} style={styles.batchOrderItem}>
                    <Text style={styles.batchOrderNumber}>#{batchOrder.order_number || batchOrder.id}</Text>
                    <Text style={styles.batchOrderCustomer} numberOfLines={1}>
                      {batchOrder.customer_details?.name || 'Customer'}
                    </Text>
                  </View>
                ))}
                {order.orders.length > 3 && (
                  <Text style={styles.batchMoreText}>
                    +{order.orders.length - 3} more orders
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={24} color={Design.colors.error} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.skipButton]}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Ionicons name="play-forward-circle" size={24} color={Design.colors.textSecondary} />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color={Design.colors.textInverse} />
              <Text style={styles.acceptButtonText}>Accept</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
  },
  container: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius['2xl'],
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.9,
    overflow: 'hidden',
    ...Design.shadows.large,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Design.colors.backgroundTertiary,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timerHeader: {
    backgroundColor: Design.colors.primary,
    paddingVertical: Design.spacing[4],
    paddingHorizontal: Design.spacing[5],
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[4],
  },
  timerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timerText: {
    ...Design.typography.h5,
    fontWeight: 'bold',
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    ...Design.typography.h5,
    color: Design.colors.textInverse,
    fontWeight: '600',
  },
  timerSubtitle: {
    ...Design.typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Design.spacing[1],
  },
  closeButton: {
    padding: Design.spacing[2],
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: Design.spacing[2],
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[3],
    backgroundColor: Design.colors.backgroundTertiary,
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.info,
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.base,
    gap: Design.spacing[2],
  },
  batchBadgeText: {
    ...Design.typography.caption,
    fontWeight: 'bold',
    color: Design.colors.textInverse,
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.base,
    gap: Design.spacing[2],
  },
  foodBadge: {
    backgroundColor: Design.colors.error,
  },
  fastBadge: {
    backgroundColor: Design.colors.warning,
  },
  orderTypeText: {
    ...Design.typography.caption,
    fontWeight: 'bold',
    color: Design.colors.textInverse,
  },
  priorityBadge: {
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.base,
    backgroundColor: Design.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  urgentBadge: {
    backgroundColor: Design.colors.errorBackground,
    borderColor: Design.colors.error,
  },
  highBadge: {
    backgroundColor: Design.colors.warningBackground,
    borderColor: Design.colors.warning,
  },
  priorityText: {
    ...Design.typography.caption,
    fontWeight: 'bold',
    color: Design.colors.text,
  },
  contentContainer: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  orderNumber: {
    ...Design.typography.h4,
    color: Design.colors.text,
    textAlign: 'center',
    marginVertical: Design.spacing[4],
    paddingHorizontal: Design.spacing[5],
  },
  routeContainer: {
    paddingHorizontal: Design.spacing[5],
    marginBottom: Design.spacing[4],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Design.spacing[3],
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: Design.spacing[2],
  },
  pickupDot: {
    backgroundColor: Design.colors.primary,
  },
  warehouseDot: {
    backgroundColor: Design.colors.warning,
  },
  deliveryDot: {
    backgroundColor: Design.colors.success,
  },
  locationContent: {
    flex: 1,
    paddingBottom: Design.spacing[3],
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
  routeLine: {
    width: 2,
    height: Design.spacing[4],
    backgroundColor: Design.colors.border,
    marginLeft: 5,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[4],
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  metric: {
    alignItems: 'center',
    gap: Design.spacing[1],
  },
  metricLabel: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  metricValue: {
    ...Design.typography.label,
    color: Design.colors.text,
    fontWeight: '600',
  },
  batchDetailsContainer: {
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[4],
  },
  batchDetailsTitle: {
    ...Design.typography.label,
    color: Design.colors.text,
    marginBottom: Design.spacing[3],
  },
  batchOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
  },
  batchOrderNumber: {
    ...Design.typography.body,
    color: Design.colors.primary,
    fontWeight: '600',
  },
  batchOrderCustomer: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  batchMoreText: {
    ...Design.typography.caption,
    color: Design.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Design.spacing[2],
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: Design.spacing[3],
    padding: Design.spacing[5],
    backgroundColor: Design.colors.backgroundTertiary,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[4],
    gap: Design.spacing[2],
    minHeight: Design.touchTargets.recommended,
  },
  declineButton: {
    backgroundColor: Design.colors.background,
    borderWidth: 2,
    borderColor: Design.colors.error,
  },
  declineButtonText: {
    ...Design.typography.button,
    color: Design.colors.error,
  },
  skipButton: {
    backgroundColor: Design.colors.gray100,
  },
  skipButtonText: {
    ...Design.typography.button,
    color: Design.colors.textSecondary,
  },
  acceptButton: {
    backgroundColor: Design.colors.success,
    ...Design.shadows.medium,
  },
  acceptButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
  },
});

export default ImprovedOrderNotificationModal;