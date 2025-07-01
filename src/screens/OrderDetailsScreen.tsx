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
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Haptics from 'react-native-haptic-feedback';

// Design System
import { Design, getStatusColor } from '../constants/designSystem';

// Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// Services
import { useOrders } from '../contexts/OrderContext';
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
      setOrder(details);
      
      if (autoNavigate && details) {
        handleNavigate();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Haptics.trigger('impactLight');
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = () => {
    if (!order) return;
    
    Haptics.trigger('impactMedium');
    // Get destination based on current status
    const destination = order?.status === 'en_route_to_pickup' 
      ? { latitude: order?.pickup?.latitude, longitude: order?.pickup?.longitude, address: order?.pickup?.address }
      : { latitude: order?.delivery?.latitude, longitude: order?.delivery?.longitude, address: order?.delivery?.address };
    if (destination?.latitude && destination?.longitude) {
      navigationService.navigateToDestination({
        latitude: destination.latitude,
        longitude: destination.longitude,
        address: destination.address
      });
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
    <BlurView
      style={styles.header}
      blurType="light"
      blurAmount={40}
      reducedTransparencyFallbackColor={Design.colors.systemBackground}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color={Design.colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Order Details</Text>
          
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
    </BlurView>
  );

  const renderMap = () => {
    // Safely get coordinates from order data
    let latitude, longitude, title;
    
    if (order?.status === 'en_route_to_pickup') {
      latitude = order?.pickup_latitude || order?.pickup?.latitude;
      longitude = order?.pickup_longitude || order?.pickup?.longitude;
      title = 'Pickup Location';
    } else {
      latitude = order?.delivery_latitude || order?.delivery?.latitude;
      longitude = order?.delivery_longitude || order?.delivery?.longitude;
      title = 'Delivery Location';
    }

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.log('⚠️ Invalid coordinates for map:', { latitude, longitude });
      return (
        <Card style={styles.mapPlaceholder}>
          <View style={styles.mapPlaceholderContent}>
            <Ionicons name="map-outline" size={48} color={Design.colors.secondaryLabel} />
            <Text style={styles.mapPlaceholderText}>Location not available</Text>
          </View>
        </Card>
      );
    }

    try {
      return (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(latitude.toString()),
              longitude: parseFloat(longitude.toString()),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onError={(error) => {
              console.error('MapView error:', error);
            }}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(latitude.toString()),
                longitude: parseFloat(longitude.toString()),
              }}
              title={title}
            />
          </MapView>
          
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigate}
          >
            <Ionicons name="navigate" size={20} color={Design.colors.white} />
          </TouchableOpacity>
        </View>
      );
    } catch (error) {
      console.error('Error rendering map:', error);
      return (
        <Card style={styles.mapPlaceholder}>
          <View style={styles.mapPlaceholderContent}>
            <Ionicons name="warning-outline" size={48} color={Design.colors.error} />
            <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
          </View>
        </Card>
      );
    }
  };

  const renderOrderInfo = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Card style={styles.infoCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{order?.order_number}</Text>
            <Text style={styles.orderTime}>
              {order?.created_at && new Date(order.created_at).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order?.status) }]}>
              {order?.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderContactCard = (title: string, name: string, phone: string, address: string) => (
    <Card style={styles.contactCard}>
      <Text style={styles.contactTitle}>{title}</Text>
      
      <View style={styles.contactRow}>
        <View style={styles.contactAvatar}>
          <Ionicons name="person" size={20} color={Design.colors.secondaryLabel} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactPhone}>{phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCall(phone)}
        >
          <Ionicons name="call" size={20} color={Design.colors.white} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.addressRow}>
        <Ionicons name="location" size={16} color={Design.colors.secondaryLabel} />
        <Text style={styles.addressText}>{address}</Text>
      </View>
    </Card>
  );

  const renderOrderItems = () => (
    <Card style={styles.itemsCard}>
      <Text style={styles.sectionTitle}>Order Items</Text>
      {order?.items?.map((item: any, index: number) => (
        <View key={index} style={styles.itemRow}>
          <Text style={styles.itemQuantity}>{item.quantity}x</Text>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>${item.price}</Text>
        </View>
      ))}
      
      <View style={styles.divider} />
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${order?.total || 0}</Text>
      </View>
    </Card>
  );

  const renderActionButton = () => {
    const nextAction = orderActionService.getNextAction(order?.status);
    if (!nextAction) return null;

    return (
      <View style={styles.actionContainer}>
        <Button
          title={nextAction.label}
          variant="primary"
          size="large"
          fullWidth
          loading={actionLoading}
          onPress={handleNextAction}
        />
        {(nextAction.status === 'en_route_to_pickup' || nextAction.status === 'en_route_to_delivery') && (
          <TouchableOpacity style={styles.navigationHint} onPress={handleNavigate}>
            <Ionicons name="navigate-outline" size={16} color={Design.colors.primary} />
            <Text style={styles.navigationHintText}>Navigate to destination</Text>
          </TouchableOpacity>
        )}
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
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderMap()}
        {renderOrderInfo()}
        
        {order?.pickup_address && renderContactCard(
          'Pickup',
          order.pickup_contact_name || 'Restaurant',
          order.pickup_contact_phone || order.restaurant?.phone || '',
          order.pickup_address
        )}
        
        {renderContactCard(
          'Delivery',
          order?.customer?.name || 'Customer',
          order?.customer?.phone || '',
          order?.delivery_address || ''
        )}
        
        {renderOrderItems()}
        
        {order?.delivery_notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.notesTitle}>Delivery Instructions</Text>
            <Text style={styles.notesText}>{order.delivery_notes}</Text>
          </Card>
        )}
      </ScrollView>
      
      {renderActionButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.systemGroupedBackground,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Design.colors.systemGroupedBackground,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Design.typography.body,
    color: Design.colors.secondaryLabel,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Design.colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Design.spacing.m,
    paddingVertical: Design.spacing.s,
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...Design.typography.headline,
    color: Design.colors.label,
    fontWeight: '600',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 88 : 68,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
    borderRadius: Design.borderRadius.large,
    overflow: 'hidden',
    ...Design.shadows.medium,
  },
  map: {
    flex: 1,
  },
  navigateButton: {
    position: 'absolute',
    bottom: Design.spacing.m,
    right: Design.spacing.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Design.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Design.shadows.medium,
  },
  infoCard: {
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    ...Design.typography.headline,
    color: Design.colors.label,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderTime: {
    ...Design.typography.footnote,
    color: Design.colors.secondaryLabel,
  },
  statusBadge: {
    paddingHorizontal: Design.spacing.s,
    paddingVertical: 4,
    borderRadius: Design.borderRadius.small,
  },
  statusText: {
    ...Design.typography.caption1,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  contactCard: {
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
  },
  contactTitle: {
    ...Design.typography.footnote,
    color: Design.colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Design.spacing.s,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing.s,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Design.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing.s,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...Design.typography.body,
    color: Design.colors.label,
    fontWeight: '600',
  },
  contactPhone: {
    ...Design.typography.footnote,
    color: Design.colors.secondaryLabel,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Design.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Design.spacing.s,
    paddingLeft: 48,
  },
  addressText: {
    ...Design.typography.footnote,
    color: Design.colors.label,
    flex: 1,
  },
  itemsCard: {
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
  },
  sectionTitle: {
    ...Design.typography.headline,
    color: Design.colors.label,
    fontWeight: '600',
    marginBottom: Design.spacing.m,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing.s,
  },
  itemQuantity: {
    ...Design.typography.body,
    color: Design.colors.secondaryLabel,
    width: 30,
  },
  itemName: {
    ...Design.typography.body,
    color: Design.colors.label,
    flex: 1,
  },
  itemPrice: {
    ...Design.typography.body,
    color: Design.colors.label,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Design.colors.separator,
    marginVertical: Design.spacing.m,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...Design.typography.headline,
    color: Design.colors.label,
    fontWeight: '600',
  },
  totalValue: {
    ...Design.typography.title3,
    color: Design.colors.label,
    fontWeight: '700',
  },
  notesCard: {
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
  },
  notesTitle: {
    ...Design.typography.footnote,
    color: Design.colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Design.spacing.s,
  },
  notesText: {
    ...Design.typography.body,
    color: Design.colors.label,
    lineHeight: 22,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Design.spacing.m,
    paddingBottom: Design.spacing.m + Design.safeAreas.bottom,
    backgroundColor: Design.colors.systemBackground + 'F0',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Design.colors.separator,
    ...Platform.select({
      ios: {
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  navigationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Design.spacing.s,
    gap: 4,
  },
  navigationHintText: {
    ...Design.typography.footnote,
    color: Design.colors.primary,
  },
  mapPlaceholder: {
    marginHorizontal: Design.spacing.m,
    marginBottom: Design.spacing.m,
    minHeight: 200,
  },
  mapPlaceholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  mapPlaceholderText: {
    ...Design.typography.body,
    color: Design.colors.secondaryLabel,
    marginTop: Design.spacing.s,
  },
});

export default OrderDetailsScreen;