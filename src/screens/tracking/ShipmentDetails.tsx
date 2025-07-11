import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HapticFeedback from 'react-native-haptic-feedback';

import { designSystem } from '../../constants/designSystem';
import { useTracking } from '../../contexts/TrackingContext';
import { CarrierShipment, TrackingEvent, ShipmentStatus } from '../../types/tracking';

interface ShipmentDetailsProps {
  navigation: any;
  route: {
    params: {
      shipmentId: string;
    };
  };
}

const ShipmentDetails: React.FC<ShipmentDetailsProps> = ({ navigation, route }) => {
  const { shipmentId } = route.params;
  const {
    getShipmentDetails,
    getTrackingEvents,
    updateShipmentStatus,
    isOnline,
  } = useTracking();

  const [shipment, setShipment] = useState<CarrierShipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShipmentData();
  }, [shipmentId]);

  const loadShipmentData = async () => {
    try {
      setLoading(true);
      const [shipmentData, eventsData] = await Promise.all([
        getShipmentDetails(shipmentId),
        getTrackingEvents(shipmentId),
      ]);
      
      setShipment(shipmentData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load shipment data:', error);
      Alert.alert('Error', 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadShipmentData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = (newStatus: ShipmentStatus) => {
    if (!shipment) return;

    const nextStatuses: Record<ShipmentStatus, ShipmentStatus> = {
      created: 'collected',
      booked: 'collected',
      collected: 'in_transit',
      in_transit: 'out_for_delivery',
      customs_clearance: 'out_for_delivery',
      out_for_delivery: 'delivered',
      delivered: 'delivered',
      exception: 'in_transit',
    };

    const nextStatus = nextStatuses[shipment.current_status];
    
    if (nextStatus && nextStatus !== shipment.current_status) {
      Alert.alert(
        'Update Status',
        `Update shipment status to "${getStatusLabel(nextStatus)}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: async () => {
              try {
                HapticFeedback.trigger('impactMedium');
                await updateShipmentStatus(shipmentId, nextStatus);
                await loadShipmentData(); // Refresh data
              } catch (error) {
                HapticFeedback.trigger('notificationError');
              }
            },
          },
        ]
      );
    }
  };

  const getStatusLabel = (status: ShipmentStatus): string => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status: ShipmentStatus): string => {
    switch (status) {
      case 'delivered':
        return designSystem.colors.success;
      case 'in_transit':
        return designSystem.colors.primary;
      case 'out_for_delivery':
        return designSystem.colors.warning;
      case 'exception':
        return designSystem.colors.error;
      default:
        return designSystem.colors.textSecondary;
    }
  };

  const getCarrierIcon = () => {
    if (!shipment) return 'local-shipping';
    
    const { carrier_type, carrier_code } = shipment.carrier;

    if (carrier_type === 'ocean_freight') {
      return 'directions-boat';
    }

    switch (carrier_code.toUpperCase()) {
      case 'DHL':
      case 'FEDEX':
      case 'UPS':
      case 'ARAMEX':
        return 'flight-takeoff';
      default:
        return 'local-shipping';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProgressPercentage = (): number => {
    if (!shipment) return 0;
    
    switch (shipment.current_status) {
      case 'created': return 10;
      case 'booked': return 25;
      case 'collected': return 40;
      case 'in_transit': return 60;
      case 'customs_clearance': return 75;
      case 'out_for_delivery': return 90;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={designSystem.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipment Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading shipment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shipment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={designSystem.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipment Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.centerContent}>
          <Icon name="error" size={64} color={designSystem.colors.error} />
          <Text style={styles.errorTitle}>Shipment Not Found</Text>
          <Text style={styles.errorSubtitle}>
            The requested shipment could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = getProgressPercentage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={designSystem.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Details</Text>
        
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Icon name="cloud-off" size={16} color={designSystem.colors.error} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[designSystem.colors.primary]}
            tintColor={designSystem.colors.primary}
          />
        }
      >
        {/* Shipment Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.carrierInfo}>
              <View style={[styles.iconContainer, { backgroundColor: designSystem.colors.primary }]}>
                <Icon 
                  name={getCarrierIcon()} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              <View style={styles.carrierText}>
                <Text style={styles.carrierName}>
                  {shipment.carrier.carrier_name}
                </Text>
                <Text style={styles.trackingNumber}>
                  {shipment.tracking_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.current_status) }]}>
              <Text style={styles.statusText}>
                {getStatusLabel(shipment.current_status)}
              </Text>
            </View>
            <Text style={styles.progressText}>
              {progressPercentage}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: getStatusColor(shipment.current_status),
                  },
                ]}
              />
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsContainer}>
            {shipment.order?.customer && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>
                  {shipment.order.customer.first_name} {shipment.order.customer.last_name}
                </Text>
              </View>
            )}
            
            {shipment.order?.order_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order:</Text>
                <Text style={styles.detailValue}>{shipment.order.order_number}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service:</Text>
              <Text style={styles.detailValue}>{shipment.service_type}</Text>
            </View>

            {shipment.current_location && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{shipment.current_location}</Text>
              </View>
            )}

            {shipment.estimated_delivery_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ETA:</Text>
                <Text style={styles.detailValue}>
                  {new Date(shipment.estimated_delivery_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          {shipment.current_status !== 'delivered' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getStatusColor(shipment.current_status) }]}
              onPress={() => handleStatusUpdate(shipment.current_status)}
            >
              <Text style={styles.actionButtonText}>
                Update Status
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tracking Events */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking History</Text>
          
          {events.length === 0 ? (
            <View style={styles.emptyEvents}>
              <Icon name="timeline" size={48} color={designSystem.colors.textSecondary} />
              <Text style={styles.emptyEventsText}>No tracking events available</Text>
            </View>
          ) : (
            <View style={styles.eventsContainer}>
              {events.map((event, index) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventIndicator}>
                    <View style={[
                      styles.eventDot,
                      index === 0 && styles.eventDotActive
                    ]} />
                    {index < events.length - 1 && <View style={styles.eventLine} />}
                  </View>
                  
                  <View style={styles.eventContent}>
                    <Text style={styles.eventDescription}>
                      {event.event_description}
                    </Text>
                    {event.location && (
                      <Text style={styles.eventLocation}>
                        📍 {event.location}
                      </Text>
                    )}
                    <Text style={styles.eventTime}>
                      {formatDate(event.event_timestamp)}
                    </Text>
                    <Text style={styles.eventSource}>
                      Source: {event.data_source}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.medium,
    paddingVertical: designSystem.spacing.small,
    backgroundColor: designSystem.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: designSystem.spacing.xsmall,
  },
  headerTitle: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  offlineIndicator: {
    padding: designSystem.spacing.xsmall,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: designSystem.colors.surface,
    margin: designSystem.spacing.medium,
    borderRadius: designSystem.borderRadius.large,
    padding: designSystem.spacing.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  cardHeader: {
    marginBottom: designSystem.spacing.medium,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierText: {
    marginLeft: designSystem.spacing.medium,
    flex: 1,
  },
  carrierName: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
  },
  trackingNumber: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    marginTop: designSystem.spacing.xsmall,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing.medium,
  },
  statusBadge: {
    paddingHorizontal: designSystem.spacing.medium,
    paddingVertical: designSystem.spacing.small,
    borderRadius: designSystem.borderRadius.medium,
  },
  statusText: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '600',
    color: designSystem.colors.surface,
  },
  progressText: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: designSystem.spacing.large,
  },
  progressBar: {
    height: 8,
    backgroundColor: designSystem.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailsContainer: {
    marginBottom: designSystem.spacing.large,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: designSystem.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border,
  },
  detailLabel: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButton: {
    paddingVertical: designSystem.spacing.medium,
    borderRadius: designSystem.borderRadius.medium,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '600',
    color: designSystem.colors.surface,
  },
  cardTitle: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
    marginBottom: designSystem.spacing.medium,
  },
  emptyEvents: {
    alignItems: 'center',
    paddingVertical: designSystem.spacing.large,
  },
  emptyEventsText: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    marginTop: designSystem.spacing.small,
  },
  eventsContainer: {
    paddingLeft: designSystem.spacing.small,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: designSystem.spacing.medium,
  },
  eventIndicator: {
    alignItems: 'center',
    marginRight: designSystem.spacing.medium,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: designSystem.colors.border,
    borderWidth: 2,
    borderColor: designSystem.colors.surface,
  },
  eventDotActive: {
    backgroundColor: designSystem.colors.primary,
  },
  eventLine: {
    width: 2,
    flex: 1,
    backgroundColor: designSystem.colors.border,
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventDescription: {
    fontSize: designSystem.typography.sizes.medium,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
    marginBottom: designSystem.spacing.xsmall,
  },
  eventLocation: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    marginBottom: designSystem.spacing.xsmall,
  },
  eventTime: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    marginBottom: designSystem.spacing.xsmall,
  },
  eventSource: {
    fontSize: designSystem.typography.sizes.xsmall,
    color: designSystem.colors.textSecondary,
    fontStyle: 'italic',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.large,
  },
  loadingText: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
  },
  errorTitle: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
    marginTop: designSystem.spacing.medium,
    marginBottom: designSystem.spacing.small,
  },
  errorSubtitle: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ShipmentDetails;