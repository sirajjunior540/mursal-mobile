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
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import UniversalMapView from './UniversalMapView';
import { mapProviderService } from '../services/mapProviderService';
import { Order, isBatchOrder, getBatchProperties } from '../types';

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
  const [selectedBatchOrder, setSelectedBatchOrder] = useState<Order | null>(null);
  const [showBatchOrdersList, setShowBatchOrdersList] = useState(true);
  
  // Check if this is a batch order
  const batchOrder = order && isBatchOrder(order);
  const batchProperties = order ? getBatchProperties(order) : null;
  const hasMultipleOrders = (batchProperties?.orders?.length || 0) > 1;
  
  // Determine batch type
  const isDistributionBatch = React.useMemo(() => {
    if (!batchOrder || !batchProperties?.orders) return false;
    const uniqueDeliveryAddresses = new Set(
      batchProperties.orders.map(o => o.delivery_address).filter(Boolean)
    );
    return uniqueDeliveryAddresses.size > 1;
  }, [batchOrder, batchProperties]);

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

  const renderBatchOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.batchOrderItem}
      onPress={() => {
        setSelectedBatchOrder(item);
        setShowBatchOrdersList(false);
      }}
    >
      <View style={styles.batchOrderItemHeader}>
        <Text style={styles.batchOrderNumber}>#{item.order_number}</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
      <Text style={styles.batchOrderCustomer}>
        {item.customer_details?.name || 'Customer'}
      </Text>
      <Text style={styles.batchOrderAddress} numberOfLines={1}>
        {item.delivery_address}
      </Text>
      <View style={styles.batchOrderMetrics}>
        <Text style={styles.batchOrderTotal}>${item.total || '0.00'}</Text>
        {item.delivery_type && (
          <View style={[styles.batchOrderTypeBadge, 
            item.delivery_type === 'food' && styles.foodBadge,
            item.delivery_type === 'fast' && styles.fastBadge
          ]}>
            <Text style={styles.batchOrderTypeText}>
              {item.delivery_type.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!order) return null;

  // Use selected batch order if viewing individual order in batch
  const displayOrder = selectedBatchOrder || order;
  
  const pickupLat = safeCoordinate(displayOrder.pickup_latitude);
  const pickupLng = safeCoordinate(displayOrder.pickup_longitude);
  const deliveryLat = safeCoordinate(displayOrder.delivery_latitude);
  const deliveryLng = safeCoordinate(displayOrder.delivery_longitude);

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
          <TouchableOpacity onPress={() => {
            if (selectedBatchOrder && hasMultipleOrders) {
              setSelectedBatchOrder(null);
              setShowBatchOrdersList(true);
            } else {
              onClose();
            }
          }} style={styles.closeButton}>
            <Ionicons name={selectedBatchOrder && hasMultipleOrders ? "arrow-back" : "close"} size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedBatchOrder ? `Order #${selectedBatchOrder.order_number}` : title}
          </Text>
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

        {/* Content based on batch or single order */}
        {hasMultipleOrders && showBatchOrdersList && !selectedBatchOrder ? (
          <View style={styles.batchOrdersContainer}>
            {/* Batch Summary */}
            <View style={styles.batchSummary}>
              <View style={styles.batchHeader}>
                <Text style={styles.batchTitle}>Batch #{batchProperties?.batchNumber || order.id}</Text>
                <View style={[styles.batchTypeBadge, isDistributionBatch ? styles.distributionBadge : styles.consolidatedBadge]}>
                  <Ionicons name={isDistributionBatch ? "git-branch" : "layers"} size={14} color="#fff" />
                  <Text style={styles.batchTypeText}>
                    {isDistributionBatch ? 'DISTRIBUTION' : 'CONSOLIDATED'}
                  </Text>
                </View>
              </View>
              <View style={styles.batchStats}>
                <View style={styles.batchStat}>
                  <Text style={styles.batchStatValue}>{batchProperties?.orders?.length || 0}</Text>
                  <Text style={styles.batchStatLabel}>Orders</Text>
                </View>
                <View style={styles.batchStat}>
                  <Text style={styles.batchStatValue}>
                    ${batchProperties?.orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.batchStatLabel}>Total Value</Text>
                </View>
                {isDistributionBatch && (
                  <View style={styles.batchStat}>
                    <Text style={styles.batchStatValue}>
                      {new Set(batchProperties?.orders?.map(o => o.delivery_address)).size}
                    </Text>
                    <Text style={styles.batchStatLabel}>Destinations</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Orders List */}
            <Text style={styles.ordersListTitle}>Orders in this batch:</Text>
            <FlatList
              data={batchProperties?.orders || []}
              renderItem={renderBatchOrderItem}
              keyExtractor={(item) => item.id}
              style={styles.batchOrdersList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
            {/* Order Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              <Text style={styles.orderNumber}>#{displayOrder.order_number}</Text>
              <Text style={styles.orderStatus}>{displayOrder.status}</Text>
              
              {/* Special Handling Indicators */}
              {(displayOrder.special_handling && displayOrder.special_handling !== 'none' || 
                displayOrder.cash_on_delivery || 
                displayOrder.requires_signature || 
                displayOrder.requires_id_verification) && (
                <View style={styles.specialHandlingContainer}>
                  {displayOrder.special_handling && displayOrder.special_handling !== 'none' && (
                    <View style={[
                      styles.specialHandlingBadge,
                      displayOrder.special_handling === 'fragile' && styles.fragileBadge,
                      displayOrder.special_handling === 'temperature_controlled' && styles.temperatureBadge,
                      displayOrder.special_handling === 'hazardous' && styles.hazardousBadge,
                    ]}>
                      <Ionicons 
                        name={
                          displayOrder.special_handling === 'fragile' ? 'warning' :
                          displayOrder.special_handling === 'temperature_controlled' ? 'thermometer' :
                          displayOrder.special_handling === 'liquid' ? 'water' :
                          displayOrder.special_handling === 'hazardous' ? 'nuclear' :
                          displayOrder.special_handling === 'perishable' ? 'time' : 'alert-circle'
                        } 
                        size={14} 
                        color="#fff" 
                      />
                      <Text style={styles.specialHandlingText}>
                        {displayOrder.special_handling.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {displayOrder.cash_on_delivery && (
                    <View style={[styles.specialHandlingBadge, styles.codBadge]}>
                      <Ionicons name="cash" size={14} color="#fff" />
                      <Text style={styles.specialHandlingText}>
                        COD ${displayOrder.cod_amount?.toFixed(2) || displayOrder.total?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                  )}
                  {displayOrder.requires_signature && (
                    <View style={[styles.specialHandlingBadge, styles.signatureBadge]}>
                      <Ionicons name="create" size={14} color="#fff" />
                      <Text style={styles.specialHandlingText}>SIGNATURE</Text>
                    </View>
                  )}
                  {displayOrder.requires_id_verification && (
                    <View style={[styles.specialHandlingBadge, styles.idBadge]}>
                      <Ionicons name="card" size={14} color="#fff" />
                      <Text style={styles.specialHandlingText}>ID CHECK</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

          {/* Pickup Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={20} color="green" />
              </View>
              <Text style={styles.sectionTitle}>Pickup</Text>
            </View>
            <Text style={styles.address}>{displayOrder.pickup_address}</Text>
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
            <Text style={styles.address}>{displayOrder.delivery_address}</Text>
            {displayOrder.delivery_notes && (
              <Text style={styles.notes}>Note: {displayOrder.delivery_notes}</Text>
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
            <Text style={styles.customerName}>{displayOrder.customer?.name || displayOrder.customer_details?.name || 'N/A'}</Text>
            {(displayOrder.customer?.phone || displayOrder.customer_details?.phone) && !readonly && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCall(displayOrder.customer?.phone || displayOrder.customer_details?.phone || '')}
              >
                <Ionicons name="call" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>{displayOrder.customer?.phone || displayOrder.customer_details?.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status Update Button */}
          {showStatusButton && !readonly && onStatusUpdate && (
            <TouchableOpacity
              style={[styles.statusButton, loading && styles.disabledButton]}
              onPress={() => !loading && onStatusUpdate(displayOrder.id, getNextStatus(displayOrder.status || 'pending'))}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.statusButtonText}>
                    {displayOrder.status === 'pending' || displayOrder.status === 'assigned' ? 'Accept Order' : `Mark as ${getNextStatus(displayOrder.status || 'pending')}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          </ScrollView>
        )}
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
  batchOrdersContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  batchSummary: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  batchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  batchTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  distributionBadge: {
    backgroundColor: '#FF6B6B',
  },
  consolidatedBadge: {
    backgroundColor: '#4ECDC4',
  },
  batchTypeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  batchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  batchStat: {
    alignItems: 'center',
  },
  batchStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  batchStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ordersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 20,
    paddingBottom: 10,
  },
  batchOrdersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  batchOrderItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  batchOrderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  batchOrderCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  batchOrderAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  batchOrderMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchOrderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  batchOrderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  batchOrderTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  // Special handling styles
  specialHandlingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  specialHandlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    backgroundColor: '#FFA726',
  },
  specialHandlingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  fragileBadge: {
    backgroundColor: '#FF6B6B',
  },
  temperatureBadge: {
    backgroundColor: '#4ECDC4',
  },
  hazardousBadge: {
    backgroundColor: '#FF4757',
  },
  codBadge: {
    backgroundColor: '#00D2D3',
  },
  signatureBadge: {
    backgroundColor: '#8B78E6',
  },
  idBadge: {
    backgroundColor: '#5F3DC4',
  },
});

export default OrderDetailsModal;