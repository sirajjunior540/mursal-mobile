import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  Platform,
  StatusBar,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Haptics from 'react-native-haptic-feedback';

// Design System
import { Design, getStatusColor } from '../constants/designSystem';

// Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// Services
import { useOrders } from '../features/orders/context/OrderProvider';
import { orderActionService } from '../services/orderActionService';
import { navigationService } from '../services/navigationService';

const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const { orderId, autoNavigate } = route.params as any;
  
  const { getOrderDetails, updateOrderStatus } = useOrders();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadOrderDetails();
    
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Design.animation.medium,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...Design.animation.spring,
        useNativeDriver: true,
      }),
    ]).start();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const details = await getOrderDetails(orderId);
      console.log('[OrderDetails] Loaded order details:', {
        orderId,
        hasDetails: !!details,
        pickup_latitude: details?.pickup_latitude,
        pickup_longitude: details?.pickup_longitude,
        delivery_latitude: details?.delivery_latitude,
        delivery_longitude: details?.delivery_longitude,
        pickup_address: details?.pickup_address,
        delivery_address: details?.delivery_address
      });
      setOrder(details);
      
      if (autoNavigate && details) {
        handleNavigate();
      }
    } catch (error) {
      console.error('[OrderDetails] Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'Phone number is not available for this contact.');
      return;
    }
    Haptics.trigger('impactLight');
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = () => {
    if (!order) return;
    
    Haptics.trigger('impactMedium');
    
    // Determine which location to navigate to based on order status
    let destination;
    if (order?.status === 'assigned' || order?.status === 'en_route_to_pickup') {
      // Navigate to pickup location
      destination = {
        latitude: parseFloat(order?.pickup_latitude),
        longitude: parseFloat(order?.pickup_longitude),
        address: order?.pickup_address
      };
    } else {
      // Navigate to delivery location
      destination = {
        latitude: parseFloat(order?.delivery_latitude),
        longitude: parseFloat(order?.delivery_longitude),
        address: order?.delivery_address
      };
    }
    
    if (destination?.latitude && destination?.longitude && !isNaN(destination.latitude) && !isNaN(destination.longitude)) {
      navigationService.navigateToDestination(destination);
    } else {
      Alert.alert('Navigation Error', 'Location coordinates are not available.');
    }
  };

  const handleNextAction = async () => {
    if (!order) return;
    
    setActionLoading(true);
    Haptics.trigger('impactMedium');
    
    try {
      const nextAction = orderActionService.getNextAction(order.status);
      if (nextAction) {
        await updateOrderStatus(order.id, nextAction.status);
        await loadOrderDetails();
        
        if (nextAction.status === 'delivered') {
          Alert.alert('Success', 'Order completed successfully!');
          navigation.goBack();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={Design.colors.text} />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>Order Details</Text>
      
      <View style={styles.headerRight} />
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const renderOrderHeader = () => (
    <Card style={styles.headerCard}>
      <View style={styles.orderHeaderContent}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderNumber}>Order #{order?.order_number || 'N/A'}</Text>
          <Text style={styles.orderDate}>
            {order?.created_at ? formatDate(order.created_at) : 'Date not available'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order?.status) }]}>
            {order?.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderCustomerInfo = () => {
    const customerName = order?.customer_name || order?.customer?.name || order?.customer_details?.name || 'Customer';
    const customerPhone = order?.customer_phone || order?.customer?.phone || order?.customer_details?.phone || '';
    const customerEmail = order?.customer_email || order?.customer?.email || order?.customer_details?.email || '';
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={20} color={Design.colors.text} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{customerName}</Text>
          </View>
        </View>
        
        {customerPhone ? (
          <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(customerPhone)}>
            <View style={styles.iconContainer}>
              <Ionicons name="call-outline" size={20} color={Design.colors.text} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={[styles.infoValue, styles.linkText]}>{customerPhone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Design.colors.text} />
          </TouchableOpacity>
        ) : null}
        
        {customerEmail ? (
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={20} color={Design.colors.text} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{customerEmail}</Text>
            </View>
          </View>
        ) : null}
      </Card>
    );
  };

  const renderLocationCard = (type: 'pickup' | 'delivery') => {
    const isPickup = type === 'pickup';
    const address = isPickup ? order?.pickup_address : order?.delivery_address;
    const latitude = isPickup ? order?.pickup_latitude : order?.delivery_latitude;
    const longitude = isPickup ? order?.pickup_longitude : order?.delivery_longitude;
    const contactName = isPickup ? (order?.pickup_contact_name || 'Pickup Point') : (order?.customer_name || order?.customer?.name || 'Customer');
    const contactPhone = isPickup ? order?.pickup_contact_phone : (order?.customer_phone || order?.customer?.phone);
    const notes = isPickup ? order?.pickup_notes : order?.delivery_notes;
    
    return (
      <Card style={styles.sectionCard}>
        <View style={styles.locationHeader}>
          <View style={[styles.locationBadge, { backgroundColor: isPickup ? '#10B981' : '#3B82F6' }]}>
            <Ionicons name={isPickup ? "arrow-up" : "arrow-down"} size={16} color="white" />
          </View>
          <Text style={styles.sectionTitle}>{isPickup ? 'Pickup' : 'Delivery'} Location</Text>
        </View>
        
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={20} color={Design.colors.text} />
          <Text style={styles.addressText}>{address || 'Address not available'}</Text>
        </View>
        
        {contactName && (
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Contact:</Text>
            <Text style={styles.contactName}>{contactName}</Text>
            {contactPhone && (
              <TouchableOpacity onPress={() => handleCall(contactPhone)}>
                <Text style={styles.contactPhone}>{contactPhone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}
        
        {latitude && longitude && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => {
              const dest = {
                latitude: parseFloat(latitude.toString()),
                longitude: parseFloat(longitude.toString()),
                address: address || ''
              };
              navigationService.navigateToDestination(dest);
            }}
          >
            <Ionicons name="navigate-outline" size={20} color="white" />
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  const renderPackageDetails = () => {
    const hasItems = order?.items && order.items.length > 0;
    const hasPackages = order?.packages && order.packages.length > 0;
    
    if (!hasItems && !hasPackages) {
      return (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          <Text style={styles.emptyText}>No package details available</Text>
        </Card>
      );
    }
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Package Details</Text>
        
        {hasItems && (
          <View>
            <Text style={styles.subsectionTitle}>Items</Text>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name || item.description || 'Item'}</Text>
                  {item.sku && <Text style={styles.itemSku}>SKU: {item.sku}</Text>}
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(item.price || 0)}</Text>
              </View>
            ))}
          </View>
        )}
        
        {hasPackages && (
          <View style={hasItems ? styles.packagesSection : {}}>
            <Text style={styles.subsectionTitle}>Packages</Text>
            {order.packages.map((pkg: any, index: number) => (
              <View key={index} style={styles.packageRow}>
                <Ionicons name="cube-outline" size={20} color={Design.colors.text} />
                <View style={styles.packageDetails}>
                  <Text style={styles.packageType}>{pkg.type || 'Standard Package'}</Text>
                  {pkg.weight && <Text style={styles.packageInfo}>Weight: {pkg.weight} kg</Text>}
                  {pkg.dimensions && <Text style={styles.packageInfo}>Size: {pkg.dimensions}</Text>}
                  {pkg.fragile && (
                    <View style={styles.fragileBadge}>
                      <Ionicons name="warning" size={12} color="#EF4444" />
                      <Text style={styles.fragileText}>Fragile</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  const renderPaymentInfo = () => {
    const paymentMethod = order?.payment_method || 'Not specified';
    const paymentStatus = order?.payment_status || 'pending';
    const subtotal = order?.subtotal || order?.total || 0;
    const deliveryFee = order?.delivery_fee || 0;
    const discount = order?.discount || 0;
    const tax = order?.tax || 0;
    const total = order?.total || (subtotal + deliveryFee + tax - discount);
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Method</Text>
          <Text style={styles.paymentValue}>{paymentMethod}</Text>
        </View>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <View style={[styles.paymentStatusBadge, { backgroundColor: paymentStatus === 'paid' ? '#10B98120' : '#EF444420' }]}>
            <Text style={[styles.paymentStatusText, { color: paymentStatus === 'paid' ? '#10B981' : '#EF4444' }]}>
              {paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Subtotal</Text>
          <Text style={styles.paymentValue}>{formatCurrency(subtotal)}</Text>
        </View>
        
        {deliveryFee > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Delivery Fee</Text>
            <Text style={styles.paymentValue}>{formatCurrency(deliveryFee)}</Text>
          </View>
        )}
        
        {tax > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tax</Text>
            <Text style={styles.paymentValue}>{formatCurrency(tax)}</Text>
          </View>
        )}
        
        {discount > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Discount</Text>
            <Text style={[styles.paymentValue, styles.discountText]}>-{formatCurrency(discount)}</Text>
          </View>
        )}
        
        <View style={styles.divider} />
        
        <View style={styles.paymentRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </Card>
    );
  };

  const renderActionButtons = () => {
    const nextAction = orderActionService.getNextAction(order?.status);
    if (!nextAction) return null;

    return (
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, actionLoading && styles.actionButtonDisabled]}
          onPress={handleNextAction}
          disabled={actionLoading}
        >
          <Ionicons name={nextAction.icon || 'checkmark-circle'} size={24} color="white" />
          <Text style={styles.actionButtonText}>{nextAction.label}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.loadingText}>Loading order details...</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Design.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderOrderHeader()}
          {renderCustomerInfo()}
          {renderLocationCard('pickup')}
          {renderLocationCard('delivery')}
          {renderPackageDetails()}
          {renderPaymentInfo()}
          
          {order?.special_instructions && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <Text style={styles.instructionsText}>{order.special_instructions}</Text>
            </Card>
          )}
          
          {order?.tracking_number && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tracking</Text>
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Tracking Number</Text>
                <Text style={styles.trackingValue}>{order.tracking_number}</Text>
              </View>
            </Card>
          )}
        </ScrollView>
        
        {renderActionButtons()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Design.colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Design.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Design.colors.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Design.colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
  },
  orderHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Design.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Design.colors.text,
  },
  linkText: {
    color: Design.colors.primary,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: Design.colors.text,
    marginLeft: 12,
    lineHeight: 22,
  },
  contactInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  contactLabel: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 15,
    color: Design.colors.text,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 14,
    color: Design.colors.primary,
    marginTop: 4,
  },
  notesContainer: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Design.colors.text,
    lineHeight: 20,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  navigateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Design.colors.textSecondary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemQuantity: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    width: 30,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: Design.colors.text,
  },
  itemSku: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: Design.colors.text,
  },
  packagesSection: {
    marginTop: 20,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageDetails: {
    flex: 1,
    marginLeft: 12,
  },
  packageType: {
    fontSize: 15,
    color: Design.colors.text,
  },
  packageInfo: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  fragileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fragileText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Design.colors.textSecondary,
  },
  paymentValue: {
    fontSize: 15,
    color: Design.colors.text,
    fontWeight: '500',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Design.colors.border,
    marginVertical: 16,
  },
  discountText: {
    color: '#10B981',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Design.colors.text,
  },
  instructionsText: {
    fontSize: 14,
    color: Design.colors.text,
    lineHeight: 20,
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingLabel: {
    fontSize: 14,
    color: Design.colors.textSecondary,
  },
  trackingValue: {
    fontSize: 15,
    color: Design.colors.text,
    fontWeight: '500',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Design.colors.background,
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OrderDetailsScreen;