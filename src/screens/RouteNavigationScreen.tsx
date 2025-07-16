import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Card from '../components/ui/Card';
import FloatingQRButton from '../components/FloatingQRButton';
import EnhancedOrderCard from '../components/EnhancedOrderCard';
import BatchOrderCard from '../components/BatchOrderCard';

import { useOrders } from '../features/orders/context/OrderProvider';
import { useDriver } from '../contexts/DriverContext';
import { useAuth } from '../contexts/AuthContext';
import { Order, BatchOrder, isBatchOrder } from '../types';
import { locationService } from '../services/locationService';
import { apiService } from '../services/api';
import { mapProviderService } from '../services/mapProviderService';
import { Design } from '../constants/designSystem';


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
  batchOrders?: Order[];
}

interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  estimatedCompletion: string;
}

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

interface RouteStep {
  delivery_id: string;
  action: 'pickup' | 'delivery';
  latitude: number;
  longitude: number;
  address: string;
  estimated_arrival?: string;
  distance_from_previous?: number;
  time_from_previous?: number;
}

interface RouteDelivery {
  id: number;
  route: number;
  delivery: number;
  delivery_details?: any;
  sequence_order: number;
  estimated_arrival_time?: string;
}

interface BackendOptimizedRoute {
  id?: number;
  driver?: number;
  driver_name?: string;
  delivery_count?: number;
  total_distance_km?: string;
  route_deliveries?: RouteDelivery[];
  created_at?: string;
  updated_at?: string;
  estimated_completion_time?: string;
  // Old structure fields
  route_steps?: RouteStep[];
  total_distance?: number;
  total_time?: number;
  estimated_completion?: string;
}

interface BackendRouteData {
  available_deliveries: BackendDeliveryData[];
  assigned_deliveries: BackendDeliveryData[];
  optimized_route?: {
    success?: boolean;
    optimized_route?: BackendOptimizedRoute;
    reason?: string;
  };
  warehouse_batches_processing?: Array<{
    batch_number: string;
    status: string;
    total_orders: number;
  }>;
}

interface QRScanResult {
  success: boolean;
  data?: string;
}

const RouteNavigationScreen: React.FC = () => {
  const { user: _user } = useAuth();
  const { 
    orders: availableOrders, 
    driverOrders,
    refreshOrders, 
    getDriverOrders,
    isLoading: _isLoading, 
    updateOrderStatus
  } = useOrders();
  const { driver } = useDriver();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'route' | 'available'>('route');
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [backendRoute, setBackendRoute] = useState<BackendRouteData | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [currentStopForPopup, setCurrentStopForPopup] = useState<RoutePoint | null>(null);
  const [routeSegments, setRouteSegments] = useState<Array<{
    coordinates: {latitude: number, longitude: number}[];
    distance: number;
    duration: number;
  }>>([]);

  // QR Scanner integration
  const handleQRScanResult = useCallback((result: QRScanResult) => {
    if (result.success && result.data) {
      Alert.alert(
        'QR Code Scanned',
        `Scanned: ${result.data}`,
        [{ text: 'OK' }]
      );
    }
  }, []);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Check if map provider is configured and has API keys
  useEffect(() => {
    const checkMapAvailability = async () => {
      try {
        const shouldShow = await mapProviderService.shouldShowMap();
        setShowMap(shouldShow);
      } catch (error) {
        console.error('Error checking map availability:', error);
        setShowMap(false);
      }
    };
    
    checkMapAvailability();
    
    // Periodically check map availability (every 30 seconds)
    const intervalId = setInterval(checkMapAvailability, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Load backend route optimization
  const loadDriverOrders = useCallback(async () => {
    try {
      await getDriverOrders();
    } catch (error) {
      console.error('Error loading driver orders:', error);
    }
  }, [getDriverOrders]);

  const loadBackendRoute = useCallback(async () => {
    try {
      setOptimizingRoute(true);
      // Get current driver location for route optimization
      try {
        const location = await locationService.getCurrentLocation();
        if (location) {
          const response = await apiService.getRouteOptimization(location.latitude, location.longitude);
          const routeData = response.success ? response.data : null;
          if (routeData) {
            setBackendRoute(routeData);
            
            // Extract available orders from route optimization response
            if (routeData.available_deliveries) {
              const processedOrders = routeData.available_deliveries.map((delivery: any) => ({
                ...delivery.order,
                id: delivery.id,
                delivery_id: delivery.id,
                status: delivery.status || 'pending'
              }));
              if (refreshOrders) {
                refreshOrders();
              }
            }
          }
        } else {
          const response = await apiService.getRouteOptimization();
          const routeData = response.success ? response.data : null;
          if (routeData) {
            setBackendRoute(routeData);
          }
        }
      } catch (locationError) {
        const response = await apiService.getRouteOptimization();
        const routeData = response.success ? response.data : null;
        if (routeData) {
          setBackendRoute(routeData);
        }
      }
    } catch (error) {
      console.error('Error loading backend route:', error);
    } finally {
      setOptimizingRoute(false);
    }
  }, [refreshOrders]);

  // Load route segments for multi-stop navigation
  const loadRouteSegments = useCallback(async (routePoints: RoutePoint[]) => {
    if (!showMap || routePoints.length < 2) return;

    const segments = [];
    
    for (let i = 0; i < routePoints.length - 1; i++) {
      const origin = routePoints[i];
      const destination = routePoints[i + 1];
      
      try {
        const route = await mapProviderService.getRoute(
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude }
        );
        
        if (route) {
          segments.push({
            coordinates: route.coordinates,
            distance: route.distance,
            duration: route.duration,
          });
        }
      } catch (error) {
        console.error('Error fetching route segment:', error);
      }
    }
    
    setRouteSegments(segments);
  }, [showMap]);

  // Load route data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadRouteData = async () => {
        if (driver?.id) {
          try {
            await Promise.all([
              loadBackendRoute(),
              loadDriverOrders(),
              refreshOrders()
            ]);
          } catch (error) {
            console.error('Error loading route data:', error);
          }
        }
      };
      
      loadRouteData();
    }, [driver?.id, loadDriverOrders, loadBackendRoute, refreshOrders])
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
  }, [fadeAnim, slideAnim]);

  // Use orders from backend route optimization response
  const routeOrders = useMemo(() => {
    // Computing routeOrders
    
    if (backendRoute && backendRoute.assigned_deliveries) {
      const assignedArray = Array.isArray(backendRoute.assigned_deliveries) ? backendRoute.assigned_deliveries : [];
      
      const processedOrders = assignedArray.map((delivery: BackendDeliveryData) => ({
        ...delivery.order,
        id: delivery.id,
        delivery_id: delivery.id,
        status: delivery.status || 'assigned',
        customer: delivery.order.customer ? {
          id: delivery.order.customer.id || 'unknown',
          name: delivery.order.customer.name || '',
          phone: delivery.order.customer.phone || ''
        } : undefined,
        customer_details: delivery.order.customer_details ? {
          id: delivery.order.customer_details.id || 'unknown',
          name: delivery.order.customer_details.name || '',
          phone: delivery.order.customer_details.phone || ''
        } : undefined
      }));
      
      // Filter for active orders that can be navigated to
      const filtered = processedOrders.filter((order: Order) => {
        const hasPickupLocation = !!(order.pickup_latitude && order.pickup_longitude);
        const hasDeliveryLocation = !!(order.delivery_latitude && order.delivery_longitude);
        const hasLocation = hasPickupLocation || hasDeliveryLocation;
        
        const routeStatuses = ['assigned', 'confirmed', 'picked_up', 'in_transit', 'delivered'];
        const isActive = routeStatuses.includes(order.status);
        
        return isActive && hasLocation;
      });
      
      return filtered || [];
    }
    
    if (driverOrders.length > 0) {
      return driverOrders.filter((order: Order) => {
        const hasPickupLocation = !!(order.pickup_latitude && order.pickup_longitude);
        const hasDeliveryLocation = !!(order.delivery_latitude && order.delivery_longitude);
        const hasLocation = hasPickupLocation || hasDeliveryLocation;
        
        const routeStatuses = ['assigned', 'confirmed', 'picked_up', 'in_transit', 'delivered'];
        const isActive = routeStatuses.includes(order.status);
        
        return isActive && hasLocation;
      });
    }
    
    return [];
  }, [backendRoute, driverOrders]);

  // Create optimized route from backend route steps or available deliveries
  const optimizedRoute = useMemo((): OptimizedRoute | null => {
    // Creating optimizedRoute
    
    // First check if we have an optimized route from backend
    if (backendRoute?.optimized_route?.success && backendRoute?.optimized_route?.optimized_route) {
      const backendOptRoute = backendRoute.optimized_route.optimized_route;
      // Processing backend optimized route
      
      // Handle new route structure with route_deliveries
      if (backendOptRoute.route_deliveries && backendOptRoute.route_deliveries.length > 0) {
        const points: RoutePoint[] = [];
        const processedPickups = new Set<string>();
        
        // Sort by sequence_order
        const sortedDeliveries = [...backendOptRoute.route_deliveries].sort((a, b) => 
          (a.sequence_order || 0) - (b.sequence_order || 0)
        );
        
        // Create a set of delivery IDs that are in the route
        const routeDeliveryIds = new Set(sortedDeliveries.map(rd => rd.delivery));
        
        // Process deliveries in the optimized route first
        sortedDeliveries.forEach((routeDelivery) => {
          const deliveryId = String(routeDelivery.delivery);
          
          // Find the full delivery data from assigned_deliveries
          const fullDelivery = backendRoute.assigned_deliveries?.find(d => d.id === deliveryId);
          if (!fullDelivery) {
            console.warn('Full delivery data not found for:', deliveryId);
            return;
          }
          
          const order = fullDelivery.order;
          
          // Add pickup point if not already added and not already picked up
          const shouldShowPickup = fullDelivery.status !== 'picked_up' && 
                                   fullDelivery.status !== 'in_transit' && 
                                   fullDelivery.status !== 'delivered';
          
          if (shouldShowPickup && order.pickup_latitude && order.pickup_longitude) {
            const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;
            if (!processedPickups.has(pickupKey)) {
              points.push({
                id: `pickup-${pickupKey}`,
                order: {
                  ...order,
                  id: fullDelivery.id,
                  delivery_id: fullDelivery.id,
                  status: fullDelivery.status || 'assigned'
                } as Order,
                latitude: Number(order.pickup_latitude),
                longitude: Number(order.pickup_longitude),
                address: order.pickup_address || 'Pickup Location',
                type: 'pickup',
                sequenceNumber: points.length + 1,
                estimatedArrival: routeDelivery.estimated_arrival_time,
              });
              processedPickups.add(pickupKey);
            }
          }
          
          // Add delivery point
          if (order.delivery_latitude && order.delivery_longitude) {
            points.push({
              id: `delivery-${fullDelivery.id}`,
              order: {
                ...order,
                id: fullDelivery.id,
                delivery_id: fullDelivery.id,
                status: fullDelivery.status || 'assigned'
              } as Order,
              latitude: Number(order.delivery_latitude),
              longitude: Number(order.delivery_longitude),
              address: order.delivery_address || 'Delivery Location',
              type: 'delivery',
              sequenceNumber: points.length + 1,
              estimatedArrival: routeDelivery.estimated_arrival_time,
            });
          }
        });
        
        // Add any assigned deliveries that weren't included in the optimized route
        backendRoute.assigned_deliveries?.forEach((delivery) => {
          if (!routeDeliveryIds.has(delivery.id)) {
            // Adding delivery not in optimized route
            const order = delivery.order;
            
            // Add pickup point if not already added and not already picked up
            const shouldShowPickup = delivery.status !== 'picked_up' && 
                                     delivery.status !== 'in_transit' && 
                                     delivery.status !== 'delivered';
            
            if (shouldShowPickup && order.pickup_latitude && order.pickup_longitude) {
              const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;
              if (!processedPickups.has(pickupKey)) {
                points.push({
                  id: `pickup-${pickupKey}`,
                  order: {
                    ...order,
                    id: delivery.id,
                    delivery_id: delivery.id,
                    status: delivery.status || 'assigned'
                  } as Order,
                  latitude: Number(order.pickup_latitude),
                  longitude: Number(order.pickup_longitude),
                  address: order.pickup_address || 'Pickup Location',
                  type: 'pickup',
                  sequenceNumber: points.length + 1,
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
                  status: delivery.status || 'assigned'
                } as Order,
                latitude: Number(order.delivery_latitude),
                longitude: Number(order.delivery_longitude),
                address: order.delivery_address || 'Delivery Location',
                type: 'delivery',
                sequenceNumber: points.length + 1,
              });
            }
          }
        });
        
        return {
          points,
          totalDistance: Number(backendOptRoute.total_distance_km) * 1000, // Convert to meters
          totalTime: backendOptRoute.estimated_completion_time ? 
            new Date(backendOptRoute.estimated_completion_time).getTime() - Date.now() : 0,
          estimatedCompletion: backendOptRoute.estimated_completion_time || 
            new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Default to 1 hour
        };
      }
      
      // Fall back to old structure if route_deliveries is not available
      const deliveriesMap = new Map<string, BackendDeliveryData>();
      
      (backendRoute.assigned_deliveries || []).forEach(delivery => {
        deliveriesMap.set(delivery.id, delivery);
      });
      
      const points: RoutePoint[] = (backendOptRoute.route_steps || []).map((step, index) => {
        const delivery = deliveriesMap.get(step.delivery_id);
        if (!delivery) {
          console.warn('Delivery not found for route step:', step.delivery_id);
          return null;
        }
        
        // Skip pickup steps if already picked up
        if (step.action === 'pickup') {
          const shouldShowPickup = delivery.status !== 'picked_up' && 
                                   delivery.status !== 'in_transit' && 
                                   delivery.status !== 'delivered';
          if (!shouldShowPickup) {
            return null;
          }
        }
        
        return {
          id: `${step.delivery_id}-${step.action}`,
          order: {
            ...delivery.order,
            id: delivery.id,
            delivery_id: delivery.id,
            status: delivery.status || 'assigned'
          } as Order,
          latitude: step.latitude,
          longitude: step.longitude,
          address: step.address,
          type: step.action,
          sequenceNumber: index + 1,
          estimatedArrival: step.estimated_arrival,
          distanceFromPrevious: step.distance_from_previous,
          timeFromPrevious: step.time_from_previous,
        };
      }).filter(Boolean) as RoutePoint[];
      
      // Re-sequence the points after filtering
      points.forEach((point, index) => {
        point.sequenceNumber = index + 1;
      });
      
      return {
        points,
        totalDistance: backendOptRoute.total_distance || 0,
        totalTime: backendOptRoute.total_time || 0,
        estimatedCompletion: backendOptRoute.estimated_completion || '',
      };
    }
    
    // If no optimized route but we have deliveries, create a simple route
    // Check both assigned and available deliveries
    const deliveriesToProcess = backendRoute?.assigned_deliveries?.length > 0 
      ? backendRoute.assigned_deliveries 
      : backendRoute?.available_deliveries || [];
    
    // Backend optimization failed, creating local route
      
    if (deliveriesToProcess.length > 0) {
      // Creating optimized route locally with deliveries
      const points: RoutePoint[] = [];
      const processedPickups = new Set<string>();
      let sequenceNumber = 1;
      
      // Group deliveries by pickup location to avoid duplicate pickup stops
      const pickupGroups = new Map<string, BackendDeliveryData[]>();
      deliveriesToProcess.forEach((delivery) => {
        const order = delivery.order;
        
        // Skip if already picked up
        const shouldShowPickup = delivery.status !== 'picked_up' && 
                                 delivery.status !== 'in_transit' && 
                                 delivery.status !== 'delivered';
        
        // Processing delivery for grouping
        
        if (shouldShowPickup && order && order.pickup_latitude && order.pickup_longitude) {
          const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;
          if (!pickupGroups.has(pickupKey)) {
            pickupGroups.set(pickupKey, []);
          }
          pickupGroups.get(pickupKey)!.push(delivery);
        }
      });
      
      // Add pickup points (one per location)
      // Processing pickup groups
      pickupGroups.forEach((deliveries, pickupKey) => {
        const firstDelivery = deliveries[0];
        const order = firstDelivery.order;
        // Creating pickup point
        
        points.push({
          id: `pickup-${pickupKey}`,
          order: {
            ...order,
            id: firstDelivery.id,
            delivery_id: firstDelivery.id,
            status: firstDelivery.status || 'assigned'
          } as Order,
          latitude: Number(order.pickup_latitude),
          longitude: Number(order.pickup_longitude),
          address: order.pickup_address || 'Pickup Location',
          type: 'pickup',
          sequenceNumber: sequenceNumber++,
          batchOrders: deliveries.length > 1 ? deliveries.map(d => ({
            ...d.order,
            id: d.id,
            delivery_id: d.id,
            status: d.status || 'assigned'
          } as Order)) : undefined,
        });
      });
      
      // Add delivery points for each order
      deliveriesToProcess.forEach((delivery) => {
        const order = delivery.order;
        
        // Add delivery point if coordinates exist
        if (order.delivery_latitude && order.delivery_longitude) {
          points.push({
            id: `${delivery.id}-delivery`,
            order: {
              ...order,
              id: delivery.id,
              delivery_id: delivery.id,
              status: delivery.status || 'assigned'
            } as Order,
            latitude: Number(order.delivery_latitude),
            longitude: Number(order.delivery_longitude),
            address: order.delivery_address || 'Delivery Location',
            type: 'delivery',
            sequenceNumber: sequenceNumber++,
          });
        }
      });
      
      // Calculate rough estimates
      let totalDistance = 0;
      let totalTime = 0;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Simple distance calculation (rough estimate)
        const R = 6371; // Earth's radius in km
        const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
        const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c * 1000; // Convert to meters
        
        totalDistance += distance;
        const time = distance / 1000 * 2; // Rough estimate: 2 minutes per km
        totalTime += time;
        
        curr.distanceFromPrevious = distance;
        curr.timeFromPrevious = time * 60; // Convert to seconds
      }
      
      const result = {
        points,
        totalDistance,
        totalTime: totalTime * 60, // Convert to seconds
        estimatedCompletion: new Date(Date.now() + totalTime * 60 * 1000).toISOString(),
      };
      
      // Created route
      
      return result;
    }
    
    // No route created
    return null;
  }, [backendRoute]);

  // Load route segments when optimized route changes
  useEffect(() => {
    if (optimizedRoute?.points?.length > 0) {
      loadRouteSegments(optimizedRoute.points);
    }
  }, [optimizedRoute, loadRouteSegments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadBackendRoute(),
        loadDriverOrders(),
        refreshOrders()
      ]);
      
      // Recheck map availability after refresh
      try {
        const shouldShow = await mapProviderService.shouldShowMap();
        setShowMap(shouldShow);
      } catch (error) {
        console.error('Error checking map availability on refresh:', error);
        setShowMap(false);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBackendRoute, loadDriverOrders, refreshOrders]);

  const safeCoordinate = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return !isNaN(num) ? num : null;
  };

  const handleNavigateToOrder = (order: Order) => {
    const hasPickupLocation = !!(order.pickup_latitude && order.pickup_longitude);
    const hasDeliveryLocation = !!(order.delivery_latitude && order.delivery_longitude);
    
    let lat: number | null = null;
    let lng: number | null = null;
    
    if (order.status === 'assigned' || order.status === 'confirmed') {
      // Navigate to pickup
      if (hasPickupLocation) {
        // Pickup address: order.pickup_address
        lat = safeCoordinate(order.pickup_latitude);
        lng = safeCoordinate(order.pickup_longitude);
      }
    } else if (order.status === 'picked_up' || order.status === 'in_transit') {
      // Navigate to delivery
      if (hasDeliveryLocation) {
        // Delivery address: order.delivery_address
        lat = safeCoordinate(order.delivery_latitude);
        lng = safeCoordinate(order.delivery_longitude);
      }
    }
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(_err => {
        Alert.alert('Error', 'Unable to open navigation app');
      });
    } else {
      Alert.alert('Navigation Error', 'No valid coordinates available for this order');
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      await handleRefresh();
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const navigation = useNavigation();

  const handleViewOrderDetails = (order: Order) => {
    navigation.navigate('OrderDetails' as never, { orderId: order.id } as never);
  };

  const handleCallCustomer = (phoneNumber: string) => {
    if (phoneNumber && phoneNumber.trim()) {
      const url = `tel:${phoneNumber.trim()}`;
      Linking.openURL(url).catch(_err => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  };

  const getCustomerPhone = (order: Order): string => {
    return order.customer?.phone || 
           order.customer_details?.phone || 
           order.customer_details?.phone_number ||
           '';
  };

  const handleCallSupport = () => {
    // You can configure this with actual support number
    const supportNumber = '+1234567890'; // Replace with actual support number
    Linking.openURL(`tel:${supportNumber}`).catch(_err => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const handleMarkAsFailed = async (routePoint: RoutePoint) => {
    Alert.alert(
      'Mark as Failed',
      'Are you sure you want to mark this delivery as failed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Failed',
          style: 'destructive',
          onPress: async () => {
            setShowInfoPopup(false);
            await handleStatusUpdate(routePoint.order.id, 'failed');
          }
        }
      ]
    );
  };

  const filterUpcomingStops = (points: RoutePoint[]) => {
    return points.filter(p => {
      const isCompleted = p.order.status === 'delivered';
      if (isCompleted) return true;
      
      const currentStopIndex = optimizedRoute?.points?.findIndex(point => {
        const completed = point.order.status === 'delivered';
        return !completed;
      });
      
      const currentStopId = currentStopIndex >= 0 && optimizedRoute?.points?.[currentStopIndex] ? optimizedRoute.points[currentStopIndex].id : null;
      return p.id !== currentStopId;
    });
  };

  const getStatusUpdateOptions = (item: RoutePoint) => {
    if (item.type === 'pickup') {
      return [
        { status: 'picked_up', label: 'Mark as Picked Up', color: '#F59E0B', icon: 'checkmark-circle' as const },
      ];
    } else {
      return [
        { status: 'delivered', label: 'Mark as Delivered', color: '#10B981', icon: 'checkmark-circle' as const },
        { status: 'failed', label: 'Mark as Failed', color: '#EF4444', icon: 'close-circle' as const },
      ];
    }
  };

  const _renderRouteCard = ({ item, index, forceRegular = false }: { item: RoutePoint; index: number; forceRegular?: boolean }) => {
    const order = item.order;
    const isCompleted = order.status === 'delivered';
    const _isInProgress = order.status === 'picked_up' || order.status === 'in_transit';
    const isCurrent = !isCompleted && (index === 0 || optimizedRoute?.points?.slice(0, index).every(p => 
      p.order.status === 'delivered'
    ));
    
    const customerPhone = getCustomerPhone(order);
    const statusOptions = getStatusUpdateOptions(item);
    
    // Current stop gets special treatment only when not forced to be regular
    if (isCurrent && !forceRegular) {
      return (
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleViewOrderDetails(order)}
            activeOpacity={0.8}
          >
          <Card style={[styles.routeCard, styles.currentStopCard]}>
            {/* Current Stop Header */}
            <View style={styles.currentStopHeader}>
              <View style={styles.currentStopHeaderContent}>
                <View style={styles.currentStopIconContainer}>
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.currentStopTitleContainer}>
                  <Text style={styles.currentStopTitle}>CURRENT STOP</Text>
                  <Text style={styles.currentStopSubtitle}>
                    {item.type === 'pickup' ? 'Pickup' : 'Delivery'} - {order.order_number}
                  </Text>
                </View>
                <Text style={styles.currentStopSequence}>#{item.sequenceNumber}</Text>
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setCurrentStopForPopup(item);
                    setShowInfoPopup(true);
                  }}
                >
                  <Ionicons name="information-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Current Stop Content */}
            <View style={styles.currentStopContent}>
              {/* Address */}
              <View style={styles.currentStopAddressContainer}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.currentStopAddress} numberOfLines={3}>
                  {item.address}
                </Text>
              </View>

              {/* Customer Info */}
              <View style={styles.customerInfoContainer}>
                <View style={styles.customerInfo}>
                  <Ionicons name="person-outline" size={16} color="#666" />
                  <Text style={styles.customerName}>
                    {order.customer?.name || order.customer_details?.name || order.customer_name || 'Unknown Customer'}
                  </Text>
                </View>
                {customerPhone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCallCustomer(customerPhone)}
                  >
                    <Ionicons name="call" size={16} color="#007AFF" />
                    <Text style={styles.callButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Batch Orders Info */}
              {item.batchOrders && item.batchOrders.length > 1 && (
                <View style={styles.batchInfoContainer}>
                  <Ionicons name="layers" size={16} color="#F59E0B" />
                  <Text style={styles.batchInfoText}>
                    {item.batchOrders.length} orders at this location
                  </Text>
                </View>
              )}

              {/* ETA */}
              {item.estimatedArrival && (
                <View style={styles.etaContainer}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.etaText}>
                    ETA: {new Date(item.estimatedArrival).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.currentStopActions}>
                <TouchableOpacity
                  style={styles.navigateActionButton}
                  onPress={() => handleNavigateToOrder(order)}
                >
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  <Text style={styles.navigateActionText}>Navigate</Text>
                </TouchableOpacity>

                <View style={styles.statusButtonsContainer}>
                  {statusOptions.map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.statusActionButton, { 
                        backgroundColor: option.status === 'delivered' ? Design.colors.success :
                                        option.status === 'failed' ? Design.colors.error :
                                        Design.colors.textSecondary
                      }]}
                      onPress={() => handleStatusUpdate(order.id, option.status)}
                      disabled={updatingStatus}
                    >
                      <Text style={styles.statusActionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Card>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    // Ultra minimal route card for non-current stops
    return (
      <TouchableOpacity
        onPress={() => handleViewOrderDetails(order)}
        activeOpacity={0.8}
        style={styles.routeCardUltraMinimal}
      >
        <Text style={styles.sequenceNumberUltraMinimal}>
          {isCompleted ? '✓' : item.sequenceNumber}
        </Text>
        <Text style={[
          styles.routeCardTitleUltraMinimal,
          isCompleted && styles.routeCardTitleCompleted,
        ]}>
          {item.type === 'pickup' ? 'Pickup' : 'Delivery'}
        </Text>
        <Text style={[
          styles.routeCardAddressUltraMinimal,
          isCompleted && styles.routeCardAddressCompleted,
        ]} numberOfLines={1}>
          {item.address}
        </Text>
        {!isCompleted && (
          <TouchableOpacity
            style={styles.navigateButtonUltraMinimal}
            onPress={(e) => {
              e.stopPropagation();
              handleNavigateToOrder(order);
            }}
          >
            <Ionicons name="navigate" size={14} color={Design.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderAvailableOrderCard = ({ item }: { item: Order | BatchOrder }) => {
    if (isBatchOrder(item)) {
      return (
        <BatchOrderCard
          batch={item}
          onPress={() => {/* Handle batch order */}}
        />
      );
    }
    
    return (
      <EnhancedOrderCard
        order={item}
        onPress={() => handleViewOrderDetails(item)}
        onStatusUpdate={(newStatus) => handleStatusUpdate(item.id, newStatus)}
      />
    );
  };

  const renderEmptyRoute = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="map-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No orders in your route</Text>
      <Text style={styles.emptySubtext}>Check available orders to get started</Text>
    </View>
  );

  const renderEmptyAvailable = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No available orders</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  );

  // Get all coordinates for map display
  const mapMarkers = useMemo(() => {
    if (!optimizedRoute?.points) return [];
    
    return optimizedRoute.points.map((point, index) => ({
      id: point.id,
      coordinate: { latitude: point.latitude, longitude: point.longitude },
      title: `${index + 1}. ${point.type === 'pickup' ? 'Pickup' : 'Delivery'}`,
      description: point.address,
      pinColor: point.type === 'pickup' ? 'green' : 'red',
    }));
  }, [optimizedRoute]);

  // Combine all route segments into a single polyline
  const _routePolyline = useMemo(() => {
    const allCoordinates: {latitude: number, longitude: number}[] = [];
    routeSegments.forEach(segment => {
      allCoordinates.push(...segment.coordinates);
    });
    return allCoordinates;
  }, [routeSegments]);

  // Calculate map region to fit all points
  const _mapRegion = useMemo(() => {
    if (mapMarkers.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const lats = mapMarkers?.map(m => m.coordinate.latitude) || [];
    const lngs = mapMarkers?.map(m => m.coordinate.longitude) || [];
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.05,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.05,
    };
  }, [mapMarkers]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      {/* Header - Dashboard Style */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Navigation</Text>
        {driver && (
          <View style={styles.driverInfo}>
            <Ionicons name="person-circle" size={20} color="#666" />
            <Text style={styles.driverName}>{driver.firstName} {driver.lastName}</Text>
          </View>
        )}
      </View>

      {/* Tab Selector - Dashboard Style */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'route' && styles.activeTab]}
          onPress={() => setSelectedTab('route')}
        >
          <Text style={[styles.tabText, selectedTab === 'route' && styles.activeTabText]}>
            My Route ({routeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'available' && styles.activeTab]}
          onPress={() => setSelectedTab('available')}
        >
          <Text style={[styles.tabText, selectedTab === 'available' && styles.activeTabText]}>
            Available ({availableOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Dashboard Style */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || optimizingRoute}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'route' ? (
          <>
            {!optimizedRoute || !optimizedRoute.points || optimizedRoute.points.length === 0 ? (
              renderEmptyRoute()
            ) : (
              <>
                {/* Current Stop Card - Dashboard Style */}
                {(() => {
              const currentStopIndex = optimizedRoute?.points?.findIndex(p => {
                const isCompleted = p.order.status === 'delivered';
                return !isCompleted;
              });
              const currentStop = currentStopIndex >= 0 ? optimizedRoute?.points?.[currentStopIndex] : null;
              
              // Current stop data
              
              return currentStop ? (
                <View style={styles.currentStopContainer}>
                  <Text style={styles.sectionTitle}>Current Stop</Text>
                  <View style={styles.currentStopCard}>
                    <TouchableOpacity 
                      style={styles.currentStopHeader}
                      onPress={() => handleViewOrderDetails(currentStop.order)}
                    >
                      <View style={styles.currentStopHeaderLeft}>
                        <View style={[styles.sequenceCircle, styles.sequenceCircleLarge]}>
                          <Text style={styles.sequenceCircleTextLarge}>{currentStop.sequenceNumber}</Text>
                        </View>
                        <View style={styles.currentStopHeaderInfo}>
                          <View style={styles.currentStopBadgeRow}>
                            <View style={[styles.typeBadge, currentStop.type === 'pickup' ? styles.typeBadgePickup : styles.typeBadgeDelivery]}>
                              <Text style={styles.typeBadgeText}>
                                {currentStop.type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.orderNumberLarge}>Order #{currentStop.order?.order_number || 'N/A'}</Text>
                          <Text style={styles.customerNameLarge}>
                            {currentStop.order?.customer?.name || currentStop.order?.customer_details?.name || 'Customer'}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Design.colors.textTertiary} />
                    </TouchableOpacity>

                    {/* Address Section */}
                    <View style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                          <Ionicons name="location" size={20} color={Design.colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>
                            {currentStop.type === 'pickup' ? 'Pickup Address' : 'Delivery Address'}
                          </Text>
                          <Text style={styles.infoValueLarge}>{currentStop.address}</Text>
                        </View>
                      </View>
                    </View>


                    {/* Package Details */}
                    {currentStop.order?.items && currentStop.order.items.length > 0 && (
                      <View style={styles.infoSection}>
                        <Text style={styles.sectionSubtitle}>Package Contents</Text>
                        <View style={styles.itemsList}>
                          {currentStop.order.items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Delivery Notes */}
                    {currentStop.order?.delivery_notes && (
                      <View style={styles.infoSection}>
                        <View style={styles.notesContainer}>
                          <Ionicons name="document-text-outline" size={18} color={Design.colors.textSecondary} />
                          <View style={styles.notesContent}>
                            <Text style={styles.notesLabel}>Delivery Notes</Text>
                            <Text style={styles.notesText}>{currentStop.order.delivery_notes}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                      <View style={styles.mainActionsRow}>
                        {/* Phone Button */}
                        {getCustomerPhone(currentStop.order) && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.phoneButton]}
                            onPress={() => handleCallCustomer(getCustomerPhone(currentStop.order))}
                          >
                            <Ionicons name="call" size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                        
                        {/* Navigate Button */}
                        <TouchableOpacity
                          style={[styles.actionButton, styles.navigationButton]}
                          onPress={() => handleNavigateToOrder(currentStop.order)}
                        >
                          <Ionicons name="navigate" size={20} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Navigate</Text>
                        </TouchableOpacity>
                        
                        {/* Primary Status Button */}
                        {(() => {
                          const primaryAction = getStatusUpdateOptions(currentStop)[0];
                          return primaryAction ? (
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                { backgroundColor: primaryAction.color }
                              ]}
                              onPress={() => handleStatusUpdate(currentStop.order.id, primaryAction.status)}
                            >
                              <Ionicons name={primaryAction.icon} size={20} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>{primaryAction.label}</Text>
                            </TouchableOpacity>
                          ) : null;
                        })()}
                      </View>
                      
                      {/* Additional Status Options */}
                      {getStatusUpdateOptions(currentStop).length > 1 && (
                        <View style={styles.secondaryActionsRow}>
                          {getStatusUpdateOptions(currentStop).slice(1).map((option, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.secondaryActionButton,
                                { backgroundColor: option.color }
                              ]}
                              onPress={() => handleStatusUpdate(currentStop.order.id, option.status)}
                            >
                              <Ionicons name={option.icon} size={18} color="#FFFFFF" />
                              <Text style={styles.secondaryActionButtonText}>{option.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ) : null;
            })()}

            {/* Route Overview Card */}
            {optimizedRoute?.points?.length > 0 && (
              <View style={styles.routeOverviewContainer}>
                <Text style={styles.sectionTitle}>Route Summary</Text>
                <Card style={styles.routeOverviewCard}>
                <View style={styles.routeOverviewHeader}>
                  <Text style={styles.routeOverviewTitle}>Route Overview</Text>
                  <View style={styles.routeProgress}>
                    <Text style={styles.routeProgressText}>
                      {optimizedRoute.points?.filter(p => 
                        p.order.status === 'delivered'
                      ).length || 0} / {optimizedRoute.points?.length || 0}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.routeStats}>
                  <View style={styles.routeStatItem}>
                    <Text style={styles.routeStatNumber}>{optimizedRoute.points?.length || 0}</Text>
                    <Text style={styles.routeStatLabel}>Stops</Text>
                  </View>
                  <View style={styles.routeStatItem}>
                    <Text style={styles.routeStatNumber}>{((optimizedRoute.totalDistance || 0) / 1000).toFixed(1)}</Text>
                    <Text style={styles.routeStatLabel}>km</Text>
                  </View>
                  <View style={styles.routeStatItem}>
                    <Text style={styles.routeStatNumber}>{Math.round((optimizedRoute.totalTime || 0) / 60)}</Text>
                    <Text style={styles.routeStatLabel}>min</Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${(optimizedRoute.points?.filter(p => 
                            p.order.status === 'delivered'
                          ).length || 0) / (optimizedRoute.points?.length || 1) * 100}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </Card>
              </View>
            )}

            {/* Upcoming Stops Card */}
            {optimizedRoute?.points && filterUpcomingStops(optimizedRoute.points).length > 0 && (
              <Card style={styles.upcomingStopsCard}>
                <Text style={styles.upcomingStopsTitle}>Upcoming Stops</Text>
                {filterUpcomingStops(optimizedRoute.points)
                  .map((item, _index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.upcomingStopItem}
                      onPress={() => handleViewOrderDetails(item.order)}
                    >
                      <View style={styles.upcomingStopNumber}>
                        <Text style={styles.upcomingStopNumberText}>
                          {item.order.status === 'delivered' ? '✓' : item.sequenceNumber}
                        </Text>
                      </View>
                      <View style={styles.upcomingStopInfo}>
                        <Text style={[
                          styles.upcomingStopTitle,
                          item.order.status === 'delivered' && styles.upcomingStopTitleCompleted
                        ]}>
                          {item.type === 'pickup' ? 'Pickup' : 'Delivery'} - {item.order.order_number}
                        </Text>
                        <Text style={styles.upcomingStopAddress} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                      {item.order.status !== 'delivered' && (
                        <TouchableOpacity
                          style={styles.upcomingStopNavigate}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleNavigateToOrder(item.order);
                          }}
                        >
                          <Ionicons name="navigate" size={16} color="#007AFF" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}
              </Card>
            )}
              </>
            )}
          </>
        ) : (
          <FlatList
            data={availableOrders}
            renderItem={renderAvailableOrderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#4F46E5']}
                tintColor="#4F46E5"
              />
            }
            ListEmptyComponent={renderEmptyAvailable}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      {/* Info Popup Modal */}
      {showInfoPopup && currentStopForPopup && (
        <TouchableOpacity 
          style={styles.popupOverlay} 
          activeOpacity={1}
          onPress={() => setShowInfoPopup(false)}
        >
          <TouchableOpacity 
            style={styles.popupContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Order Options</Text>
              <TouchableOpacity onPress={() => setShowInfoPopup(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.popupOption}
              onPress={() => {
                setShowInfoPopup(false);
                handleMarkAsFailed(currentStopForPopup);
              }}
            >
              <View style={styles.popupOptionIcon}>
                <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
              </View>
              <View style={styles.popupOptionContent}>
                <Text style={styles.popupOptionTitle}>Mark as Failed</Text>
                <Text style={styles.popupOptionDescription}>
                  Report this delivery as failed
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.popupOption}
              onPress={() => {
                setShowInfoPopup(false);
                handleCallSupport();
              }}
            >
              <View style={styles.popupOptionIcon}>
                <Ionicons name="call-outline" size={24} color="#007AFF" />
              </View>
              <View style={styles.popupOptionContent}>
                <Text style={styles.popupOptionTitle}>Call Support</Text>
                <Text style={styles.popupOptionDescription}>
                  Get help from customer support
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Floating QR Button */}
      <FloatingQRButton onScanResult={handleQRScanResult} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: Design.spacing[4],
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: Design.typography.title2.fontSize,
    fontWeight: Design.typography.title2.fontWeight,
    color: Design.colors.textPrimary,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  driverName: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textSecondary,
    fontWeight: Design.typography.footnote.fontWeight,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Design.colors.backgroundTertiary,
    borderRadius: Design.borderRadius.md,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    padding: Design.spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: Design.spacing[2],
    alignItems: 'center',
    borderRadius: Design.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: Design.colors.background,
    ...Design.shadows.small,
  },
  tabText: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textSecondary,
    fontWeight: Design.typography.footnote.fontWeight,
  },
  activeTabText: {
    color: Design.colors.textPrimary,
    fontWeight: Design.typography.subheadline.fontWeight,
  },
  currentStopContainer: {
    paddingHorizontal: Design.spacing[4],
    paddingTop: Design.spacing[2],
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  progressBarContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: Design.colors.backgroundTertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 0,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Design.colors.primary,
    borderRadius: 2,
  },
  routeProgressText: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: Design.spacing[2],
  },
  listContent: {
    paddingVertical: Design.spacing[2],
    paddingHorizontal: Design.spacing[4],
  },
  routeCard: {
    marginVertical: Design.spacing[2],
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.md,
    ...Design.shadows.small,
  },
  routeCardUltraMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[2],
    paddingHorizontal: Design.spacing[4],
    borderBottomWidth: 0.5,
    borderBottomColor: Design.colors.border,
  },
  sequenceNumberUltraMinimal: {
    fontSize: Design.typography.caption1.fontSize,
    fontWeight: Design.typography.label.fontWeight,
    color: Design.colors.textSecondary,
    width: 20,
    textAlign: 'center',
    marginRight: Design.spacing[3],
  },
  routeCardTitleUltraMinimal: {
    fontSize: Design.typography.caption1.fontSize,
    fontWeight: Design.typography.label.fontWeight,
    color: Design.colors.textSecondary,
    width: 60,
    marginRight: Design.spacing[2],
  },
  routeCardAddressUltraMinimal: {
    flex: 1,
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textPrimary,
    marginRight: Design.spacing[2],
  },
  navigateButtonUltraMinimal: {
    padding: Design.spacing[1],
  },
  routeCardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  routeCardAddressCompleted: {
    color: '#999',
  },
  currentStopCard: {
    marginBottom: Design.spacing[4],
    borderWidth: 2,
    borderColor: Design.colors.primary,
    ...Design.shadows.medium,
  },
  currentStopHeader: {
    backgroundColor: Design.colors.primary,
    paddingVertical: Design.spacing[4],
    paddingHorizontal: Design.spacing[4],
  },
  currentStopHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentStopIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  currentStopTitleContainer: {
    flex: 1,
  },
  currentStopTitle: {
    fontSize: Design.typography.caption2.fontSize,
    fontWeight: Design.typography.overline.fontWeight,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  currentStopSubtitle: {
    fontSize: Design.typography.callout.fontSize,
    fontWeight: Design.typography.callout.fontWeight,
    color: '#FFFFFF',
  },
  currentStopSequence: {
    fontSize: Design.typography.title3.fontSize,
    fontWeight: Design.typography.title3.fontWeight,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  currentStopContent: {
    padding: 16,
  },
  currentStopAddressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  currentStopAddress: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  customerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  batchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  batchInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  etaText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  currentStopActions: {
    gap: 12,
  },
  navigateActionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  navigateActionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusButtonsContainer: {
    gap: 8,
  },
  statusActionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  
  // Dashboard-style components
  scrollContent: {
    paddingBottom: Design.spacing[8],
  },
  sectionTitle: {
    fontSize: Design.typography.title3.fontSize,
    fontWeight: Design.typography.title3.fontWeight,
    color: Design.colors.textPrimary,
    marginBottom: Design.spacing[3],
    marginHorizontal: Design.spacing[4],
  },
  
  // Current Stop Styles
  currentStopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentStopHeaderInfo: {
    marginLeft: Design.spacing[3],
    flex: 1,
  },
  currentStopBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[1],
  },
  sequenceCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Design.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sequenceCircleLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sequenceCircleTextLarge: {
    fontSize: Design.typography.title3.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
  typeBadge: {
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.sm,
  },
  typeBadgePickup: {
    backgroundColor: Design.colors.info,
  },
  typeBadgeDelivery: {
    backgroundColor: Design.colors.primary,
  },
  typeBadgeText: {
    fontSize: Design.typography.caption2.fontSize,
    fontWeight: Design.typography.overline.fontWeight,
    color: Design.colors.textInverse,
    letterSpacing: 0.5,
  },
  orderNumberLarge: {
    fontSize: Design.typography.callout.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textPrimary,
    marginTop: Design.spacing[1],
  },
  customerNameLarge: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  
  // Info Sections
  infoSection: {
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Design.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  infoValueLarge: {
    fontSize: Design.typography.callout.fontSize,
    color: Design.colors.textPrimary,
    lineHeight: Design.typography.callout.lineHeight,
  },
  
  // Phone Section
  
  // Package Items
  sectionSubtitle: {
    fontSize: Design.typography.footnote.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textPrimary,
    marginBottom: Design.spacing[2],
  },
  itemsList: {
    marginTop: Design.spacing[2],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Design.spacing[1],
  },
  itemName: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textPrimary,
    flex: 1,
  },
  itemQuantity: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textSecondary,
    marginLeft: Design.spacing[2],
  },
  
  // Notes
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Design.colors.backgroundSecondary,
    padding: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
  },
  notesContent: {
    flex: 1,
    marginLeft: Design.spacing[2],
  },
  notesLabel: {
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textPrimary,
    lineHeight: Design.typography.footnote.lineHeight * 1.3,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    padding: Design.spacing[4],
  },
  mainActionsRow: {
    flexDirection: 'row',
    gap: Design.spacing[2],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    gap: Design.spacing[2],
  },
  navigationButton: {
    backgroundColor: Design.colors.primary,
  },
  phoneButton: {
    backgroundColor: Design.colors.success,
    width: 56,
    flex: 0,
  },
  actionButtonText: {
    fontSize: Design.typography.callout.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Design.spacing[2],
    marginTop: Design.spacing[2],
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.md,
    gap: Design.spacing[1],
  },
  secondaryActionButtonText: {
    fontSize: Design.typography.footnote.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
  
  // Status Update Section
  
  routeOverviewContainer: {
    marginBottom: Design.spacing[4],
  },
  routeOverviewCard: {
    marginHorizontal: Design.spacing[4],
    padding: Design.spacing[4],
  },
  routeOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Design.spacing[4],
  },
  routeOverviewTitle: {
    fontSize: Design.typography.headline.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textPrimary,
  },
  routeProgress: {
    alignItems: 'center',
  },
  routeStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  routeStatNumber: {
    fontSize: Design.typography.title3.fontSize,
    fontWeight: Design.typography.title3.fontWeight,
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  routeStatLabel: {
    fontSize: Design.typography.caption2.fontSize,
    color: Design.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingStopsCard: {
    marginBottom: Design.spacing[4],
  },
  upcomingStopsTitle: {
    fontSize: Design.typography.headline.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textPrimary,
  },
  upcomingStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Design.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  upcomingStopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Design.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  upcomingStopNumberText: {
    fontSize: Design.typography.caption1.fontSize,
    fontWeight: Design.typography.label.fontWeight,
    color: Design.colors.textSecondary,
  },
  upcomingStopInfo: {
    flex: 1,
    marginRight: Design.spacing[2],
  },
  upcomingStopTitle: {
    fontSize: Design.typography.footnote.fontSize,
    fontWeight: Design.typography.label.fontWeight,
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  upcomingStopTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Design.colors.textSecondary,
  },
  upcomingStopAddress: {
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textSecondary,
    lineHeight: Design.typography.caption1.lineHeight,
  },
  upcomingStopNavigate: {
    padding: Design.spacing[2],
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Design.colors.text,
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  popupOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Design.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  popupOptionContent: {
    flex: 1,
  },
  popupOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Design.colors.text,
    marginBottom: 2,
  },
  popupOptionDescription: {
    fontSize: 14,
    color: Design.colors.textSecondary,
  },
});

export default RouteNavigationScreen;