import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { Order } from '../types';
import { realtimeService } from '../services/realtimeService';
import { locationService } from '../services/locationService';
import { soundService } from '../services/soundService';
import { useAuth } from '../contexts/AuthContext';

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
  const { isLoggedIn } = useAuth();
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'polling' | 'websocket'>('polling');
  
  const appStateRef = useRef(AppState.currentState);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (isLoggedIn) {
      initializeServices();
      setupAppStateListener();
    } else {
      // Clean up when user logs out
      cleanup();
      initialized.current = false;
    }
    
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const initializeServices = useCallback(async () => {
    if (!isLoggedIn || initialized.current) {
      console.log('🚫 useRealtimeOrders: Skipping initialization - not logged in or already initialized');
      return;
    }
    
    try {
      console.log('🔄 useRealtimeOrders: Setting up callbacks for realtime service');
      
      // Don't initialize directly - the AuthContext already enables initialization
      // The OrderContext will handle the actual initialization
      // Just set up callbacks
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
      
      // Mark as initialized
      initialized.current = true;
      
      console.log('✅ useRealtimeOrders: Successfully set up callbacks and state');
    } catch (error) {
      console.error('❌ useRealtimeOrders: Failed to set up realtime services:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

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
        
        // Show notification after state update
        setTimeout(() => showOrderNotification(order), 0);
        
        return updatedOrders;
      }
      return prevOrders;
    });
  }, []); // Keep empty dependencies since showOrderNotification is now stable

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
    
    // Safely extract customer name and address with fallbacks
    const customerName = order.customer?.name || 'Unknown Customer';
    const deliveryAddress = order.deliveryAddress?.street || 'Address not specified';
    const orderTotal = order.total ? order.total.toFixed(2) : '0.00';
    
    Alert.alert(
      '🚚 New Delivery Order!',
      `Order #${order.orderNumber}\nCustomer: ${customerName}\nTotal: $${orderTotal}\nDelivery Address: ${deliveryAddress}`,
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
     
  }, []); // Remove dependencies since acceptOrder and declineOrder are now stable

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      // Use functional state update to avoid dependency on newOrders
      let targetOrder: Order | undefined;
      setNewOrders(currentOrders => {
        targetOrder = currentOrders.find(o => o.id === orderId);
        return currentOrders; // Don't modify state yet
      });
      
      const deliveryId = targetOrder?.deliveryId || orderId;
      
      // Call API to accept the order
      const { apiService } = await import('../services/api');
      const response = await apiService.acceptOrder(deliveryId);
      
      if (response.success) {
        // Remove from new orders list after successful API call
        setNewOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        
        // Mark order as handled in realtime service
        realtimeService.markOrderAsHandled(orderId);
        
        // Play success sound
        soundService.playSuccessSound();
        
        Alert.alert('Order Accepted', 'You have successfully accepted the delivery order.');
      } else {
        throw new Error(response.error || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Failed to accept order:', error);
      Alert.alert('Error', 'Failed to accept the order. Please try again.');
    }
  }, []); // Remove newOrders dependency

  const declineOrder = useCallback(async (orderId: string) => {
    try {
      // Use functional state update to avoid dependency on newOrders
      let targetOrder: Order | undefined;
      setNewOrders(currentOrders => {
        targetOrder = currentOrders.find(o => o.id === orderId);
        return currentOrders; // Don't modify state yet
      });
      
      const deliveryId = targetOrder?.deliveryId || orderId;
      
      // Call API to decline the order
      const { apiService } = await import('../services/api');
      const response = await apiService.declineOrder(deliveryId);
      
      if (response.success) {
        // Remove from new orders list after successful API call
        setNewOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        
        // Mark order as handled in realtime service
        realtimeService.markOrderAsHandled(orderId);
        
        // Play error sound for decline
        soundService.playErrorSound();
        
        Alert.alert('Order Declined', 'You have declined the delivery order.');
      } else {
        throw new Error(response.error || 'Failed to decline order');
      }
    } catch (error) {
      console.error('Failed to decline order:', error);
      Alert.alert('Error', 'Failed to decline the order. Please try again.');
    }
  }, []); // Remove newOrders dependency

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