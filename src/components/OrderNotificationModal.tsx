import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';

import { Order } from '../types';
import { COLORS, FONTS } from '../constants';
import { calculateDistance } from '../utils/locationUtils';
import { requestLocationPermissions } from '../utils/permissions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderNotificationModalProps {
  visible: boolean;
  order: Order | null;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  onClose: () => void;
  autoCloseTime?: number;
}

interface DriverLocation {
  lat: number;
  lng: number;
}

const OrderNotificationModal: React.FC<OrderNotificationModalProps> = ({
  visible,
  order,
  onAccept,
  onDecline,
  autoCloseTime = 30,
}) => {
  // All hooks must be called before any early returns
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [distance, setDistance] = useState<string>('Calculating...');
  const [timeRemaining, setTimeRemaining] = useState(autoCloseTime);

  const stopCountdown = useCallback((): void => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    countdownAnim.setValue(1);
  }, [countdownAnim]);

  const startCountdown = useCallback((): void => {
    setTimeRemaining(autoCloseTime);

    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          stopCountdown();
          onDecline(order?.id || '');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Animate countdown circle
    Animated.timing(countdownAnim, {
      toValue: 0,
      duration: autoCloseTime * 1000,
      useNativeDriver: false,
    }).start();
  }, [autoCloseTime, countdownAnim, onDecline, order?.id, stopCountdown]);

  const getCurrentLocation = useCallback(async (): Promise<void> => {
    try {
      // Request location permissions using utility function
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        setDistance('Location permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          if (order?.deliveryAddress?.coordinates?.latitude && order?.deliveryAddress?.coordinates?.longitude) {
            const dist = calculateDistance(
              latitude,
              longitude,
              order.deliveryAddress.coordinates.latitude,
              order.deliveryAddress.coordinates.longitude
            );
            setDistance(`${dist.toFixed(1)} km away`);
          } else {
            setDistance('Distance unavailable');
          }
        },
        (error) => {
          console.error('Error getting location:', error?.message || error);
          
          // Provide more specific error messages based on error code
          let errorMessage = 'Location unavailable';
          if (error && typeof error === 'object' && 'code' in error) {
            switch (error.code) {
              case 1: // PERMISSION_DENIED
                errorMessage = 'Location permission denied';
                break;
              case 2: // POSITION_UNAVAILABLE
                errorMessage = 'Location unavailable';
                break;
              case 3: // TIMEOUT
                errorMessage = 'Location timeout';
                break;
              default:
                errorMessage = 'Location error';
                break;
            }
          }
          
          setDistance(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } catch (error) {
      console.error('Error requesting location permission:', error?.message || error);
      
      // Handle permission request errors
      if (error && typeof error === 'object' && 'message' in error) {
        if (error.message.includes('permission')) {
          setDistance('Location permission error');
        } else {
          setDistance('Location setup error');
        }
      } else {
        setDistance('Location error');
      }
    }
  }, [order?.deliveryAddress?.coordinates]);

  const openMapsForRoute = useCallback((): void => {
    if (!order?.deliveryAddress?.coordinates || !driverLocation) return;

    const destination = `${order.deliveryAddress.coordinates.latitude},${order.deliveryAddress.coordinates.longitude}`;
    const origin = `${driverLocation.lat},${driverLocation.lng}`;

    const url = Platform.select({
      ios: `maps://app?saddr=${origin}&daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}&mode=d`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        const fallbackUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
        Linking.openURL(fallbackUrl).catch(console.error);
      });
    }
  }, [order?.deliveryAddress?.coordinates, driverLocation]);

  const handleAccept = useCallback((): void => {
    stopCountdown();
    onAccept(order?.id || '');
  }, [stopCountdown, onAccept, order?.id]);

  const handleDecline = useCallback((): void => {
    stopCountdown();
    onDecline(order?.id || '');
  }, [stopCountdown, onDecline, order?.id]);

  // Get driver's current location
  useEffect(() => {
    if (visible && order) {
      getCurrentLocation().catch((error) => {
        console.error('Failed to get current location:', error?.message || error);
        setDistance('Location unavailable');
      });
      startCountdown();
    } else {
      stopCountdown();
    }

    return () => {
      stopCountdown();
    };
  }, [visible, order, getCurrentLocation, startCountdown, stopCountdown]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Entrance animation
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
    }
  }, [visible, opacityAnim, slideAnim, scaleAnim]);

  // Early return if no order data (after hooks)
  if (!order) {
    console.warn('⚠️ OrderNotificationModal: No order data provided');
    return null;
  }

  // Check if customer data exists, but don't return null - handle gracefully
  if (!order.customer) {
    console.warn('⚠️ OrderNotificationModal: Order missing customer data, using fallbacks', order);
  }

  // Helper function to safely get address string
  const getAddressString = (address: unknown): string => {
    if (!address) return 'Address not available';
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address !== null && 'street' in address) {
      return (address as { street: string }).street;
    }
    return 'Address not available';
  };

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
          {/* Header with countdown */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications" size={24} color={COLORS.primary.default} />
              </View>
              <View>
                <Text style={styles.headerTitle}>New Order</Text>
                <Text style={styles.headerSubtitle}>Order #{order.orderNumber || order.id}</Text>
              </View>
            </View>

            <View style={styles.countdownContainer}>
              <Animated.View 
                style={[
                  styles.countdownCircle,
                  {
                    transform: [{
                      rotate: countdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['360deg', '0deg'],
                      }),
                    }],
                  },
                ]}
              />
              <Text style={styles.countdownText}>{timeRemaining}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>
                {(order.customer?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customer?.name || 'Unknown Customer'}</Text>
              <Text style={styles.customerPhone}>{order.customer?.phone || 'No phone'}</Text>
            </View>
          </View>

          {/* Location and Distance */}
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={20} color={COLORS.primary.default} />
              <Text style={styles.locationTitle}>Delivery Location</Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.address} numberOfLines={2}>
                {getAddressString(order.deliveryAddress)}
              </Text>
              <View style={styles.distanceContainer}>
                <Ionicons name="car-sport" size={16} color={COLORS.text.secondary} />
                <Text style={styles.distance}>{distance}</Text>
              </View>
            </View>

            {driverLocation && order.deliveryAddress?.coordinates && (
              <TouchableOpacity style={styles.routeButton} onPress={openMapsForRoute}>
                <Ionicons name="navigate" size={16} color={COLORS.primary.default} />
                <Text style={styles.routeButtonText}>View Route</Text>
              </TouchableOpacity>
            )}

            {/* Map Preview */}
            {order.deliveryAddress?.coordinates && (
              <View style={styles.mapPreviewContainer}>
                {/* Placeholder until react-native-maps is installed */}
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map" size={32} color={COLORS.primary.default} />
                  <Text style={styles.mapPlaceholderText}>Map Preview</Text>
                  <Text style={styles.mapPlaceholderSubtext}>
                    {getAddressString(order.deliveryAddress)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Contact Customer Button */}
          {order.customer?.phone && (
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Linking.openURL(`tel:${order.customer!.phone}`).catch(console.error)}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary.default} />
              <Text style={styles.contactButtonText}>Contact Customer</Text>
            </TouchableOpacity>
          )}

          {/* Order Details */}
          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={16} color={COLORS.text.secondary} />
                <Text style={styles.detailText}>{order.estimatedDeliveryTime || '30 min'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="card" size={16} color={COLORS.text.secondary} />
                <Text style={styles.detailText}>${(order.total || 0).toFixed(2)}</Text>
              </View>
            </View>

            {order.specialInstructions && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsLabel}>Special Instructions:</Text>
                <Text style={styles.instructions}>{order.specialInstructions}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.declineButton} 
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>Accept Order</Text>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mapPreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.primary.default,
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary.default,
    marginLeft: 8,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    maxWidth: SCREEN_WIDTH - 40,
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  countdownContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  countdownCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: COLORS.primary.default,
    borderTopColor: COLORS.primary.light,
  },
  countdownText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerInitial: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  locationSection: {
    marginBottom: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  addressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  address: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.secondary,
    marginLeft: 6,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  routeButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary.default,
    marginLeft: 6,
  },
  orderDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  instructionsContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
  },
  instructionsLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#856404',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#856404',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  declineButtonText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text.secondary,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: COLORS.primary.default,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});

export default OrderNotificationModal;