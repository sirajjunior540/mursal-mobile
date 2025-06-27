import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { Order } from '../types';
import { realtimeService } from '../services/realtimeService';
import { locationService } from '../services/locationService';
import { soundService } from '../services/soundService';

export interface UseRealtimeOrdersReturn {
  newOrders: Order[];
  isConnected: boolean;
  isLocationTracking: boolean;
  connectionMode: 'polling' | 'websocket';
  clearNewOrders: () => void;
  startServices: () => void;
  stopServices: () => void;
  acceptOrder: (orderId: string) => void;
  declineOrder: (orderId: string) => void;
}

export const useRealtimeOrders = (): UseRealtimeOrdersReturn => {
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'polling' | 'websocket'>('polling');
  
  const appStateRef = useRef(AppState.currentState);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeServices();
    setupAppStateListener();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeServices = useCallback(async () => {
    try {
      // Initialize realtime service
      await realtimeService.initialize();
      
      // Set up callbacks
      realtimeService.setCallbacks({
        onNewOrder: handleNewOrder,
        onOrderUpdate: handleOrderUpdate,
        onConnectionChange: setIsConnected,
        onError: handleRealtimeError,
      });

      // Get current configuration
      const config = realtimeService.getConfig();
      setConnectionMode(config.mode);
      
      // Check current states
      setIsLocationTracking(locationService.isLocationTracking());
      setIsConnected(realtimeService.isConnectedToServer());
      
      // Start services if enabled
      if (config.enabled) {
        realtimeService.start();
      }
    } catch (error) {
      console.error('Failed to initialize realtime services:', error);
    }
  }, []);

  const setupAppStateListener = useCallback(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousState === 'background' && nextAppState === 'active') {
        // App came to foreground, resume services
        const config = realtimeService.getConfig();
        if (config.enabled) {
          realtimeService.start();
        }
        if (locationService.isLocationTracking()) {
          // Location service should continue running in background
          setIsLocationTracking(true);
        }
      } else if (nextAppState === 'background') {
        // App went to background
        // Keep location tracking but you might want to adjust intervals
        // WebSocket might disconnect, polling should continue
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  const handleNewOrder = useCallback((order: Order) => {
    console.log('New order received:', order.id);
    
    setNewOrders(prevOrders => {
      // Check if order already exists
      const exists = prevOrders.some(existing => existing.id === order.id);
      if (!exists) {
        const updatedOrders = [...prevOrders, order];
        
        // Show notification
        showOrderNotification(order);
        
        return updatedOrders;
      }
      return prevOrders;
    });
  }, []);

  const handleOrderUpdate = useCallback((order: Order) => {
    console.log('Order update received:', order.id);
    
    setNewOrders(prevOrders => 
      prevOrders.map(existing => 
        existing.id === order.id ? order : existing
      )
    );
  }, []);

  const handleRealtimeError = useCallback((error: string) => {
    console.error('Realtime service error:', error);
    
    // Don't show too many error alerts
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    notificationTimeoutRef.current = setTimeout(() => {
      Alert.alert(
        'Connection Issue',
        'There was a problem with the real-time connection. Please check your internet connection.',
        [{ text: 'OK' }]
      );
      notificationTimeoutRef.current = null;
    }, 5000); // Throttle error notifications
  }, []);

  const showOrderNotification = useCallback((order: Order) => {
    // Play notification sound and vibration
    soundService.playOrderNotification();
    
    Alert.alert(
      '🚚 New Delivery Order!',
      `Order #${order.orderNumber}\nCustomer: ${order.customer.name}\nTotal: $${order.total.toFixed(2)}\nDelivery Address: ${order.deliveryAddress.street}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => declineOrder(order.id),
        },
        {
          text: 'Accept',
          onPress: () => acceptOrder(order.id),
        },
      ],
      { cancelable: false }
    );
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      // Remove from new orders list
      setNewOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderId)
      );
      
      // You can call API to accept the order here
      // await apiService.acceptOrder(orderId);
      
      // Play success sound
      soundService.playSuccessSound();
      
      Alert.alert('Order Accepted', 'You have successfully accepted the delivery order.');
    } catch (error) {
      console.error('Failed to accept order:', error);
      Alert.alert('Error', 'Failed to accept the order. Please try again.');
    }
  }, []);

  const declineOrder = useCallback(async (orderId: string) => {
    try {
      // Remove from new orders list
      setNewOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderId)
      );
      
      // You can call API to decline the order here
      // await apiService.declineOrder(orderId);
      
      // Play error sound for decline
      soundService.playErrorSound();
      
      Alert.alert('Order Declined', 'You have declined the delivery order.');
    } catch (error) {
      console.error('Failed to decline order:', error);
      Alert.alert('Error', 'Failed to decline the order. Please try again.');
    }
  }, []);

  const clearNewOrders = useCallback(() => {
    setNewOrders([]);
  }, []);

  const startServices = useCallback(async () => {
    try {
      // Start location tracking
      await locationService.startLocationTracking();
      setIsLocationTracking(true);
      
      // Start realtime service
      realtimeService.start();
      
      Alert.alert('Services Started', 'Location tracking and real-time orders are now active.');
    } catch (error) {
      console.error('Failed to start services:', error);
      Alert.alert('Error', 'Failed to start services. Please check your permissions and try again.');
    }
  }, []);

  const stopServices = useCallback(() => {
    try {
      // Stop location tracking
      locationService.stopLocationTracking();
      setIsLocationTracking(false);
      
      // Stop realtime service
      realtimeService.stop();
      setIsConnected(false);
      
      Alert.alert('Services Stopped', 'Location tracking and real-time orders have been disabled.');
    } catch (error) {
      console.error('Failed to stop services:', error);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Don't stop services on cleanup - let user control them
    // The services should persist across screen changes
  }, []);

  return {
    newOrders,
    isConnected,
    isLocationTracking,
    connectionMode,
    clearNewOrders,
    startServices,
    stopServices,
    acceptOrder,
    declineOrder,
  };
};