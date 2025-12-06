import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { UniversalMapView } from '../components/UniversalMap/UniversalMapView';
import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '../types';
import { locationService } from '../services/locationService';
import { flatColors } from '../design/dashboard/flatColors';
import { Design } from '../constants/designSystem';

interface PickupScreenParams {
  orderId?: string;
  deliveryId?: string;
}

type RootStackParamList = {
  PickupScreen: PickupScreenParams;
  Dashboard: undefined;
  Navigation: undefined;
};

type PickupScreenRouteProp = RouteProp<RootStackParamList, 'PickupScreen'>;
type PickupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PickupScreen'>;

const PickupScreen: React.FC = () => {
  const navigation = useNavigation<PickupScreenNavigationProp>();
  const route = useRoute<PickupScreenRouteProp>();
  // Make params optional - allow accessing without params from tab
  const orderId = route.params?.orderId;
  const deliveryId = route.params?.deliveryId;

  const { driverOrders, updateOrderStatus } = useOrders();
  const { driver } = useDriver();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [isWithinRange, setIsWithinRange] = useState(true); // Temporarily enabled for testing
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Find the order from driver orders - or find first active order if no params
  useEffect(() => {
    let foundOrder: Order | undefined;

    console.log('[PickupScreen] Looking for order:', { deliveryId, orderId, driverOrdersCount: driverOrders.length });
    console.log('[PickupScreen] Driver orders statuses:', driverOrders.map(o => ({ id: o.id, status: o.status })));

    if (deliveryId || orderId) {
      // If params provided, find that specific order
      foundOrder = driverOrders.find(o => o.id === deliveryId || o.id === orderId);
    } else {
      // No params - find first non-delivered/non-cancelled order
      // Any order in driverOrders is already assigned to this driver
      foundOrder = driverOrders.find(o =>
        o.status !== 'delivered' &&
        o.status !== 'cancelled' &&
        o.status !== 'failed'
      );

      // If no active order found with status filter, just take the first one
      if (!foundOrder && driverOrders.length > 0) {
        console.log('[PickupScreen] No filtered order found, using first order');
        foundOrder = driverOrders[0];
      }
    }

    console.log('[PickupScreen] Found order:', foundOrder ? { id: foundOrder.id, status: foundOrder.status } : null);

    if (foundOrder) {
      setOrder(foundOrder);
    } else if (deliveryId || orderId) {
      // Only show error if specific order was requested
      Alert.alert('Error', 'Order not found', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    // If no active orders and no params, just show empty state (handled in render)
  }, [driverOrders, orderId, deliveryId, navigation]);

  // Get driver's current location and calculate distance
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        setDriverLocation(location);

        // Calculate distance to pickup if order has pickup coordinates
        if (order?.pickup_latitude && order?.pickup_longitude) {
          const distance = locationService.calculateDistance(
            location.latitude,
            location.longitude,
            Number(order.pickup_latitude),
            Number(order.pickup_longitude)
          ) * 1000; // Convert to meters

          setDistanceToPickup(distance);
          // TODO: Re-enable distance check in production
          // setIsWithinRange(distance <= 100); // Within 100 meters
          setIsWithinRange(true); // Temporarily allow pickup from any distance for testing
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    // Update location immediately
    updateLocation();

    // Update location every 10 seconds
    const interval = setInterval(updateLocation, 10000);

    return () => clearInterval(interval);
  }, [order]);

  // Map points for visualization
  const mapPoints = useMemo(() => {
    const points = [];

    // Add driver's current location first
    if (driverLocation) {
      points.push({
        id: 'driver-location',
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        title: 'Your Location',
        type: 'current' as const,
      });
    }

    // Add pickup location if available
    if (order?.pickup_latitude && order?.pickup_longitude) {
      const pickupLat = Number(order.pickup_latitude);
      const pickupLng = Number(order.pickup_longitude);
      console.log('[PickupScreen] Pickup coordinates:', { pickupLat, pickupLng });

      if (!isNaN(pickupLat) && !isNaN(pickupLng) && pickupLat !== 0 && pickupLng !== 0) {
        points.push({
          id: 'pickup-location',
          latitude: pickupLat,
          longitude: pickupLng,
          title: 'Pickup Location',
          description: order.pickup_address || 'Merchant Location',
          type: 'pickup' as const,
        });
      } else {
        console.warn('[PickupScreen] Invalid pickup coordinates');
      }
    } else {
      console.log('[PickupScreen] No pickup coordinates in order');
    }

    console.log('[PickupScreen] Map points:', points);
    return points;
  }, [order, driverLocation]);

  // Calculate ETA (simple estimate: 2 minutes per km)
  const estimatedTime = useMemo(() => {
    if (!distanceToPickup) return null;
    const km = distanceToPickup / 1000;
    const minutes = Math.ceil(km * 2); // 2 minutes per km
    return minutes;
  }, [distanceToPickup]);

  // Handlers
  const handleStartNavigation = useCallback(() => {
    if (!order?.pickup_latitude || !order?.pickup_longitude) {
      Alert.alert('Error', 'Pickup location not available');
      return;
    }

    const lat = Number(order.pickup_latitude);
    const lng = Number(order.pickup_longitude);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open navigation app');
    });
  }, [order]);

  const handleCallMerchant = useCallback(() => {
    const phone = order?.pickup_contact_phone;
    if (phone?.trim()) {
      Linking.openURL(`tel:${phone.trim()}`).catch(() => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    } else {
      Alert.alert('No Phone Number', 'Merchant phone number is not available');
    }
  }, [order]);

  const handleArrivedAtPickup = useCallback(async () => {
    if (!order) return;

    // In dev mode, skip the distance check
    if (!isWithinRange && !__DEV__) {
      Alert.alert(
        'Not Close Enough',
        'You must be within 100 meters of the pickup location to mark as arrived.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Arrived at Pickup',
      'Have you arrived at the pickup location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              const success = await updateOrderStatus(order.id, 'ready');
              if (success) {
                Alert.alert(
                  'Success',
                  'Status updated. Please collect the items from the merchant.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', 'Failed to update order status');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setIsUpdatingStatus(false);
            }
          }
        }
      ]
    );
  }, [order, isWithinRange, updateOrderStatus]);

  const handlePickedUpItems = useCallback(async () => {
    if (!order) return;

    Alert.alert(
      'Picked Up Items',
      'Have you collected all items from the merchant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              const success = await updateOrderStatus(order.id, 'picked_up');
              if (success) {
                Alert.alert(
                  'Success',
                  'Items picked up! Now navigate to the delivery location.',
                  [
                    {
                      text: 'Start Delivery',
                      onPress: () => {
                        // Navigate to DeliveryScreen with the order
                        navigation.navigate('DeliveryScreen' as never, { order } as never);
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to update order status');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setIsUpdatingStatus(false);
            }
          }
        }
      ]
    );
  }, [order, updateOrderStatus, navigation]);

  const handleStartDelivery = useCallback(() => {
    if (!order) return;
    // Navigate to DeliveryScreen with the order
    navigation.navigate('DeliveryScreen' as never, { order } as never);
  }, [order, navigation]);

  // Show different states based on whether we have params or not
  if (!order) {
    const hasParams = !!(orderId || deliveryId);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />
        <View style={styles.loadingContainer}>
          {hasParams ? (
            // Loading specific order
            <Text style={styles.loadingText}>Loading order details...</Text>
          ) : (
            // No active order - show empty state
            <>
              <Ionicons name="car-outline" size={64} color={flatColors.neutral[400]} />
              <Text style={styles.emptyTitle}>No Active Order</Text>
              <Text style={styles.emptySubtitle}>
                When you accept an order, you'll see the pickup details here.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={flatColors.neutral[900]} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {order.status === 'ready' ? 'Pickup Items' :
             order.status === 'picked_up' || order.status === 'in_transit' ? 'Start Delivery' :
             'Navigate to Pickup'}
          </Text>
          <Text style={styles.headerSubtitle}>Order #{order.order_number || order.id}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Map View */}
        <View style={styles.mapContainer}>
          <UniversalMapView
            points={mapPoints}
            height={300}
            showCurrentLocation={true}
            style={styles.map}
          />
        </View>

        {/* ETA Card */}
        {distanceToPickup !== null && (
          <View style={styles.etaCard}>
            <View style={styles.etaRow}>
              <View style={styles.etaItem}>
                <Ionicons name="navigate" size={24} color={flatColors.accent.blue} />
                <Text style={styles.etaLabel}>Distance</Text>
                <Text style={styles.etaValue}>
                  {distanceToPickup < 1000
                    ? `${Math.round(distanceToPickup)}m`
                    : `${(distanceToPickup / 1000).toFixed(1)}km`}
                </Text>
              </View>
              {estimatedTime && (
                <View style={styles.etaItem}>
                  <Ionicons name="time-outline" size={24} color={flatColors.accent.purple} />
                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={styles.etaValue}>
                    {estimatedTime < 60 ? `${estimatedTime} min` : `${Math.round(estimatedTime / 60)}h ${estimatedTime % 60}m`}
                  </Text>
                </View>
              )}
            </View>
            {isWithinRange && (
              <View style={styles.withinRangeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={flatColors.accent.green} />
                <Text style={styles.withinRangeText}>Within range</Text>
              </View>
            )}
          </View>
        )}

        {/* Merchant Card */}
        <View style={styles.merchantCard}>
          <View style={styles.merchantHeader}>
            <View style={styles.merchantIconContainer}>
              <Ionicons name="storefront" size={24} color={flatColors.accent.blue} />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>
                {order.pickup_contact_name || 'Merchant'}
              </Text>
              <Text style={styles.merchantAddress}>
                {order.pickup_address || 'Pickup Location'}
              </Text>
            </View>
          </View>

          {order.pickup_contact_phone && (
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={handleCallMerchant}
            >
              <Ionicons name="call" size={20} color={flatColors.accent.blue} />
              <Text style={styles.phoneButtonText}>{order.pickup_contact_phone}</Text>
            </TouchableOpacity>
          )}

          {order.pickup_instructions && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsLabel}>Pickup Instructions:</Text>
              <Text style={styles.instructionsText}>{order.pickup_instructions}</Text>
            </View>
          )}
        </View>

        {/* Order Details */}
        <View style={styles.orderDetailsCard}>
          <Text style={styles.orderDetailsTitle}>Order Details</Text>

          {order.items && order.items.length > 0 && (
            <View style={styles.itemsList}>
              <Text style={styles.itemsLabel}>Items ({order.items.length}):</Text>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.orderMetaRow}>
            <View style={styles.orderMetaItem}>
              <Text style={styles.orderMetaLabel}>Customer:</Text>
              <Text style={styles.orderMetaValue}>
                {order.customer_name || order.customer?.name || 'N/A'}
              </Text>
            </View>
            <View style={styles.orderMetaItem}>
              <Text style={styles.orderMetaLabel}>Payment:</Text>
              <Text style={styles.orderMetaValue}>
                {order.payment_method || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Show based on order status */}
      <View style={styles.actionButtons}>
        {/* Navigation button always visible */}
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handleStartNavigation}
        >
          <Ionicons name="navigate" size={20} color={flatColors.backgrounds.primary} />
          <Text style={styles.navigationButtonText}>
            {order.status === 'picked_up' || order.status === 'in_transit' ? 'Navigate to Customer' : 'Navigate to Pickup'}
          </Text>
        </TouchableOpacity>

        {/* Show "Arrived at Pickup" for orders not yet marked as ready */}
        {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'assigned' || order.status === 'preparing') && (
          <TouchableOpacity
            style={[
              styles.arrivedButton,
              !isWithinRange && !__DEV__ && styles.arrivedButtonDisabled,
            ]}
            onPress={handleArrivedAtPickup}
            disabled={isUpdatingStatus}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={flatColors.backgrounds.primary}
            />
            <Text style={styles.arrivedButtonText}>
              {isUpdatingStatus ? 'Updating...' : 'Arrived at Pickup'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Show "Picked Up Items" for orders with status 'ready' */}
        {order.status === 'ready' && (
          <TouchableOpacity
            style={styles.pickedUpButton}
            onPress={handlePickedUpItems}
            disabled={isUpdatingStatus}
          >
            <Ionicons name="bag-check" size={20} color={flatColors.backgrounds.primary} />
            <Text style={styles.pickedUpButtonText}>
              {isUpdatingStatus ? 'Updating...' : 'Items Picked Up'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Show "Start Delivery" for orders with status 'picked_up' or 'in_transit' */}
        {(order.status === 'picked_up' || order.status === 'in_transit') && (
          <TouchableOpacity
            style={styles.deliveryButton}
            onPress={handleStartDelivery}
          >
            <Ionicons name="car" size={20} color={flatColors.backgrounds.primary} />
            <Text style={styles.deliveryButtonText}>Continue to Delivery</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallMerchant}
        >
          <Ionicons name="call" size={20} color={flatColors.accent.blue} />
          <Text style={styles.callButtonText}>Call Merchant</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: flatColors.neutral[600],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginTop: Design.spacing[4],
  },
  emptySubtitle: {
    fontSize: 14,
    color: flatColors.neutral[500],
    marginTop: Design.spacing[2],
    textAlign: 'center',
    paddingHorizontal: Design.spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    backgroundColor: flatColors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  backButton: {
    padding: Design.spacing[2],
    marginRight: Design.spacing[3],
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: flatColors.neutral[900],
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: flatColors.neutral[600],
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    marginBottom: Design.spacing[4],
  },
  map: {
    borderRadius: 0,
  },
  etaCard: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    ...Design.shadows.small,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  etaItem: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginTop: Design.spacing[1],
  },
  etaValue: {
    fontSize: 18,
    fontWeight: '600',
    color: flatColors.neutral[900],
    marginTop: Design.spacing[1],
  },
  withinRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    paddingHorizontal: Design.spacing[3],
    backgroundColor: flatColors.cards.green.background,
    borderRadius: Design.borderRadius.md,
  },
  withinRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.accent.green,
    marginLeft: Design.spacing[1],
  },
  merchantCard: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    ...Design.shadows.small,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[3],
  },
  merchantIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: flatColors.neutral[900],
    marginBottom: 4,
  },
  merchantAddress: {
    fontSize: 14,
    color: flatColors.neutral[600],
    lineHeight: 20,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    backgroundColor: flatColors.cards.blue.background,
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[3],
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.accent.blue,
    marginLeft: Design.spacing[2],
  },
  instructionsContainer: {
    paddingVertical: Design.spacing[3],
    paddingHorizontal: Design.spacing[4],
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: Design.borderRadius.md,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: flatColors.neutral[700],
    marginBottom: Design.spacing[1],
  },
  instructionsText: {
    fontSize: 14,
    color: flatColors.neutral[600],
    lineHeight: 20,
  },
  orderDetailsCard: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    ...Design.shadows.small,
  },
  orderDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.neutral[900],
    marginBottom: Design.spacing[3],
  },
  itemsList: {
    marginBottom: Design.spacing[3],
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.neutral[700],
    marginBottom: Design.spacing[2],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.accent.blue,
    marginRight: Design.spacing[2],
    width: 30,
  },
  itemName: {
    fontSize: 14,
    color: flatColors.neutral[700],
    flex: 1,
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderMetaItem: {
    flex: 1,
  },
  orderMetaLabel: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginBottom: 4,
  },
  orderMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.neutral[900],
  },
  actionButtons: {
    padding: Design.spacing[4],
    backgroundColor: flatColors.backgrounds.primary,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.backgrounds.primary,
    marginLeft: Design.spacing[2],
  },
  arrivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.green,
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
  },
  arrivedButtonDisabled: {
    backgroundColor: flatColors.neutral[200],
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.backgrounds.primary,
    marginLeft: Design.spacing[2],
  },
  arrivedButtonTextDisabled: {
    color: flatColors.neutral[400],
  },
  pickedUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.purple,
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
  },
  pickedUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.backgrounds.primary,
    marginLeft: Design.spacing[2],
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
  },
  deliveryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.backgrounds.primary,
    marginLeft: Design.spacing[2],
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    borderWidth: 1,
    borderColor: flatColors.accent.blue,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.accent.blue,
    marginLeft: Design.spacing[2],
  },
});

export default PickupScreen;
