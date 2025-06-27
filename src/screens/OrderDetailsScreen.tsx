import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOrders } from '../contexts/OrderContext';
import { Order, OrderStatus } from '../types';
import { COLORS, FONTS } from '../constants';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_METHOD_ICONS } from '../constants';

type RootStackParamList = {
  OrderDetails: { orderId: string };
  Dashboard: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'OrderDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'OrderDetails'>;

const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { orderId } = route.params;
  const { orders: activeOrders, updateOrderStatus } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const foundOrder = activeOrders.find(o => o.id === orderId);
    if (foundOrder) {
      setOrder(foundOrder);
    } else {
      Alert.alert('Error', 'Order not found');
      navigation.goBack();
    }
  }, [orderId, activeOrders]);

  const handleCallCustomer = () => {
    if (order?.customer.phone) {
      Linking.openURL(`tel:${order.customer.phone}`);
    }
  };

  const handleOpenMaps = (address: any) => {
    const query = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
    const url = `https://maps.google.com/?q=${encodeURIComponent(query)}`;
    Linking.openURL(url);
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    Alert.alert(
      'Update Status',
      `Are you sure you want to mark this order as ${ORDER_STATUS_LABELS[newStatus]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setIsUpdating(true);
            const success = await updateOrderStatus(order.id, newStatus);
            setIsUpdating(false);
            
            if (success) {
              if (newStatus === 'delivered') {
                Alert.alert('Success', 'Order delivered successfully!');
                navigation.navigate('Dashboard');
              } else {
                Alert.alert('Success', 'Order status updated');
              }
            } else {
              Alert.alert('Error', 'Failed to update order status');
            }
          }
        }
      ]
    );
  };

  const getNextStatus = (): OrderStatus | null => {
    if (!order) return null;
    
    switch (order.status) {
      case 'accepted':
        return 'picked_up';
      case 'picked_up':
        return 'in_transit';
      case 'in_transit':
        return 'delivered';
      default:
        return null;
    }
  };

  const getStatusButtonText = (): string => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return '';
    
    switch (nextStatus) {
      case 'picked_up':
        return 'Mark as Picked Up';
      case 'in_transit':
        return 'Start Delivery';
      case 'delivered':
        return 'Complete Delivery';
      default:
        return '';
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] || COLORS.text.secondary;
  const paymentIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] || 'cash';
  const nextStatus = getNextStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Order Header */}
        <View style={styles.section}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text>
            </View>
          </View>
          <Text style={styles.orderTime}>
            {new Date(order.orderTime).toLocaleString()}
          </Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <View style={styles.customerInfo}>
              <View>
                <Text style={styles.customerName}>{order.customer.name}</Text>
                <Text style={styles.customerPhone}>{order.customer.phone}</Text>
              </View>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={20} color={COLORS.surface.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Restaurant Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => handleOpenMaps(order.restaurantAddress)}
          >
            <View style={styles.addressRow}>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.primary.default} />
              <View style={styles.addressContent}>
                <Text style={styles.addressText}>
                  {order.restaurantAddress.street}
                </Text>
                <Text style={styles.addressSubtext}>
                  {order.restaurantAddress.city}, {order.restaurantAddress.state} {order.restaurantAddress.zipCode}
                </Text>
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
            onPress={() => handleOpenMaps(order.deliveryAddress)}
          >
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary.default} />
              <View style={styles.addressContent}>
                <Text style={styles.addressText}>
                  {order.deliveryAddress.street}
                  {order.deliveryAddress.apartmentUnit && `, ${order.deliveryAddress.apartmentUnit}`}
                </Text>
                <Text style={styles.addressSubtext}>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                </Text>
                {order.deliveryAddress.deliveryInstructions && (
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
            {order.items.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
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
                {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1).replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>${order.tax.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tip</Text>
              <Text style={styles.priceValue}>${order.tip.toFixed(2)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      {nextStatus && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, isUpdating && styles.actionButtonDisabled]}
            onPress={() => handleStatusUpdate(nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color={COLORS.surface.white} />
            ) : (
              <Text style={styles.actionButtonText}>{getStatusButtonText()}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: COLORS.surface.white,
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
  scrollContent: {
    paddingBottom: 100,
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
    backgroundColor: COLORS.surface.white,
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
    color: COLORS.surface.white,
    textTransform: 'uppercase',
  },
  orderTime: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 8,
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
    backgroundColor: COLORS.surface.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  actionButton: {
    backgroundColor: COLORS.primary.default,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.surface.white,
  },
});

export default OrderDetailsScreen;