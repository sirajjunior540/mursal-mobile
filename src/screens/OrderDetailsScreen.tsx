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
  Platform,
  Dimensions
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  OrderDetails: { orderId: string; autoNavigate?: boolean };
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
  const { orderId, autoNavigate } = route.params;
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

  // Auto-navigate if requested
  useEffect(() => {
    if (autoNavigate && order) {
      // Small delay to let the screen render first
      setTimeout(() => {
        handleOpenMaps('pickup');
      }, 500);
    }
  }, [autoNavigate, order]);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>{ORDER_STATUS_LABELS[order.status] || order.status}</Text>
        </View>
        <TouchableOpacity onPress={loadOrderDetails} style={styles.headerButton}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {(order.customer?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{order.customer?.name || 'Unknown Customer'}</Text>
                <Text style={styles.heroTime}>
                  {new Date(order.orderTime).toLocaleDateString()} • {new Date(order.orderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroAmount}>${(Number(order.total) || 0).toFixed(2)}</Text>
              <View style={[styles.heroStatus, { backgroundColor: statusColor }]}>
                <Text style={styles.heroStatusText}>{ORDER_STATUS_LABELS[order.status] || order.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => handleOpenMaps('pickup')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="restaurant" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.quickActionText}>Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => handleOpenMaps('delivery')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#4ECDC420' }]}>
              <Ionicons name="location" size={24} color="#4ECDC4" />
            </View>
            <Text style={styles.quickActionText}>Delivery</Text>
          </TouchableOpacity>

          {order.customer?.phone && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={handleCallCustomer}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#45B7D120' }]}>
                <Ionicons name="call" size={24} color="#45B7D1" />
              </View>
              <Text style={styles.quickActionText}>Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#96CEB420' }]}>
              <Ionicons name="chatbubble" size={24} color="#96CEB4" />
            </View>
            <Text style={styles.quickActionText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>
          
          {/* Pickup Location */}
          <TouchableOpacity 
            style={styles.locationCard}
            onPress={() => handleOpenMaps('pickup')}
          >
            <View style={styles.locationIconContainer}>
              <View style={styles.locationIcon}>
                <Ionicons name="restaurant" size={20} color="#FF6B6B" />
              </View>
              <View style={styles.locationLine} />
            </View>
            <View style={styles.locationContent}>
              <View style={styles.locationHeader}>
                <Text style={styles.locationTitle}>Pickup Location</Text>
                <Ionicons name="navigate" size={16} color={COLORS.primary.default} />
              </View>
              <Text style={styles.locationAddress}>
                {order.restaurantAddress?.street || 'Pickup location not specified'}
              </Text>
              {order.restaurantAddress?.city && (
                <Text style={styles.locationSubtext}>
                  {order.restaurantAddress.city}, {order.restaurantAddress.state}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Delivery Location */}
          <TouchableOpacity 
            style={[styles.locationCard, { marginTop: 0 }]}
            onPress={() => handleOpenMaps('delivery')}
          >
            <View style={styles.locationIconContainer}>
              <View style={[styles.locationIcon, { backgroundColor: '#4ECDC420' }]}>
                <Ionicons name="home" size={20} color="#4ECDC4" />
              </View>
            </View>
            <View style={styles.locationContent}>
              <View style={styles.locationHeader}>
                <Text style={styles.locationTitle}>Delivery Address</Text>
                <Ionicons name="navigate" size={16} color={COLORS.primary.default} />
              </View>
              <Text style={styles.locationAddress}>
                {order.deliveryAddress?.street || 'Address not available'}
                {order.deliveryAddress?.apartmentUnit && `, ${order.deliveryAddress.apartmentUnit}`}
              </Text>
              {order.deliveryAddress?.city && (
                <Text style={styles.locationSubtext}>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </Text>
              )}
              {order.deliveryAddress?.deliveryInstructions && (
                <View style={styles.instructionsBox}>
                  <Ionicons name="information-circle" size={16} color="#FFA726" />
                  <Text style={styles.instructionsText}>
                    {order.deliveryAddress.deliveryInstructions}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <View style={styles.itemsCard}>
              {order.items.map((item, index) => (
                <View key={`item-${String(item.id || index)}`} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemQuantity}>
                      <Text style={styles.itemQuantityText}>{item.quantity || 1}</Text>
                    </View>
                    <Text style={styles.itemName}>{item.name || 'Unknown Item'}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                  </Text>
                </View>
              ))}
              
              {order.specialInstructions && (
                <View style={styles.specialInstructions}>
                  <Ionicons name="document-text" size={16} color="#FFA726" />
                  <Text style={styles.specialInstructionsText}>{order.specialInstructions}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Subtotal</Text>
              <Text style={styles.paymentValue}>${(Number(order.subtotal) || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Delivery Fee</Text>
              <Text style={styles.paymentValue}>${(Number(order.deliveryFee) || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Tax</Text>
              <Text style={styles.paymentValue}>${(Number(order.tax) || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Tip</Text>
              <Text style={styles.paymentValue}>${(Number(order.tip) || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRowTotal}>
              <Text style={styles.paymentLabelTotal}>Total</Text>
              <Text style={styles.paymentValueTotal}>${(Number(order.total) || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {getActionButton() && (
        <View style={styles.floatingButtonContainer}>
          {getActionButton()}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerInitial: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  heroTime: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroAmount: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
    marginBottom: 8,
  },
  heroStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heroStatusText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  locationIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E9ECEF',
    marginTop: 8,
  },
  locationContent: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  locationAddress: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  itemsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemQuantity: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemQuantityText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
  },
  itemName: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  specialInstructions: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  specialInstructionsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#F57C00',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
  },
  paymentValue: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text.primary,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 12,
  },
  paymentRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentLabelTotal: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  paymentValueTotal: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary.default,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
  },
  actionButton: {
    backgroundColor: COLORS.primary.default,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary.default,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: 8,
    letterSpacing: 0.5,
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
});

export default OrderDetailsScreen;