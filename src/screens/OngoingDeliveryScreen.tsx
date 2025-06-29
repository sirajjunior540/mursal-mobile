import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { deliveryApi } from '../services/api';
import { colors } from '../constants/colors';

interface DeliveryItem {
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
  };
  status: 'accepted' | 'picked_up' | 'in_transit' | 'delivered';
  pickup_time?: string;
  delivery_time?: string;
  estimated_delivery_time?: string;
}

interface RouteStop {
  sequence_order: number;
  delivery_id: string;
  order_number: string;
  estimated_arrival_time?: string;
  pickup_required: boolean;
  pickup_address?: string;
  delivery_address: string;
  customer_name: string;
}

interface OngoingDeliveriesResponse {
  deliveries: DeliveryItem[];
  route: RouteStop[] | null;
  total_distance_km: number;
  estimated_completion_time?: string;
}

const OngoingDeliveryScreen: React.FC = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchOngoingDeliveries = useCallback(async () => {
    try {
      const response = await deliveryApi.getOngoingDeliveries();
      const data: OngoingDeliveriesResponse = response.data;
      
      setDeliveries(data.deliveries);
      setRoute(data.route);
      setTotalDistance(data.total_distance_km);
      setEstimatedCompletion(data.estimated_completion_time);
    } catch (error) {
      console.error('Error fetching ongoing deliveries:', error);
      Alert.alert('Error', 'Failed to load ongoing deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOngoingDeliveries();
    }, [fetchOngoingDeliveries])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOngoingDeliveries();
  }, [fetchOngoingDeliveries]);

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    setUpdatingStatus(deliveryId);
    try {
      await deliveryApi.smartUpdateStatus(deliveryId, {
        status: newStatus,
        location: `Status updated to ${newStatus}`,
        notes: `Driver updated status to ${newStatus}`,
      });
      
      // Refresh the data to get updated route
      await fetchOngoingDeliveries();
      
      Alert.alert('Success', `Delivery status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    } finally {
      setUpdatingStatus(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return colors.warning;
      case 'picked_up':
        return colors.info;
      case 'in_transit':
        return colors.primary;
      case 'delivered':
        return colors.success;
      default:
        return colors.gray;
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'accepted':
        return { action: 'picked_up', label: 'Mark Picked Up' };
      case 'picked_up':
        return { action: 'in_transit', label: 'Start Delivery' };
      case 'in_transit':
        return { action: 'delivered', label: 'Mark Delivered' };
      default:
        return null;
    }
  };

  const renderDeliveryCard = (delivery: DeliveryItem) => {
    const nextAction = getNextAction(delivery.status);
    const isUpdating = updatingStatus === delivery.id;

    return (
      <View key={delivery.id} style={styles.deliveryCard}>
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{delivery.order.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) }]}>
              <Text style={styles.statusText}>
                {delivery.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.deliveryTypeBadge}>
            <Text style={styles.deliveryTypeText}>
              {delivery.order.delivery_type.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.customerDetails}>
            <Ionicons name="person" size={16} color={colors.gray} />
            <Text style={styles.customerName}>{delivery.order.customer.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(delivery.order.customer.phone)}
          >
            <Ionicons name="call" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.addressInfo}>
          <MaterialIcons name="location-on" size={16} color={colors.gray} />
          <Text style={styles.address}>{delivery.order.delivery_address}</Text>
        </View>

        {delivery.order.delivery_notes && (
          <View style={styles.notesInfo}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={styles.notes}>{delivery.order.delivery_notes}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              handleNavigate(
                delivery.order.delivery_latitude,
                delivery.order.delivery_longitude,
                delivery.order.delivery_address
              )
            }
          >
            <MaterialIcons name="navigation" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Navigate</Text>
          </TouchableOpacity>

          {nextAction && (
            <TouchableOpacity
              style={[styles.actionButton, isUpdating && styles.disabledButton]}
              onPress={() => !isUpdating && updateDeliveryStatus(delivery.id, nextAction.action)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={styles.buttonText}>{nextAction.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderRouteStep = (step: RouteStop, index: number) => {
    const isLast = index === route!.length - 1;
    
    return (
      <View key={`${step.delivery_id}-${step.sequence_order}`} style={styles.routeStep}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepCircle, isLast && styles.lastStep]}>
            <Text style={styles.stepNumber}>{step.sequence_order}</Text>
          </View>
          {!isLast && <View style={styles.stepLine} />}
        </View>
        
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>
            {step.pickup_required ? 'Pickup' : 'Delivery'}: #{step.order_number}
          </Text>
          <Text style={styles.stepAddress}>
            {step.pickup_required ? step.pickup_address : step.delivery_address}
          </Text>
          <Text style={styles.stepCustomer}>{step.customer_name}</Text>
          {step.estimated_arrival_time && (
            <Text style={styles.stepTime}>
              ETA: {new Date(step.estimated_arrival_time).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading ongoing deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ongoing Deliveries</Text>
        {deliveries.length > 0 && (
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryText}>
              {deliveries.length} active • {totalDistance.toFixed(1)}km
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {deliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car" size={64} color={colors.gray} />
            <Text style={styles.emptyTitle}>No Ongoing Deliveries</Text>
            <Text style={styles.emptyText}>
              You don't have any active deliveries at the moment.
            </Text>
          </View>
        ) : (
          <>
            {/* Route Overview */}
            {route && route.length > 0 && (
              <View style={styles.routeContainer}>
                <Text style={styles.sectionTitle}>Optimized Route</Text>
                {route.map((step, index) => renderRouteStep(step, index))}
                {estimatedCompletion && (
                  <View style={styles.completionInfo}>
                    <Ionicons name="time" size={16} color={colors.info} />
                    <Text style={styles.completionText}>
                      Estimated completion: {new Date(estimatedCompletion).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Delivery Cards */}
            <View style={styles.deliveriesContainer}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              {deliveries.map(renderDeliveryCard)}
            </View>
          </>
        )}
      </ScrollView>
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
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: colors.gray,
  },
  scrollView: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  routeContainer: {
    padding: 20,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  routeStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastStep: {
    backgroundColor: colors.success,
  },
  stepNumber: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 2,
    height: 32,
    backgroundColor: colors.lightGray,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepAddress: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 2,
  },
  stepCustomer: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  stepTime: {
    fontSize: 12,
    color: colors.info,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
  },
  completionText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.info,
    fontWeight: '500',
  },
  deliveriesContainer: {
    padding: 20,
  },
  deliveryCard: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  deliveryTypeBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerDetails: {
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
    borderRadius: 20,
  },
  addressInfo: {
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
  notesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  navigateButton: {
    backgroundColor: colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray,
  },
  buttonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default OngoingDeliveryScreen;