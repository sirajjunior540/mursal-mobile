import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { apiService } from '../services/api';
import { Order } from '../types';
import { useOrders } from '../features/orders/context/OrderProvider';
import { Design } from '../constants/designSystem';
import EmptyState from '../components/EmptyState';
import LinearGradient from 'react-native-linear-gradient';

const AvailableOrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { acceptOrder } = useOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailableOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      console.log('[AvailableOrders] Fetching available orders...');
      const response = await apiService.getAvailableOrders();
      console.log('[AvailableOrders] Response:', response);
      
      if (response.success && response.data) {
        console.log('[AvailableOrders] Received', response.data.length, 'available orders');
        setOrders(response.data);
      } else {
        console.error('[AvailableOrders] Failed to fetch orders:', response.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('[AvailableOrders] Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load available orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableOrders();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAvailableOrders(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchAvailableOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const success = await acceptOrder(orderId);
      
      if (success) {
        Alert.alert(
          'Success!',
          'Order accepted successfully',
          [
            {
              text: 'View My Orders',
              onPress: () => navigation.navigate('AcceptedOrders' as never)
            }
          ]
        );
        
        // Remove accepted order from list
        setOrders(prev => prev.filter(order => order.id !== orderId));
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    const distance = order.distance || 0;
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails' as never, { orderId: order.id } as never)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.orderCardGradient}
        >
          {/* Header */}
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
              <Text style={styles.orderTime}>
                {distance > 0 ? `${distance.toFixed(1)} km away` : 'Distance unknown'}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>${order.total?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>

          {/* Locations */}
          <View style={styles.locationsContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={16} color="#10B981" />
              </View>
              <Text style={styles.locationText} numberOfLines={1}>
                {order.pickup_address || 'Pickup location'}
              </Text>
            </View>
            
            <View style={styles.locationDivider} />
            
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.locationText} numberOfLines={1}>
                {order.delivery_address || 'Delivery location'}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(order.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
            <Ionicons name="checkmark-circle" size={20} color="white" />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="cart-outline"
      title="No Available Orders"
      description="New orders will appear here when they become available"
      onRefresh={fetchAvailableOrders}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Design.colors.primary} />
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
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} available
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAvailableOrders();
            }}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  orderCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderCardGradient: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orderTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  locationsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: '#D1D5DB',
    marginLeft: 12,
    marginVertical: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default AvailableOrdersScreen;