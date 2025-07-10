/**
 * Mursal Driver App - Production Ready Mobile Application
 * Professional splash screen → authentication → main app flow
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Alert, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Infrastructure
import { logger } from './src/infrastructure/logging/logger';
import ErrorBoundary from './src/components/ErrorBoundary';
import ContextErrorBoundary from './src/components/ContextErrorBoundary';
import { NetworkStatus } from './src/components/NetworkStatus';
import IncomingOrderModal from './src/components/IncomingOrderModal';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import AcceptedOrdersScreen from './src/screens/AcceptedOrdersScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RouteNavigationScreen from './src/screens/RouteNavigationScreen';

// Context providers
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OrderProvider, useOrders } from './src/features/orders/context/OrderProvider';
import { DriverProvider } from './src/contexts/DriverContext';
import { TenantProvider } from './src/contexts/TenantContext';
import { Order } from './src/types';

// Services and utilities
import { theme } from './src/shared/styles/theme';
import { locationService } from './src/services/locationService';
import { requestNotificationPermissions } from './src/utils/permissions';
import { notificationService } from './src/services/notificationService';
import { haptics } from './src/utils/haptics';
import { ENV, getTenantHost } from './src/config/environment';

// Environment configuration
const API_BASE_URL = ENV.API_BASE_URL;
const WEBSOCKET_URL = ENV.WS_BASE_URL;

// Type definitions
interface RootStackParamList extends Record<string, object | undefined> {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  OrderDetails: { orderId: string; autoNavigate?: boolean };
}

interface TabParamList extends Record<string, object | undefined> {
  Dashboard: undefined;
  AcceptedOrders: undefined;
  OngoingDelivery: undefined;
  RouteNavigation: undefined;
  History: undefined;
  Profile: undefined;
}

// Create navigation stacks
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// App initialization state
interface AppInitState {
  showSplash: boolean;
  isInitialized: boolean;
}

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'RouteNavigation') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'AcceptedOrders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 83,
          paddingBottom: 34,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="RouteNavigation" 
        component={RouteNavigationScreen} 
        options={{ tabBarLabel: 'Available' }}
      />
      <Tab.Screen 
        name="AcceptedOrders" 
        component={AcceptedOrdersScreen} 
        options={{ tabBarLabel: 'My Orders' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ tabBarLabel: 'Earnings' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Incoming Order Modal Manager Component
const IncomingOrderManager = () => {
  const { 
    acceptOrder, 
    declineOrder, 
    setOrderNotificationCallback
  } = useOrders();
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Set up the notification callback
    setOrderNotificationCallback((order: Order) => {
      setIncomingOrder(order);
      setShowModal(true);
    });

    // Cleanup
    return () => {
      setOrderNotificationCallback(null);
    };
  }, [setOrderNotificationCallback]);

  const handleAccept = async (_orderId: string) => {
    try {
      const success = await acceptOrder(_orderId);
      if (success) {
        setShowModal(false);
        setIncomingOrder(null);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };
  
  const handleAcceptRoute = async (routeId: string) => {
    try {
      // For route acceptance, we accept the entire batch as one unit
      const success = await acceptOrder(routeId);
      
      if (success) {
        setShowModal(false);
        setIncomingOrder(null);
        Alert.alert('Success', 'Route accepted successfully!');
      } else {
        Alert.alert('Error', 'Failed to accept route. Please try again.');
      }
    } catch (error) {
      logger.error('Error accepting route:', error as Error);
      Alert.alert('Error', 'Failed to accept route. Please try again.');
    }
  };

  const handleDecline = async (_orderId: string) => {
    try {
      await declineOrder(_orderId);
      setShowModal(false);
      setIncomingOrder(null);
    } catch (error) {
      console.error('Error declining order:', error);
    }
  };

  const handleSkip = (_orderId: string) => {
    setShowModal(false);
    setIncomingOrder(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setIncomingOrder(null);
  };

  return (
    <IncomingOrderModal
      visible={showModal}
      order={incomingOrder}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onSkip={handleSkip}
      onClose={handleClose}
      onAcceptRoute={handleAcceptRoute}
      timerDuration={30}
    />
  );
};

// Main navigation container with authentication flow
const AppNavigator = () => {
  const { isLoading, isLoggedIn } = useAuth();
  const [appInitState, setAppInitState] = useState<AppInitState>({
    showSplash: true,
    isInitialized: false,
  });

  // Handle splash screen completion
  const handleSplashComplete = () => {
    logger.info('Splash screen animation completed');
    setAppInitState({
      showSplash: false,
      isInitialized: true,
    });
  };

  // Debug authentication state
  logger.debug('Auth State', { isLoading, isLoggedIn, appInitState });

  // Show splash screen first
  if (appInitState.showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  // Show loading during auth check (after splash)
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Silent loading - no UI needed as it's very brief after splash */}
      </View>
    );
  }

  logger.debug('Rendering main navigation', { isLoggedIn });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isLoggedIn ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              gestureEnabled: false, // Prevent swipe back on login
            }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="OrderDetails" 
              component={OrderDetailsScreen} 
              options={{ 
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Root component with providers
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  
  // Initialize app permissions and services
  useEffect(() => {
    const initializeApp = async () => {
      logger.info('🚀 Initializing Mursal Driver App');
      
      try {
        // Request location permissions
        logger.debug('📍 Requesting location permissions');
        const locationPermissionGranted = await locationService.requestLocationPermissions();
        
        if (locationPermissionGranted) {
          logger.info('✅ Location permissions granted');
        } else {
          logger.warn('⚠️ Location permissions denied');
          Alert.alert(
            'Location Required',
            'This app requires location access to track deliveries. Please enable location permissions in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                logger.debug('Opening device settings');
              }}
            ]
          );
        }
        
        // Request notification permissions
        logger.debug('🔔 Requesting notification permissions');
        const notificationPermissionGranted = await requestNotificationPermissions();
        
        if (notificationPermissionGranted) {
          logger.info('✅ Notification permissions granted');
          
          // Enable background notifications
          logger.debug('📱 Enabling background notifications');
          const backgroundEnabled = await notificationService.enableBackgroundNotifications();
          
          if (backgroundEnabled) {
            logger.info('✅ Background notifications enabled');
            
            // Set up notification callbacks for background actions
            notificationService.setNotificationCallbacks({
              onOrderReceived: (orderId: string, action: 'accept' | 'decline') => {
                logger.info(`🔔 Background notification action: ${action} for order ${orderId}`);
              },
              onNavigateToOrder: (orderId: string) => {
                logger.info(`🔔 Navigate to order from background notification: ${orderId}`);
              }
            });
          } else {
            logger.error('❌ Failed to enable background notifications');
          }
        } else {
          logger.warn('⚠️ Notification permissions denied');
        }
        
        // Test backend connection
        logger.debug('🔌 Testing backend connection...');
        try {
          const response = await fetch(`${API_BASE_URL}/whoami/`, {
            method: 'GET',
            headers: {
              'Host': getTenantHost(),
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.text();
            logger.info(`✅ Backend connection successful: ${data}`);
          } else {
            logger.warn(`⚠️ Backend responded with status: ${response.status}`);
          }
        } catch (connectionError) {
          logger.error('❌ Backend connection failed:', connectionError as Error);
        }
        
        logger.info('✅ App initialization completed successfully');
        
      } catch (error) {
        logger.error('💥 Error initializing app permissions', error as Error);
      }
    };
    
    // Initialize app after a brief delay to allow splash screen to show
    const initTimer = setTimeout(initializeApp, 500);
    
    // Handle app state changes for background/foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logger.debug('📱 App state changed', { nextAppState });
      
      if (nextAppState === 'active') {
        logger.debug('🎯 App became active, checking services');
      } else if (nextAppState === 'background') {
        logger.debug('🌙 App went to background');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearTimeout(initTimer);
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.primary}
            translucent={false}
          />
          <ContextErrorBoundary contextName="AuthProvider">
            <AuthProvider>
              <ContextErrorBoundary contextName="TenantProvider">
                <TenantProvider>
                  <ContextErrorBoundary contextName="DriverProvider">
                    <DriverProvider>
                      <ContextErrorBoundary contextName="OrderProvider">
                        <OrderProvider 
                          apiBaseUrl={API_BASE_URL}
                          websocketUrl={WEBSOCKET_URL}
                        >
                          <AppNavigator />
                          <IncomingOrderManager />
                          <NetworkStatus />
                        </OrderProvider>
                      </ContextErrorBoundary>
                    </DriverProvider>
                  </ContextErrorBoundary>
                </TenantProvider>
              </ContextErrorBoundary>
            </AuthProvider>
          </ContextErrorBoundary>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});


export default App;