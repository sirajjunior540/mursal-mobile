import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  RouteHeader,
  CurrentStopCard,
  UpcomingStops,
  RouteMap,
} from '../components/RouteNavigation';
import { FlatOrderDetailsModal } from '../components/OrderDetails';
import FloatingQRButton from '../components/FloatingQRButton';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { Order } from '../types';
import { RoutePoint, OptimizedRoute, MapConfig } from '../types/route.types';
import { locationService } from '../services/locationService';
import { apiService } from '../services/api';
import { mapProviderService } from '../services/mapProviderService';
import { flatColors } from '../design/dashboard/flatColors';

interface BackendDeliveryData {
  id: string;
  status: string;
  order: {
    id: string;
    order_number: string;
    pickup_latitude?: number;
    pickup_longitude?: number;
    delivery_latitude?: number;
    delivery_longitude?: number;
    pickup_address?: string;
    delivery_address?: string;
    customer?: {
      id?: string;
      name?: string;
      phone?: string;
    };
    customer_details?: {
      id?: string;
      name?: string;
      phone?: string;
    };
  };
}

interface BackendRouteData {
  available_deliveries: BackendDeliveryData[];
  assigned_deliveries: BackendDeliveryData[];
  optimized_route?: {
    success?: boolean;
    optimized_route?: any;
    reason?: string;
  };
}

const RouteNavigationScreen: React.FC = () => {
  const { 
    driverOrders,
    refreshOrders, 
    getDriverOrders,
    updateOrderStatus,
  } = useOrders();
  const { driver } = useDriver();
  
  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [backendRoute, setBackendRoute] = useState<BackendRouteData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    provider: null,
    isActive: false,
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Check map provider configuration
  useEffect(() => {
    const checkMapConfig = async () => {
      try {
        const mobileConfig = await mapProviderService.getMobileMapConfig();
        
        setMapConfig({
          provider: mobileConfig.provider as 'google' | 'mapbox' | 'openroute' | null,
          isActive: mobileConfig.showMap && mobileConfig.enableNavigation,
        });
        
        if (!mobileConfig.supportsMobile && mobileConfig.provider) {
          console.warn(`Map provider ${mobileConfig.provider} has limited mobile support`);
        }
      } catch (error) {
        console.error('Error checking map config:', error);
        setMapConfig({ provider: null, isActive: false });
      }
    };
    
    checkMapConfig();
  }, []);

  // Load backend route optimization
  const loadBackendRoute = useCallback(async () => {
    try {
      const location = await locationService.getCurrentLocation();
      const response = await apiService.getRouteOptimization(
        location?.latitude, 
        location?.longitude
      );
      
      if (response.success && response.data) {
        setBackendRoute(response.data);
      }
    } catch (error) {
      console.error('Error loading backend route:', error);
      // Fallback to driver orders if route optimization fails
      try {
        await getDriverOrders();
      } catch (fallbackError) {
        console.error('Error loading driver orders fallback:', fallbackError);
      }
    }
  }, [getDriverOrders]);

  // Create optimized route from backend data
  const optimizedRoute = useMemo((): OptimizedRoute | null => {
    // Try backend route first
    if (backendRoute?.assigned_deliveries?.length > 0) {
      const points: RoutePoint[] = [];
      const processedPickups = new Set<string>();
      let sequenceNumber = 1;

      // Process deliveries and create route points
      backendRoute.assigned_deliveries.forEach((delivery) => {
        const order = delivery.order;
        const status = delivery.status;

        // Add pickup point if not already picked up
        const shouldShowPickup = !['picked_up', 'in_transit', 'delivered'].includes(status);
        
        if (shouldShowPickup && order.pickup_latitude && order.pickup_longitude) {
          const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;
          
          if (!processedPickups.has(pickupKey)) {
            // Check for batch orders at same pickup location
            const batchOrders = backendRoute.assigned_deliveries
              .filter(d => 
                d.order.pickup_latitude === order.pickup_latitude &&
                d.order.pickup_longitude === order.pickup_longitude &&
                !['picked_up', 'in_transit', 'delivered'].includes(d.status)
              )
              .map(d => ({
                ...d.order,
                id: d.id,
                delivery_id: d.id,
                status: d.status || 'assigned'
              } as Order));

            points.push({
              id: `pickup-${pickupKey}`,
              order: {
                ...order,
                id: delivery.id,
                delivery_id: delivery.id,
                status: status || 'assigned'
              } as Order,
              latitude: Number(order.pickup_latitude),
              longitude: Number(order.pickup_longitude),
              address: order.pickup_address || 'Pickup Location',
              type: 'pickup',
              sequenceNumber: sequenceNumber++,
              batchOrders: batchOrders.length > 1 ? batchOrders : undefined,
            });
            
            processedPickups.add(pickupKey);
          }
        }

        // Add delivery point
        if (order.delivery_latitude && order.delivery_longitude) {
          points.push({
            id: `delivery-${delivery.id}`,
            order: {
              ...order,
              id: delivery.id,
              delivery_id: delivery.id,
              status: status || 'assigned'
            } as Order,
            latitude: Number(order.delivery_latitude),
            longitude: Number(order.delivery_longitude),
            address: order.delivery_address || 'Delivery Location',
            type: 'delivery',
            sequenceNumber: sequenceNumber++,
          });
        }
      });

      // Calculate estimates
      let totalDistance = 0;
      let totalTime = 0;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Simple distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
        const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c * 1000; // Convert to meters
        
        totalDistance += distance;
        const time = distance / 1000 * 2; // 2 minutes per km estimate
        totalTime += time;
      }

      return {
        points,
        totalDistance,
        totalTime: totalTime * 60, // Convert to seconds
        estimatedCompletion: new Date(Date.now() + totalTime * 60 * 1000).toISOString(),
      };
    }

    // Fallback to driver orders
    if (driverOrders.length > 0) {
      const points: RoutePoint[] = [];
      let sequenceNumber = 1;

      driverOrders.forEach((order) => {
        // Add pickup if not picked up
        if (!['picked_up', 'in_transit', 'delivered'].includes(order.status) &&
            order.pickup_latitude && order.pickup_longitude) {
          points.push({
            id: `pickup-${order.id}`,
            order,
            latitude: Number(order.pickup_latitude),
            longitude: Number(order.pickup_longitude),
            address: order.pickup_address || 'Pickup Location',
            type: 'pickup',
            sequenceNumber: sequenceNumber++,
          });
        }

        // Add delivery
        if (order.delivery_latitude && order.delivery_longitude) {
          points.push({
            id: `delivery-${order.id}`,
            order,
            latitude: Number(order.delivery_latitude),
            longitude: Number(order.delivery_longitude),
            address: order.delivery_address || 'Delivery Location',
            type: 'delivery',
            sequenceNumber: sequenceNumber++,
          });
        }
      });

      return {
        points,
        totalDistance: 0,
        totalTime: 0,
        estimatedCompletion: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    }

    return null;
  }, [backendRoute, driverOrders]);

  // Get current stop (first incomplete stop)
  const currentStopIndex = useMemo(() => {
    if (!optimizedRoute?.points) return -1;
    
    return optimizedRoute.points.findIndex(point => 
      point.order.status !== 'delivered'
    );
  }, [optimizedRoute]);

  const currentStop = currentStopIndex >= 0 && optimizedRoute?.points 
    ? optimizedRoute.points[currentStopIndex] 
    : null;

  const upcomingStops = optimizedRoute?.points?.slice(currentStopIndex + 1) || [];

  // Load route data
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (driver?.id) {
          await Promise.all([
            loadBackendRoute(),
            getDriverOrders(),
            refreshOrders(),
          ]);
        }
      };
      
      loadData();
    }, [driver?.id, loadBackendRoute, getDriverOrders, refreshOrders])
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadBackendRoute(),
        getDriverOrders(),
        refreshOrders(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBackendRoute, getDriverOrders, refreshOrders]);

  const handleNavigateToOrder = useCallback((order: Order) => {
    let lat: number | null = null;
    let lng: number | null = null;
    
    // Determine navigation target based on order status
    if (['assigned', 'confirmed'].includes(order.status)) {
      // Navigate to pickup
      lat = order.pickup_latitude ? Number(order.pickup_latitude) : null;
      lng = order.pickup_longitude ? Number(order.pickup_longitude) : null;
    } else if (['picked_up', 'in_transit'].includes(order.status)) {
      // Navigate to delivery
      lat = order.delivery_latitude ? Number(order.delivery_latitude) : null;
      lng = order.delivery_longitude ? Number(order.delivery_longitude) : null;
    }
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open navigation app');
      });
    } else {
      Alert.alert('Navigation Error', 'No valid coordinates available');
    }
  }, []);

  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: string, photoId?: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus(orderId, newStatus, photoId);
      await handleRefresh();
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [updateOrderStatus, handleRefresh]);

  const handleCallCustomer = useCallback((phoneNumber: string) => {
    if (phoneNumber?.trim()) {
      Linking.openURL(`tel:${phoneNumber.trim()}`).catch(() => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  }, []);

  const handleViewOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  }, []);

  const handleStopPress = useCallback((stop: RoutePoint) => {
    handleViewOrderDetails(stop.order);
  }, [handleViewOrderDetails]);

  const handleNavigateToStop = useCallback((stop: RoutePoint) => {
    handleNavigateToOrder(stop.order);
  }, [handleNavigateToOrder]);

  const handleQRScanResult = useCallback((result: any) => {
    if (result.success && result.data) {
      Alert.alert('QR Code Scanned', `Data: ${result.data}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />
      
      {/* Header */}
      <RouteHeader
        route={optimizedRoute}
        driver={driver}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={flatColors.accent.blue}
          />
        }
      >
        {/* Map Overview */}
        {mapConfig.isActive && optimizedRoute && (
          <RouteMap
            route={optimizedRoute}
            currentStopIndex={currentStopIndex}
            showMap={mapConfig.isActive}
            mapProvider={mapConfig.provider!}
          />
        )}

        {/* Current Stop */}
        {currentStop && (
          <View style={styles.section}>
            <CurrentStopCard
              routePoint={currentStop}
              onNavigate={handleNavigateToOrder}
              onStatusUpdate={handleStatusUpdate}
              onCallCustomer={handleCallCustomer}
              onViewDetails={handleViewOrderDetails}
              isLoading={isUpdatingStatus}
            />
          </View>
        )}

        {/* Upcoming Stops */}
        {upcomingStops.length > 0 && (
          <View style={styles.section}>
            <UpcomingStops
              stops={upcomingStops}
              onStopPress={handleStopPress}
              onNavigateToStop={handleNavigateToStop}
            />
          </View>
        )}

        {/* Empty State */}
        {!optimizedRoute || optimizedRoute.points.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active route</Text>
            <Text style={styles.emptySubtext}>Accept orders to start your route</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating QR Button */}
      <FloatingQRButton onScanResult={handleQRScanResult} />

      {/* Order Details Modal */}
      <FlatOrderDetailsModal
        visible={showOrderDetailsModal}
        order={selectedOrder}
        onClose={() => {
          setShowOrderDetailsModal(false);
          setSelectedOrder(null);
        }}
        onStatusUpdate={handleStatusUpdate}
        onAccept={undefined} // Don't show accept button for route orders
        onDecline={undefined} // Don't show decline button for route orders
        onNavigate={(order) => {
          setShowOrderDetailsModal(false);
          if (order) {
            handleNavigateToOrder(order);
          }
        }}
        onCall={(phone) => {
          if (phone) {
            handleCallCustomer(phone);
          }
        }}
        showStatusButton={true}
        readonly={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: flatColors.neutral[600],
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: flatColors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default RouteNavigationScreen;