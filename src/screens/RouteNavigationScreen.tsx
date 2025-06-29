import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { deliveryApi } from '../services/api';
import { colors } from '../constants/colors';

interface AvailableOrder {
  id: string;
  order: {
    order_number: string;
    customer: {
      name: string;
      phone: string;
    };
    delivery_address: string;
    delivery_notes?: string;
    pickup_latitude?: number;
    pickup_longitude?: number;
    delivery_latitude?: number;
    delivery_longitude?: number;
    delivery_type: 'regular' | 'food' | 'fast';
    payment_method: string;
    total: string;
  };
  status: string;
  estimated_delivery_time?: string;
  created_at: string;
}

const RouteNavigationScreen: React.FC = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [decliningOrder, setDecliningOrder] = useState<string | null>(null);

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const response = await deliveryApi.getAvailableOrders();
      setAvailableOrders(response.data);
    } catch (error) {
      console.error('Error fetching available orders:', error);
      Alert.alert('Error', 'Failed to load available orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableOrders();
    }, [fetchAvailableOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAvailableOrders();
  }, [fetchAvailableOrders]);

  const acceptOrder = async (orderId: string) => {
    setAcceptingOrder(orderId);
    try {
      await deliveryApi.smartAcceptDelivery(orderId, {
        location: 'Driver location',
        notes: 'Delivery accepted via smart assignment',
      });
      
      Alert.alert('Success', 'Order accepted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh available orders
            fetchAvailableOrders();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error accepting order:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to accept order';
      Alert.alert('Error', errorMessage);
    } finally {
      setAcceptingOrder(null);
    }
  };

  const declineOrder = async (orderId: string) => {
    setDecliningOrder(orderId);
    try {
      await deliveryApi.declineDelivery(orderId, {
        location: 'Driver location',
        reason: 'Driver declined via app',
      });
      
      // Remove the order from the list
      setAvailableOrders(prev => prev.filter(order => order.id !== orderId));
      
      Alert.alert('Success', 'Order declined successfully');
    } catch (error: any) {
      console.error('Error declining order:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to decline order';
      Alert.alert('Error', errorMessage);
    } finally {
      setDecliningOrder(null);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleNavigate = (latitude?: number, longitude?: number, address?: string) => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(url);
    } else if (address) {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'food':
        return colors.warning;
      case 'fast':
        return colors.danger;
      case 'regular':
      default:
        return colors.primary;
    }
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'food':
        return 'restaurant';
      case 'fast':
        return 'flash';
      case 'regular':
      default:
        return 'cube';
    }
  };

  const calculateDistance = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  };

  const renderOrderCard = ({ item }: { item: AvailableOrder }) => {
    const isAccepting = acceptingOrder === item.id;
    const isDeclining = decliningOrder === item.id;
    const isLoading = isAccepting || isDeclining;

    // Calculate distance if user has location and order has delivery coordinates
    const distance = user?.current_latitude && user?.current_longitude && 
      item.order.delivery_latitude && item.order.delivery_longitude
      ? calculateDistance(
          parseFloat(user.current_latitude),
          parseFloat(user.current_longitude),
          item.order.delivery_latitude,
          item.order.delivery_longitude
        )
      : null;

    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{item.order.order_number}</Text>
            <View style={styles.orderMeta}>
              <View style={[
                styles.typeBadge, 
                { backgroundColor: getDeliveryTypeColor(item.order.delivery_type) }
              ]}>
                <Ionicons 
                  name={getDeliveryTypeIcon(item.order.delivery_type) as any} 
                  size={12} 
                  color={colors.white} 
                />
                <Text style={styles.typeText}>
                  {item.order.delivery_type.toUpperCase()}
                </Text>
              </View>
              {distance && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="location" size={12} color={colors.gray} />
                  <Text style={styles.distanceText}>{distance.toFixed(1)}km</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>${item.order.total}</Text>
            <Text style={styles.paymentMethod}>{item.order.payment_method}</Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <Ionicons name="person" size={16} color={colors.gray} />
            <Text style={styles.customerName}>{item.order.customer.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.order.customer.phone)}
          >
            <Ionicons name="call" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.addressSection}>
          <MaterialIcons name="location-on" size={16} color={colors.gray} />
          <Text style={styles.address}>{item.order.delivery_address}</Text>
        </View>

        {item.order.delivery_notes && (
          <View style={styles.notesSection}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={styles.notes}>{item.order.delivery_notes}</Text>
          </View>
        )}

        <View style={styles.timeSection}>
          <Ionicons name="time" size={16} color={colors.gray} />
          <Text style={styles.timeText}>
            Posted: {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          {item.estimated_delivery_time && (
            <Text style={styles.timeText}>
              ETA: {new Date(item.estimated_delivery_time).toLocaleTimeString()}
            </Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              handleNavigate(
                item.order.delivery_latitude,
                item.order.delivery_longitude,
                item.order.delivery_address
              )
            }
          >
            <MaterialIcons name="navigation" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineButton, isLoading && styles.disabledButton]}
            onPress={() => !isLoading && declineOrder(item.id)}
            disabled={isLoading}
          >
            {isDeclining ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isLoading && styles.disabledButton]}
            onPress={() => !isLoading && acceptOrder(item.id)}
            disabled={isLoading}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading available orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <Text style={styles.headerSubtitle}>
          Smart filtered based on your current deliveries
        </Text>
      </View>

      <FlatList
        data={availableOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color={colors.gray} />
            <Text style={styles.emptyTitle}>No Available Orders</Text>
            <Text style={styles.emptyText}>
              No orders match your current availability criteria. Check back soon or adjust your delivery preferences.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  typeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceText: {
    marginLeft: 2,
    fontSize: 12,
    color: colors.gray,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: colors.gray,
    textTransform: 'uppercase',
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  callButton: {
    backgroundColor: colors.success,
    padding: 8,
    borderRadius: 16,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  address: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.gray,
    flex: 1,
    lineHeight: 20,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 8,
    backgroundColor: colors.lightBlue,
    borderRadius: 6,
  },
  notes: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.info,
    flex: 1,
    lineHeight: 20,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.gray,
    marginRight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigateButton: {
    backgroundColor: colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 6,
  },
  declineButton: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 3,
  },
  acceptButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: colors.gray,
  },
  buttonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
});

export default RouteNavigationScreen;