import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import UniversalMapView from './UniversalMapView';
import { mapProviderService } from '../services/mapProviderService';
import { Order } from '../types';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
  onNavigate?: (latitude: number, longitude: number) => void;
  showStatusButton?: boolean;
  title?: string;
  readonly?: boolean;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  order,
  onClose,
  onStatusUpdate,
  onNavigate,
  showStatusButton = true,
  title = 'Order Details',
  readonly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<{
    coordinates: {latitude: number, longitude: number}[];
    distance: number;
    duration: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(true);

  const safeCoordinate = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return !isNaN(num) ? num : null;
  };

  const checkMapAvailability = useCallback(async () => {
    const shouldShow = await mapProviderService.shouldShowMap();
    setShowMap(shouldShow);
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!order) return;
    
    const pickupLat = safeCoordinate(order?.pickup_latitude);
    const pickupLng = safeCoordinate(order?.pickup_longitude);
    const deliveryLat = safeCoordinate(order?.delivery_latitude);
    const deliveryLng = safeCoordinate(order?.delivery_longitude);

    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
      return;
    }

    setLoading(true);
    try {
      const route = await mapProviderService.getRoute(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: deliveryLat, longitude: deliveryLng }
      );

      if (route) {
        setRouteData({
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration,
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setLoading(false);
    }
  }, [order]);

  useEffect(() => {
    if (visible && order) {
      checkMapAvailability().catch(console.error);
      fetchRoute().catch(console.error);
    }
  }, [visible, order, checkMapAvailability, fetchRoute]);

  const handleCall = (phone: string) => {
    if (!readonly && phone) {
      Linking.openURL(`tel:${phone}`).catch(console.error);
    }
  };

  const handleNavigate = (lat: number, lng: number) => {
    if (!readonly) {
      if (onNavigate) {
        onNavigate(lat, lng);
      } else {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Linking.openURL(url).catch(console.error);
      }
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (!order) return null;

  const pickupLat = safeCoordinate(order.pickup_latitude);
  const pickupLng = safeCoordinate(order.pickup_longitude);
  const deliveryLat = safeCoordinate(order.delivery_latitude);
  const deliveryLng = safeCoordinate(order.delivery_longitude);

  const hasValidCoordinates = pickupLat && pickupLng && deliveryLat && deliveryLng;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Map Section - Only show if map provider is configured */}
        {showMap && hasValidCoordinates && (
          <View style={styles.mapContainer}>
            <UniversalMapView
              style={styles.map}
              initialRegion={{
                latitude: (pickupLat + deliveryLat) / 2,
                longitude: (pickupLng + deliveryLng) / 2,
                latitudeDelta: Math.abs(pickupLat - deliveryLat) * 2.5 || 0.05,
                longitudeDelta: Math.abs(pickupLng - deliveryLng) * 2.5 || 0.05,
              }}
              markers={[
                {
                  id: 'pickup',
                  coordinate: { latitude: pickupLat, longitude: pickupLng },
                  title: 'Pickup',
                  description: order.pickup_address,
                  pinColor: 'green',
                },
                {
                  id: 'delivery',
                  coordinate: { latitude: deliveryLat, longitude: deliveryLng },
                  title: 'Delivery',
                  description: order.delivery_address,
                  pinColor: 'red',
                },
              ]}
              route={routeData ? {
                coordinates: routeData.coordinates,
                strokeColor: '#1E90FF',
                strokeWidth: 4,
              } : undefined}
              fallbackMessage="Map view is not available. Please use the navigation buttons below."
            />

            {/* Map Legend */}
            {routeData && (
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotGreen]} />
                  <Text style={styles.legendText}>Pickup</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotRed]} />
                  <Text style={styles.legendText}>Delivery</Text>
                </View>
                {routeData && (
                  <>
                    <View style={styles.legendItem}>
                      <Ionicons name="car" size={16} color="#666" />
                      <Text style={styles.legendText}>
                        {formatDistance(routeData.distance)}
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.legendText}>
                        {formatDuration(routeData.duration)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Order Details */}
        <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
          {/* Order Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
            <Text style={styles.orderStatus}>{order.status}</Text>
          </View>

          {/* Pickup Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={20} color="green" />
              </View>
              <Text style={styles.sectionTitle}>Pickup</Text>
            </View>
            <Text style={styles.address}>{order.pickup_address}</Text>
            {hasValidCoordinates && !readonly && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleNavigate(pickupLat!, pickupLng!)}
              >
                <Ionicons name="navigate" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Navigate</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Delivery Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={20} color="red" />
              </View>
              <Text style={styles.sectionTitle}>Delivery</Text>
            </View>
            <Text style={styles.address}>{order.delivery_address}</Text>
            {order.delivery_notes && (
              <Text style={styles.notes}>Note: {order.delivery_notes}</Text>
            )}
            {hasValidCoordinates && !readonly && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleNavigate(deliveryLat!, deliveryLng!)}
              >
                <Ionicons name="navigate" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Navigate</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.customerName}>{order.customer?.name || order.customer_details?.name || 'N/A'}</Text>
            {(order.customer?.phone || order.customer_details?.phone) && !readonly && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCall(order.customer?.phone || order.customer_details?.phone || '')}
              >
                <Ionicons name="call" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>{order.customer?.phone || order.customer_details?.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status Update Button */}
          {showStatusButton && !readonly && onStatusUpdate && (
            <TouchableOpacity
              style={[styles.statusButton, loading && styles.disabledButton]}
              onPress={() => !loading && onStatusUpdate(order.id, getNextStatus(order.status || 'pending'))}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.statusButtonText}>
                    Mark as {getNextStatus(order.status || 'pending')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const getNextStatus = (currentStatus: string): string => {
  const statusFlow: { [key: string]: string } = {
    pending: 'picked_up',
    assigned: 'picked_up',
    picked_up: 'delivered',
    delivered: 'delivered',
  };
  return statusFlow[currentStatus.toLowerCase()] || 'delivered';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  mapContainer: {
    height: 250,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotGreen: {
    backgroundColor: 'green',
  },
  legendDotRed: {
    backgroundColor: 'red',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  address: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  statusButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetailsModal;