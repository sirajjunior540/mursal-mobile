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
                <Ionicons name="bag-outline" size={20} color={COLORS.primary.default} />
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
                <Ionicons name="home-outline" size={20} color={COLORS.success.default} />
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
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  timerHeader: {
    backgroundColor: '#667eea',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  timerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: FONTS.regular,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  foodBadge: {
    backgroundColor: '#ff6b6b',
  },
  fastBadge: {
    backgroundColor: '#ffd93d',
  },
  orderTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffa94d',
  },
  urgentBadge: {
    backgroundColor: '#ff4757',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  orderSummary: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
    fontFamily: FONTS.bold,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  metric: {
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#666',
    fontFamily: FONTS.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF4757',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4757',
    fontFamily: FONTS.bold,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: FONTS.bold,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
});

export default IncomingOrderModal;