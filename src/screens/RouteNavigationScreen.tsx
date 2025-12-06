import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

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

        // Skip delivered orders entirely - they shouldn't appear in route
        if (status === 'delivered') {
          return;
        }

        // Add pickup point if not already picked up
        const shouldShowPickup = !['picked_up', 'in_transit'].includes(status);

        if (shouldShowPickup && order.pickup_latitude && order.pickup_longitude) {
          const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;

          if (!processedPickups.has(pickupKey)) {
            // Check for batch orders at same pickup location (excluding delivered orders)
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
                status: d.status || 'pending'
              } as Order));

            points.push({
              id: `pickup-${pickupKey}`,
              order: {
                ...order,
                id: delivery.id,
                delivery_id: delivery.id,
                status: status || 'pending'
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

        // Add delivery point only if order is not delivered
        if (order.delivery_latitude && order.delivery_longitude) {
          points.push({
            id: `delivery-${delivery.id}`,
            order: {
              ...order,
              id: delivery.id,
              delivery_id: delivery.id,
              status: status || 'pending'
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
        // Skip delivered orders entirely - they shouldn't appear in route
        if (order.status === 'delivered') {
          return;
        }

        // Add pickup if not picked up
        if (!['picked_up', 'in_transit'].includes(order.status) &&
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

        // Add delivery point only if order is not delivered
        if (order.delivery_latitude && order.delivery_longitude) {
          // Check if this is a consolidated batch going to warehouse
          const isWarehouseConsolidation = order.is_consolidated || 
                                         order.current_batch?.is_consolidated || 
                                         order.consolidation_warehouse_address ||
                                         order.delivery_address_info?.is_warehouse ||
                                         order.warehouse_info?.consolidate_to_warehouse ||
                                         order.current_batch?.delivery_address_info?.is_warehouse ||
                                         false;
          
          let deliveryAddress = order.delivery_address || 'Delivery Location';
          let deliveryLat = Number(order.delivery_latitude);
          let deliveryLng = Number(order.delivery_longitude);
          
          // If warehouse consolidation, check various sources for warehouse address
          if (isWarehouseConsolidation) {
            // Check direct consolidation_warehouse_address field
            if (order.consolidation_warehouse_address) {
              deliveryAddress = `🏭 Warehouse: ${order.consolidation_warehouse_address}`;
            }
            // Check warehouse_info
            else if (order.warehouse_info?.warehouse_address) {
              deliveryAddress = `🏭 Warehouse: ${order.warehouse_info.warehouse_address}`;
              if (order.warehouse_info.latitude && order.warehouse_info.longitude) {
                deliveryLat = Number(order.warehouse_info.latitude);
                deliveryLng = Number(order.warehouse_info.longitude);
              }
            }
            // Check delivery_address_info
            else if (order.delivery_address_info?.is_warehouse && order.delivery_address_info?.address) {
              deliveryAddress = `🏭 Warehouse: ${order.delivery_address_info.address}`;
              if (order.delivery_address_info.latitude && order.delivery_address_info.longitude) {
                deliveryLat = Number(order.delivery_address_info.latitude);
                deliveryLng = Number(order.delivery_address_info.longitude);
              }
            }
            // Check current_batch warehouse info
            else if (order.current_batch?.warehouse_info?.warehouse_address) {
              deliveryAddress = `🏭 Warehouse: ${order.current_batch.warehouse_info.warehouse_address}`;
              if (order.current_batch.warehouse_info.latitude && order.current_batch.warehouse_info.longitude) {
                deliveryLat = Number(order.current_batch.warehouse_info.latitude);
                deliveryLng = Number(order.current_batch.warehouse_info.longitude);
              }
            }
            // Check current_batch delivery_address_info
            else if (order.current_batch?.delivery_address_info?.is_warehouse && order.current_batch?.delivery_address_info?.address) {
              deliveryAddress = `🏭 Warehouse: ${order.current_batch.delivery_address_info.address}`;
              if (order.current_batch.delivery_address_info.latitude && order.current_batch.delivery_address_info.longitude) {
                deliveryLat = Number(order.current_batch.delivery_address_info.latitude);
                deliveryLng = Number(order.current_batch.delivery_address_info.longitude);
              }
            }
            // Fallback: if marked as consolidated but no specific warehouse address
            else if (order.delivery_address) {
              deliveryAddress = `🏭 Warehouse: ${order.delivery_address}`;
            }
          }
          
          points.push({
            id: `delivery-${order.id}`,
            order,
            latitude: deliveryLat,
            longitude: deliveryLng,
            address: deliveryAddress,
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
  // Logic:
  // - For pickup points: consider complete if status is picked_up, in_transit, or delivered
  // - For delivery points: consider complete only if status is delivered
  const currentStopIndex = useMemo(() => {
    if (!optimizedRoute?.points) return -1;

    return optimizedRoute.points.findIndex(point => {
      const status = point.order.status;
      if (point.type === 'pickup') {
        // Pickup is incomplete if order hasn't been picked up yet
        return !['picked_up', 'in_transit', 'delivered'].includes(status);
      } else {
        // Delivery is incomplete if order hasn't been delivered yet
        return status !== 'delivered';
      }
    });
  }, [optimizedRoute]);

  const currentStop = currentStopIndex >= 0 && optimizedRoute?.points 
    ? optimizedRoute.points[currentStopIndex] 
    : null;

  const upcomingStops = optimizedRoute?.points?.slice(currentStopIndex + 1) || [];

  // Add request tracking to prevent duplicate calls
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  
  // Load route data
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        // Prevent duplicate calls within 2 seconds
        const now = Date.now();
        if (loadingRef.current || (now - lastLoadTimeRef.current) < 2000) {
          console.log('[RouteNav] Skipping duplicate load request');
          return;
        }
        
        if (driver?.id) {
          loadingRef.current = true;
          lastLoadTimeRef.current = now;
          
          try {
            // Don't call refreshOrders here - OrderProvider already handles it
            await Promise.all([
              loadBackendRoute(),
              getDriverOrders(),
              // refreshOrders(), // REMOVED: This is already handled by OrderProvider
            ]);
          } finally {
            loadingRef.current = false;
          }
        }
      };
      
      loadData();
    }, [driver?.id, loadBackendRoute, getDriverOrders]) // Removed refreshOrders from deps
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    // Prevent duplicate refresh within 2 seconds
    const now = Date.now();
    if ((now - lastLoadTimeRef.current) < 2000) {
      console.log('[RouteNav] Skipping duplicate refresh request');
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    lastLoadTimeRef.current = now;
    
    try {
      // Don't call refreshOrders here - OrderProvider already handles it
      await Promise.all([
        loadBackendRoute(),
        getDriverOrders(),
        // refreshOrders(), // REMOVED: This is already handled by OrderProvider
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBackendRoute, getDriverOrders]); // Removed refreshOrders from deps

  const handleNavigateToOrder = useCallback((order: Order) => {
    let lat: number | null = null;
    let lng: number | null = null;

    // Determine navigation target based on order status
    // Unified statuses: pending, confirmed, preparing, ready, picked_up, in_transit, delivered, cancelled, failed
    // Before pickup: navigate to pickup location
    // After pickup: navigate to delivery location
    if (['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
      // Navigate to pickup - order not yet picked up
      lat = order.pickup_latitude ? Number(order.pickup_latitude) : null;
      lng = order.pickup_longitude ? Number(order.pickup_longitude) : null;
    } else if (['picked_up', 'in_transit'].includes(order.status)) {
      // Navigate to delivery - order already picked up
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

      // Add a delay to allow backend to process the status change
      // and to bypass the API request throttle (2 second minimum interval)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Force refresh the route data
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
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <LinearGradient
        colors={[flatColors.brand.lighter, '#FFE7C7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorativeBlob, styles.blobTopLeft]} />
      <View style={[styles.decorativeBlob, styles.blobBottomRight]} />
      <View style={styles.ring} />
      
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
            tintColor={flatColors.brand.secondary}
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
        {(!optimizedRoute || optimizedRoute.points.length === 0) && (
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
    backgroundColor: flatColors.brand.lighter,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  decorativeBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  blobTopLeft: {
    top: -40,
    left: -30,
  },
  blobBottomRight: {
    bottom: -60,
    right: -20,
  },
  ring: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.08)',
    top: '20%',
    right: '-16%',
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
    color: flatColors.brand.text,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: flatColors.neutral[700],
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default RouteNavigationScreen;
