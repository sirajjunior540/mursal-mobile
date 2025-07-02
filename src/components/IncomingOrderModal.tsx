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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../types';
import { COLORS, FONTS } from '../constants';
import { haptics } from '../utils/haptics';
import { soundService } from '../services/soundService';
import { Design } from '../constants/designSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IncomingOrderModalProps {
  visible: boolean;
  order: Order | null;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onSkip: (orderId: string) => void;
  onClose: () => void;
  timerDuration?: number; // in seconds
}

const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({
  visible,
  order,
  onAccept,
  onDecline,
  onSkip,
  onClose,
  timerDuration = 10,
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

  // Start countdown timer
  const startTimer = useCallback(() => {
    if (!visible || !order) return;
    
    setTimeRemaining(timerDuration);
    setIsTimerActive(true);
    
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
  }, [visible, order, timerDuration, onSkip]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);

  // Handle actions
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

  // Timer progress animation
  const timerProgress = timeRemaining / timerDuration;
  const progressColor = timeRemaining <= 3 ? '#FF4757' : timeRemaining <= 6 ? '#FFA726' : '#4CAF50';

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
    }
  }, [visible, order, startTimer, stopTimer]);

  if (!order) return null;

  // Calculate distance (placeholder - should come from backend)
  const distance = order.distance ? `${(order.distance / 1000).toFixed(1)} km` : '2.5 km';
  const estimatedTime = '15 min';

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
              <View style={[styles.timerCircle, { borderColor: progressColor }]}>
                <Text style={[styles.timerText, { color: progressColor }]}>
                  {timeRemaining}
                </Text>
              </View>
              <View style={styles.timerInfo}>
                <Text style={styles.timerTitle}>New Order!</Text>
                <Text style={styles.timerSubtitle}>
                  {timeRemaining > 0 ? `Auto-skip in ${timeRemaining}s` : 'Skipped'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Order Type Badge */}
          <View style={styles.orderTypeContainer}>
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
            {order.priority && order.priority !== 'normal' && (
              <View style={[styles.priorityBadge, order.priority === 'urgent' && styles.urgentBadge]}>
                <Text style={styles.priorityText}>
                  {order.priority === 'urgent' ? '🔴' : '🟡'} {order.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <Text style={styles.orderNumber}>Order #{order.order_number || order.id}</Text>
            
            {/* Pickup Info */}
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

            {/* Drop-off Info */}
            <View style={styles.locationSection}>
              <View style={styles.locationIcon}>
                <Ionicons name="home-outline" size={20} color={Design.colors.success} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>DELIVERY</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {order.delivery_address || order.deliveryAddress?.street || 'Delivery location'}
                </Text>
              </View>
            </View>

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
                  ${order.total ? parseFloat(String(order.total)).toFixed(2) : '0.00'}
                </Text>
              </View>
              {order.delivery_fee && (
                <View style={styles.metric}>
                  <Ionicons name="car-outline" size={16} color="#4CAF50" />
                  <Text style={[styles.metricText, { color: '#4CAF50' }]}>
                    +${parseFloat(String(order.delivery_fee)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[5],
  },
  container: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius['2xl'],
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    ...Design.shadows.large,
  },
  timerHeader: {
    backgroundColor: Design.colors.primary,
    paddingVertical: Design.spacing[5],
    paddingHorizontal: Design.spacing[6],
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[4],
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timerText: {
    ...Design.typography.h4,
    fontWeight: 'bold',
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    ...Design.typography.h4,
    color: Design.colors.textInverse,
  },
  timerSubtitle: {
    ...Design.typography.label,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: Design.spacing[2],
    paddingHorizontal: Design.spacing[6],
    paddingVertical: Design.spacing[4],
    backgroundColor: Design.colors.backgroundTertiary,
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.lg,
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
    borderRadius: Design.borderRadius.lg,
    backgroundColor: Design.colors.warning,
  },
  urgentBadge: {
    backgroundColor: Design.colors.error,
  },
  priorityText: {
    ...Design.typography.caption,
    fontWeight: 'bold',
    color: Design.colors.textInverse,
  },
  orderSummary: {
    paddingHorizontal: Design.spacing[6],
    paddingVertical: Design.spacing[5],
  },
  orderNumber: {
    ...Design.typography.h5,
    color: Design.colors.text,
    marginBottom: Design.spacing[5],
    textAlign: 'center',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[4],
    gap: Design.spacing[3],
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Design.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: Design.spacing[5],
    paddingTop: Design.spacing[4],
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
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Design.spacing[3],
    padding: Design.spacing[6],
    backgroundColor: Design.colors.backgroundTertiary,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[4],
    gap: Design.spacing[2],
    borderWidth: 2,
    borderColor: Design.colors.error,
  },
  declineButtonText: {
    ...Design.typography.button,
    color: Design.colors.error,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.gray100,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[4],
    gap: Design.spacing[2],
  },
  skipButtonText: {
    ...Design.typography.button,
    color: Design.colors.textSecondary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.success,
    borderRadius: Design.borderRadius.lg,
    paddingVertical: Design.spacing[4],
    gap: Design.spacing[2],
  },
  acceptButtonText: {
    ...Design.typography.button,
    color: Design.colors.textInverse,
  },
});

export default IncomingOrderModal;