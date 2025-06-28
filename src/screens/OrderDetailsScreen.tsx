import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Linking,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOrders } from '../contexts/OrderContext';
import { Order, OrderStatus } from '../types';
import { COLORS, FONTS } from '../constants';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_METHOD_ICONS } from '../constants';
import { openMapsForNavigation, getCurrentLocation, isValidCoordinate } from '../utils/locationUtils';

type RootStackParamList = {
  OrderDetails: { orderId: string };
  Dashboard: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'OrderDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'OrderDetails'>;

// Industry-standard delivery workflow stages
const DELIVERY_WORKFLOW = {
  accepted: {
    next: 'en_route_to_pickup',
    action: 'En Route to Pickup',
    icon: 'car-outline',
    description: 'Head to restaurant/pickup location'
  },
  en_route_to_pickup: {
    next: 'arrived_at_pickup',
    action: 'Arrived at Pickup',
    icon: 'location-outline',
    description: 'Arrived at restaurant/pickup location'
  },
  arrived_at_pickup: {
    next: 'picked_up',
    action: 'Order Picked Up',
    icon: 'bag-check-outline',
    description: 'Confirm order is picked up'
  },
  picked_up: {
    next: 'en_route_to_delivery',
    action: 'En Route to Customer',
    icon: 'car-outline',
    description: 'Head to delivery location'
  },
  en_route_to_delivery: {
    next: 'arrived_at_delivery',
    action: 'Arrived at Delivery',
    icon: 'location-outline',
    description: 'Arrived at customer location'
  },
  arrived_at_delivery: {
    next: 'delivered',
    action: 'Complete Delivery',
    icon: 'checkmark-circle-outline',
    description: 'Mark order as delivered'
  },
  delivered: {
    next: null,
    action: 'Completed',
    icon: 'checkmark-circle',
    description: 'Order completed successfully'
  }
} as const;

const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { orderId } = route.params;
  const { updateOrderStatus, getOrderDetails } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load order details when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadOrderDetails();
    }, [orderId])
  );

  const loadOrderDetails = async () => {
    setIsLoading(true);
    try {
      const orderData = await getOrderDetails(orderId);
      if (orderData) {
        setOrder(orderData);
      } else {
        Alert.alert('Error', 'Order not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallCustomer = useCallback(() => {
    if (order?.customer?.phone) {
      Linking.openURL(`tel:${order.customer.phone}`).catch(console.error);
    } else {
      Alert.alert('Error', 'Customer phone number not available');
    }
  }, [order?.customer?.phone]);

  const handleOpenMaps = useCallback(async (location: 'pickup' | 'delivery') => {
    if (!order) return;

    try {
      let destinationLat: number | undefined;
      let destinationLng: number | undefined;
      let locationName: string;

      if (location === 'pickup') {
        // Use restaurant/pickup coordinates if available
        const address = order.restaurantAddress;
        if (isValidCoordinate(address?.coordinates?.latitude, address?.coordinates?.longitude)) {
          destinationLat = address.coordinates!.latitude;
          destinationLng = address.coordinates!.longitude;
        }
        locationName = address?.street || 'Pickup Location';
      } else {
        // Use delivery coordinates
        const address = order.deliveryAddress;
        if (isValidCoordinate(address?.coordinates?.latitude, address?.coordinates?.longitude)) {
          destinationLat = address.coordinates!.latitude;
          destinationLng = address.coordinates!.longitude;
        }
        locationName = address?.street || 'Delivery Location';
      }

      if (destinationLat && destinationLng) {
        // Use precise coordinates for navigation
        try {
          const currentLocation = await getCurrentLocation();
          await openMapsForNavigation(
            destinationLat,
            destinationLng,
            currentLocation.latitude,
            currentLocation.longitude
          );
        } catch (locationError) {
          // Fallback to destination only
          await openMapsForNavigation(destinationLat, destinationLng);
        }
      } else {
        // Fallback to address search
        const query = encodeURIComponent(locationName);
        const url = Platform.select({
          ios: `maps://app?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://maps.google.com/?q=${query}`
        });
        await Linking.openURL(url!);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Unable to open maps. Please try again.');
    }
  }, [order]);

  const handleStatusUpdate = useCallback(async (newStatus: OrderStatus) => {
    if (!order) return;

    // Get workflow info
    const currentWorkflow = DELIVERY_WORKFLOW[order.status as keyof typeof DELIVERY_WORKFLOW];
    const nextStatus = currentWorkflow?.next;

    if (!nextStatus) {
      Alert.alert('Error', 'No next status available for this order');
      return;
    }

    const nextWorkflow = DELIVERY_WORKFLOW[nextStatus as keyof typeof DELIVERY_WORKFLOW];

    Alert.alert(
      'Update Status',
      `${nextWorkflow.description}\n\nAre you sure you want to mark this order as "${nextWorkflow.action}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setIsUpdating(true);
            
            try {
              const success = await updateOrderStatus(order.id, nextStatus as OrderStatus);
              
              if (success) {
                // Show success and handle navigation
                switch (nextStatus) {
                  case 'en_route_to_pickup':
                    Alert.alert(
                      'En Route to Pickup!', 
                      'Navigate to pickup location?',
                      [
                        { text: 'Later', style: 'cancel' },
                        { 
                          text: 'Navigate', 
                          onPress: () => handleOpenMaps('pickup')
                        }
                      ]
                    );
                    break;
                  case 'en_route_to_delivery':
                    Alert.alert(
                      'En Route to Delivery!', 
                      'Navigate to customer location?',
                      [
                        { text: 'Later', style: 'cancel' },
                        { 
                          text: 'Navigate', 
                          onPress: () => handleOpenMaps('delivery')
                        }
                      ]
                    );
                    break;
                  case 'delivered':
                    Alert.alert(
                      'Order Completed!',
                      'The order has been delivered successfully.',
                      [
                        { text: 'Back to Dashboard', onPress: () => navigation.navigate('Dashboard') }
                      ]
                    );
                    return; // Don't reload order details for completed orders
                  default:
                    // For other statuses, just reload the order details
                    break;
                }
                
                // Reload order details to get updated status
                await loadOrderDetails();
              } else {
                Alert.alert('Error', 'Failed to update order status. Please try again.');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update order status. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  }, [order, updateOrderStatus, handleOpenMaps, navigation, loadOrderDetails]);

  const getActionButton = () => {
    if (!order) return null;

    const currentWorkflow = DELIVERY_WORKFLOW[order.status as keyof typeof DELIVERY_WORKFLOW];
    if (!currentWorkflow?.next) return null;

    const nextWorkflow = DELIVERY_WORKFLOW[currentWorkflow.next as keyof typeof DELIVERY_WORKFLOW];

    return (
      <TouchableOpacity 
        style={[styles.actionButton, isUpdating && styles.actionButtonDisabled]}
        onPress={() => handleStatusUpdate(currentWorkflow.next as OrderStatus)}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Ionicons name={nextWorkflow.icon as any} size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>{nextWorkflow.action}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const getStatusProgress = () => {
    if (!order) return null;

    const statuses = ['accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Delivery Progress</Text>
        <View style={styles.progressBar}>
          {statuses.map((status, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const workflow = DELIVERY_WORKFLOW[status as keyof typeof DELIVERY_WORKFLOW];
            
            return (
              <View key={status} style={styles.progressStep}>
                <View style={[
                  styles.progressDot, 
                  isActive && styles.progressDotActive,
                  isCurrent && styles.progressDotCurrent
                ]}>
                  <Ionicons 
                    name={workflow.icon as any} 
                    size={12} 
                    color={isActive ? COLORS.white : COLORS.text.secondary} 
                  />
                </View>
                {index < statuses.length - 1 && (
                  <View style={[styles.progressLine, isActive && styles.progressLineActive]} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] || COLORS.text.secondary;
  const paymentIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] || 'cash';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity onPress={loadOrderDetails}>
          <Ionicons name="refresh" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Order Header */}
        <View style={styles.section}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status] || order.status}</Text>
            </View>
          </View>
          <Text style={styles.orderTime}>
            {new Date(order.orderTime).toLocaleString()}
          </Text>
        </View>

        {/* Progress Indicator */}
        {getStatusProgress()}

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <View style={styles.customerInfo}>
              <View>
                <Text style={styles.customerName}>{order.customer?.name || 'Unknown Customer'}</Text>
                <Text style={styles.customerPhone}>{order.customer?.phone || 'No phone'}</Text>
              </View>
              {order.customer?.phone && (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={handleCallCustomer}
                >
                  <Ionicons name="call" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => handleOpenMaps('pickup')}
          >
            <View style={styles.addressRow}>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.primary.default} />
              <View style={styles.addressContent}>
                <Text style={styles.addressText}>
                  {order.restaurantAddress?.street || 'Pickup location not specified'}
                </Text>
                {order.restaurantAddress?.city && (
                  <Text style={styles.addressSubtext}>
                    {order.restaurantAddress.city}, {order.restaurantAddress.state} {order.restaurantAddress.zipCode}
                  </Text>
                )}
              </View>
              <Ionicons name="navigate-outline" size={20} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => handleOpenMaps('delivery')}
          >
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary.default} />
              <View style={styles.addressContent}>
                <Text style={styles.addressText}>
                  {order.deliveryAddress?.street || 'Address not available'}
                  {order.deliveryAddress?.apartmentUnit && `, ${order.deliveryAddress.apartmentUnit}`}
                </Text>
                {order.deliveryAddress?.city && (
                  <Text style={styles.addressSubtext}>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                  </Text>
                )}
                {order.deliveryAddress?.deliveryInstructions && (
                  <Text style={styles.deliveryInstructions}>
                    {order.deliveryAddress.deliveryInstructions}
                  </Text>
                )}
              </View>
              <Ionicons name="navigate-outline" size={20} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.card}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <View key={`item-${String(item.id || index)}-${String(item.name || '')}`} style={styles.orderItem}>
                  <Text style={styles.itemQuantity}>{item.quantity || 1}x</Text>
                  <Text style={styles.itemName}>{item.name || 'Unknown Item'}</Text>
                  <Text style={styles.itemPrice}>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>No items specified</Text>
            )}
            {order.specialInstructions && (
              <View style={styles.specialInstructions}>
                <Text style={styles.specialInstructionsLabel}>Special Instructions:</Text>
                <Text style={styles.specialInstructionsText}>{order.specialInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <View style={styles.paymentRow}>
              <Ionicons name={paymentIcon as any} size={20} color={COLORS.text.secondary} />
              <Text style={styles.paymentMethod}>
                {order.paymentMethod ? 
                  order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1).replace('_', ' ') :
                  'Not specified'
                }
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>${(order.subtotal || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>${(order.deliveryFee || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>${(order.tax || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tip</Text>
              <Text style={styles.priceValue}>${(order.tip || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${(order.total || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {getActionButton()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary.default,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  orderTime: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary.default,
  },
  progressDotCurrent: {
    backgroundColor: COLORS.success,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.background.secondary,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary.default,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  callButton: {
    backgroundColor: COLORS.primary.default,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  addressText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
  },
  addressSubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  deliveryInstructions: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    width: 30,
  },
  itemName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
  },
  noItemsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  specialInstructions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  specialInstructionsLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  specialInstructionsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  priceValue: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  actionButton: {
    backgroundColor: COLORS.primary.default,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: 8,
  },
});

export default OrderDetailsScreen;