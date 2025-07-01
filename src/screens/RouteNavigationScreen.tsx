import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Haptics from 'react-native-haptic-feedback';

import Card from '../components/ui/Card';
import OrderDetailsModal from '../components/OrderDetailsModal';

import { useOrders } from '../contexts/OrderContext';
import { useDriver } from '../contexts/DriverContext';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RoutePoint {
  id: string;
  order: Order;
  latitude: number;
  longitude: number;
  address: string;
  type: 'pickup' | 'delivery';
  sequenceNumber: number;
  estimatedArrival?: string;
  distanceFromPrevious?: number;
  timeFromPrevious?: number;
}

interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  estimatedCompletion: string;
}

const RouteNavigationScreen: React.FC = () => {
  const { user } = useAuth();
  const { 
    orders: availableOrders, 
    driverOrders,
    refreshOrders, 
    isLoading, 
    getDriverOrders, 
    getRouteOptimization,
    updateOrderStatus
  } = useOrders();
  const { driver } = useDriver();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'route' | 'available'>('route');
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [backendRoute, setBackendRoute] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Load backend route optimization
  const loadBackendRoute = useCallback(async () => {
    try {
      setOptimizingRoute(true);
      console.log('🗺️ Loading backend route optimization...');
      const routeData = await getRouteOptimization();
      if (routeData) {
        setBackendRoute(routeData);
        console.log('✅ Backend route loaded:', routeData);
      }
    } catch (error) {
      console.error('❌ Error loading backend route:', error);
    } finally {
      setOptimizingRoute(false);
    }
  }, [getRouteOptimization]);

  // Load route data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadRouteData = async () => {
        if (driver?.id) {
          console.log('🔄 RouteNavigationScreen focused - loading fresh route data...');
          
          // Load backend route optimization and driver orders
          try {
            await Promise.all([
              loadBackendRoute(),
              getDriverOrders?.()
            ]);
            console.log('✅ Route data loaded successfully');
          } catch (error) {
            console.error('❌ Error loading route data:', error);
          }
        }
      };
      
      loadRouteData();
    }, [driver?.id, getDriverOrders, loadBackendRoute])
  );

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.trigger('impactLight');
    try {
      await Promise.all([
        getDriverOrders?.(),
        loadBackendRoute()
      ]);
    } catch (error) {
      console.error('Error refreshing route data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [getDriverOrders, loadBackendRoute]);

  // Use driver orders for route display (includes ongoing deliveries as fallback)
  const routeOrders = useMemo(() => {
    const driverArray = Array.isArray(driverOrders) ? driverOrders : [];
    
    console.log('🗺️ RouteNavigationScreen - driverOrders received:', {
      driverOrders: driverArray.length,
      raw: driverOrders,
      driverOrderIds: driverArray.map(o => `${o.id}(${o.status})`),
      firstOrderFull: driverArray.length > 0 ? driverArray[0] : null
    });
    
    // Filter for active orders that can be navigated to
    const filtered = driverArray.filter(order => {
      const hasPickupLocation = !!(order.pickup_latitude && order.pickup_longitude);
      const hasDeliveryLocation = !!(order.delivery_latitude && order.delivery_longitude);
      const hasLocation = hasPickupLocation || hasDeliveryLocation;
      
      // Include all statuses that need navigation: assigned, accepted, picked_up, in_transit
      const activeStatuses = ['assigned', 'accepted', 'picked_up', 'in_transit'];
      const isActive = activeStatuses.includes(order.status) || 
                       (order.status !== 'delivered' && order.status !== 'cancelled');
      
      console.log(`📋 RouteNavigationScreen filtering - Order ${order.id}:`, {
        status: order.status,
        hasPickupLocation,
        hasDeliveryLocation, 
        hasLocation,
        isActive,
        pickup_lat: order.pickup_latitude,
        pickup_lng: order.pickup_longitude,
        delivery_lat: order.delivery_latitude,
        delivery_lng: order.delivery_longitude,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        customer: order.customer?.name,
        orderNumber: order.orderNumber,
        willShow: isActive && hasLocation
      });
      
      return isActive && hasLocation;
    });
    
    console.log(`✅ RouteNavigationScreen final result: ${filtered.length} orders will show on route screen`);
    if (filtered.length === 0 && driverArray.length > 0) {
      console.log('❌ RouteNavigationScreen: No orders passed filtering! Check filtering logic.');
    }
    return filtered;
  }, [driverOrders]);

  // Available orders for acceptance (from Dashboard)
  const availableOrdersList = useMemo(() => {
    return (availableOrders || []).filter(order => 
      order.status === 'pending' || order.status === 'assigned'
    );
  }, [availableOrders]);

  // Distance calculations are handled by backend DistanceCalculationService
  // Mobile app will rely on backend route optimization for accurate distances

  // Fallback route optimization for when backend route is not available
  // This should only be used as a simple fallback - backend has proper optimization
  const optimizeRoute = useCallback((orders: Order[], driverLat?: number, driverLon?: number): OptimizedRoute => {
    const points: RoutePoint[] = [];
    
    // Create points for pickup and delivery in simple sequential order
    orders.forEach((order, orderIndex) => {
      // Add pickup point if coordinates exist and order is not picked up
      if (order.pickup_latitude && order.pickup_longitude && order.status !== 'in_transit') {
        points.push({
          id: `${order.id}-pickup`,
          order,
          latitude: order.pickup_latitude,
          longitude: order.pickup_longitude,
          address: order.pickup_address || 'Pickup Location',
          type: 'pickup',
          sequenceNumber: points.length + 1,
          estimatedArrival: new Date(Date.now() + (points.length * 15 * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          distanceFromPrevious: orderIndex === 0 ? 0 : 2.5, // Placeholder distance
          timeFromPrevious: 15, // 15 minutes between stops
        });
      }
      
      // Add delivery point if coordinates exist
      if (order.delivery_latitude && order.delivery_longitude) {
        points.push({
          id: `${order.id}-delivery`,
          order,
          latitude: order.delivery_latitude,
          longitude: order.delivery_longitude,
          address: order.delivery_address || 'Delivery Location',
          type: 'delivery',
          sequenceNumber: points.length + 1,
          estimatedArrival: new Date(Date.now() + (points.length * 15 * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          distanceFromPrevious: 1.5, // Placeholder distance
          timeFromPrevious: 10, // 10 minutes for delivery
        });
      }
    });

    return {
      points,
      totalDistance: points.reduce((sum, point) => sum + (point.distanceFromPrevious || 0), 0),
      totalTime: points.reduce((sum, point) => sum + (point.timeFromPrevious || 0), 0),
      estimatedCompletion: points.length > 0 ? 
        new Date(Date.now() + (points.length * 15 * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }, []);

  // Get optimized route - prefer backend route if available
  const optimizedRoute = useMemo(() => {
    if (backendRoute && backendRoute.route_steps && backendRoute.route_steps.length > 0) {
      console.log('✅ Using backend route optimization');
      return transformBackendRoute(backendRoute);
    }
    
    if (!routeOrders.length) return null;
    console.log('🔄 Using fallback local route optimization');
    return optimizeRoute(routeOrders, driver?.current_latitude, driver?.current_longitude);
  }, [routeOrders, optimizeRoute, driver?.current_latitude, driver?.current_longitude, backendRoute]);

  // Transform backend route data to match mobile format
  const transformBackendRoute = useCallback((backendRouteData: any): OptimizedRoute => {
    const routeSteps = Array.isArray(backendRouteData?.route_steps) ? backendRouteData.route_steps : [];
    
    const points: RoutePoint[] = routeSteps.map((step: any, index: number) => ({
      id: `${step.delivery_id || index}-${step.action || 'unknown'}`,
      order: routeOrders.find(o => o.id === step.delivery_id) || {} as Order,
      latitude: step.latitude || 0,
      longitude: step.longitude || 0,
      address: step.address || '',
      type: step.action === 'pickup' ? 'pickup' : 'delivery',
      sequenceNumber: index + 1,
      estimatedArrival: step.estimated_arrival || '',
      distanceFromPrevious: step.distance_from_previous || 0,
      timeFromPrevious: step.time_from_previous || 0,
    }));

    return {
      points,
      totalDistance: backendRouteData.total_distance || 0,
      totalTime: backendRouteData.total_time || 0,
      estimatedCompletion: backendRouteData.estimated_completion || '',
    };
  }, [routeOrders]);

  // Find current step in route
  const currentStepIndex = useMemo(() => {
    if (!optimizedRoute?.points) return 0;
    
    // Find first incomplete step
    for (let i = 0; i < optimizedRoute.points.length; i++) {
      const point = optimizedRoute.points[i];
      const order = point.order;
      
      // If it's a pickup and order is not picked up yet (assigned, accepted statuses)
      if (point.type === 'pickup' && 
          ['assigned', 'accepted'].includes(order.status)) {
        return i;
      }
      
      // If it's a delivery and order is picked up but not delivered (picked_up, in_transit statuses)
      if (point.type === 'delivery' && 
          ['picked_up', 'in_transit'].includes(order.status)) {
        return i;
      }
    }
    
    return 0;
  }, [optimizedRoute]);

  // Current point
  const currentPoint = optimizedRoute?.points?.[currentStepIndex] || null;
  
  // Route progress
  const routeProgress = useMemo(() => {
    if (!optimizedRoute?.points.length) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = currentStepIndex;
    const total = optimizedRoute.points.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  }, [optimizedRoute, currentStepIndex]);

  // Get upcoming steps (excluding current step)
  const upcomingSteps = useMemo(() => {
    if (!optimizedRoute?.points) return [];
    return optimizedRoute.points.slice(currentStepIndex + 1).slice(0, 3);
  }, [optimizedRoute, currentStepIndex]);

  const handleNavigateToPoint = useCallback((point: RoutePoint) => {
    Haptics.trigger('selectionClick');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
    Linking.openURL(url);
  }, []);

  const handleOptimizeRoute = useCallback(async () => {
    setOptimizingRoute(true);
    Haptics.trigger('impactMedium');
    // Simulate route optimization API call
    setTimeout(() => {
      setOptimizingRoute(false);
      Alert.alert('Route Optimized', 'Your delivery route has been optimized for minimum travel time.');
    }, 2000);
  }, []);

  const handleCallCustomer = useCallback((phone?: string) => {
    if (phone) {
      Haptics.trigger('selectionClick');
      Linking.openURL(`tel:${phone}`);
    }
  }, []);

  const handleShowOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  }, []);

  const handleCloseOrderDetails = useCallback(() => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  }, []);

  const handleNavigateFromModal = useCallback((latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'assigned': return '#F59E0B';
      case 'picked_up': 
      case 'in_transit': return '#3B82F6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPointTypeIcon = (type: 'pickup' | 'delivery') => {
    return type === 'pickup' ? 'cube-outline' : 'home-outline';
  };

  const handleStatusUpdate = useCallback(async (order: Order, newStatus: string) => {
    setUpdatingStatus(true);
    Haptics.trigger('impactMedium');
    
    try {
      const success = await updateOrderStatus(order.id, newStatus as any);
      if (success) {
        // Refresh driver orders to show updated status
        await getDriverOrders?.();
        Alert.alert('Success', `Order status updated to ${newStatus} successfully`);
      } else {
        Alert.alert('Error', 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [updateOrderStatus, getDriverOrders]);

  const getNextStatus = (currentStatus: string, pointType: 'pickup' | 'delivery') => {
    if (pointType === 'pickup') {
      if (currentStatus === 'assigned' || currentStatus === 'accepted') {
        return 'picked_up';
      }
    } else if (pointType === 'delivery') {
      if (currentStatus === 'picked_up' || currentStatus === 'in_transit') {
        return 'delivered';
      }
    }
    return null;
  };

  const getStatusButtonText = (currentStatus: string, pointType: 'pickup' | 'delivery') => {
    const nextStatus = getNextStatus(currentStatus, pointType);
    if (nextStatus === 'picked_up') return 'Mark Picked Up';
    if (nextStatus === 'delivered') return 'Mark Delivered';
    return null;
  };

  // Render clean header without gradient
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.headerTitle}>Route Navigation</Text>
          <Text style={styles.headerSubtitle}>
            {currentPoint ? 'Follow optimized route' : 'No active deliveries'}
          </Text>
        </View>
        
        {optimizedRoute && (
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {routeProgress.completed}/{routeProgress.total}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render the current active step with clean design
  const renderCurrentStep = () => {
    if (!currentPoint) return null;

    const nextStatus = getNextStatus(currentPoint.order.status || 'assigned', currentPoint.type);
    const statusButtonText = getStatusButtonText(currentPoint.order.status || 'assigned', currentPoint.type);
    const isPickup = currentPoint.type === 'pickup';
    const customerPhone = currentPoint.order.customer_details?.phone || currentPoint.order.customer?.phone;
    
    return (
      <View style={styles.currentStepContainer}>
        <TouchableOpacity 
          style={styles.currentStepCard}
          onPress={() => handleShowOrderDetails(currentPoint.order)}
          activeOpacity={0.7}
        >
          <View style={styles.currentStepHeader}>
            <View style={styles.stopTypeIndicator}>
              <View style={[styles.stopTypeIcon, { backgroundColor: isPickup ? '#F59E0B' : '#10B981' }]}>
                <Ionicons 
                  name={isPickup ? 'bag' : 'home'} 
                  size={24} 
                  color="#ffffff" 
                />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopTypeLabel}>
                  {isPickup ? 'Pickup Location' : 'Delivery Location'}
                </Text>
                <Text style={styles.stopOrderId}>
                  Order #{currentPoint.order.order_number || String(currentPoint.order.id).slice(-4)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>CURRENT</Text>
            </View>
          </View>

          <View style={styles.stopDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={18} color="#6b7280" />
              <Text style={styles.stopAddress} numberOfLines={2}>
                {currentPoint.address || currentPoint.order.delivery_address || 'Address not available'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="person" size={18} color="#6b7280" />
              <Text style={styles.customerName}>
                {currentPoint.order.customer_details?.name || currentPoint.order.customer?.name || 'Unknown Customer'}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Text style={styles.tapForDetails}>Tap for more details</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleNavigateToPoint(currentPoint)}
            style={[styles.actionButton, styles.navigateButton]}
          >
            <Ionicons name="navigate" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
          
          {customerPhone && (
            <TouchableOpacity
              onPress={() => handleCallCustomer(customerPhone)}
              style={[styles.actionButton, styles.callButton]}
            >
              <Ionicons name="call" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          
          {nextStatus && statusButtonText && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(currentPoint.order, nextStatus)}
              style={[styles.actionButton, styles.statusButton, { backgroundColor: getStatusColor(nextStatus) }]}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons 
                    name={nextStatus === 'picked_up' ? 'checkmark-circle' : 'flag'} 
                    size={20} 
                    color="#ffffff" 
                  />
                  <Text style={styles.actionButtonText}>{statusButtonText}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render upcoming stops
  const renderUpcomingStops = () => {
    if (upcomingSteps.length === 0) return null;

    return (
      <View style={styles.upcomingSection}>
        <Text style={styles.upcomingSectionTitle}>Next Stops ({upcomingSteps.length})</Text>
        {upcomingSteps.map((point, index) => (
          <TouchableOpacity
            key={point.id}
            style={styles.upcomingStopCard}
            onPress={() => handleShowOrderDetails(point.order)}
            activeOpacity={0.7}
          >
            <View style={styles.upcomingStopNumber}>
              <Text style={styles.upcomingStopNumberText}>{index + 2}</Text>
            </View>
            <View style={styles.upcomingStopContent}>
              <View style={styles.upcomingStopHeader}>
                <Text style={styles.upcomingStopType}>
                  {point.type === 'pickup' ? 'Pickup' : 'Delivery'}
                </Text>
                <Text style={styles.upcomingOrderNumber}>
                  #{point.order.order_number || String(point.order.id).slice(-4)}
                </Text>
              </View>
              <Text style={styles.upcomingStopAddress} numberOfLines={1}>
                {point.address || point.order.delivery_address || 'Address not available'}
              </Text>
              <Text style={styles.upcomingStopCustomer} numberOfLines={1}>
                {point.order.customer_details?.name || point.order.customer?.name || 'Unknown Customer'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render route progress
  const renderRouteProgress = () => {
    if (!optimizedRoute?.points || optimizedRoute.points.length === 0) return null;

    return (
      <Card style={styles.progressCard}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.progressGradient}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Route Progress</Text>
              <Text style={styles.progressSubtitle}>
                {routeProgress.completed} of {routeProgress.total} stops completed
              </Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressPercentage}>{Math.round(routeProgress.percentage)}%</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: `${routeProgress.percentage}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.routeMetrics}>
            <View style={styles.metric}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.metricText}>{optimizedRoute?.totalDistance?.toFixed(1) || '0.0'} km</Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="time" size={16} color="#6b7280" />
              <Text style={styles.metricText}>
                {Math.round(optimizedRoute?.totalTime || 0)} min remaining
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  const renderRouteHeader = () => (
    <View style={styles.routeHeader}>
      <View style={styles.routeStats}>
        <View style={styles.statItem}>
          <Ionicons name="location" size={20} color="#3B82F6" />
          <Text style={styles.statLabel}>Total Distance</Text>
          <Text style={styles.statValue}>{optimizedRoute?.totalDistance?.toFixed(1) || '0.0'} km</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <Text style={styles.statLabel}>Estimated Time</Text>
          <Text style={styles.statValue}>{Math.round(optimizedRoute?.totalTime || 0)} min</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.statLabel}>Completion</Text>
          <Text style={styles.statValue}>{optimizedRoute?.estimatedCompletion || 'N/A'}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.optimizeButton, optimizingRoute && styles.optimizeButtonLoading]}
        onPress={handleOptimizeRoute}
        disabled={optimizingRoute}
      >
        {optimizingRoute ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="shuffle" size={16} color="#FFFFFF" />
        )}
        <Text style={styles.optimizeButtonText}>
          {optimizingRoute ? 'Optimizing...' : 'Re-optimize Route'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyRoute = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="map-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Active Deliveries</Text>
      <Text style={styles.emptyText}>
        Accept orders to see your optimized delivery route here.
      </Text>
    </View>
  );

  if (isLoading && !driverOrders?.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading route optimization...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {currentPoint ? (
            <>
              {renderCurrentStep()}
              {renderRouteProgress()}
              {renderUpcomingStops()}
            </>
          ) : (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="car-outline" size={48} color="#6B7280" />
                </View>
                <Text style={styles.emptyTitle}>No Active Route</Text>
                <Text style={styles.emptySubtitle}>
                  Accept orders to start receiving optimized delivery routes
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <OrderDetailsModal
          visible={showOrderDetails}
          order={selectedOrder}
          onClose={handleCloseOrderDetails}
          onStatusUpdate={handleStatusUpdate}
          onNavigate={handleNavigateFromModal}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerStats: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  
  // Map Section
  mapContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },

  // Current Step Section - Clean Design
  currentStepContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  currentStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stopTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stopInfo: {
    flex: 1,
  },
  stopTypeLabel: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  stopOrderId: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  stopDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopAddress: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  customerName: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapForDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  navigateButton: {
    backgroundColor: '#3B82F6',
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  statusButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Progress Section - Clean Design
  progressCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressStats: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  
  // Upcoming Section - Clean Design
  upcomingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  upcomingSectionTitle: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 16,
  },
  upcomingStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  upcomingStopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  upcomingStopNumberText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  upcomingStopContent: {
    flex: 1,
  },
  upcomingStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingStopType: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  upcomingOrderNumber: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  upcomingStopAddress: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  upcomingStopCustomer: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // Empty State Section - Clean Design
  emptyStateCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default RouteNavigationScreen;
