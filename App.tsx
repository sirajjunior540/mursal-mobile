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

// i18n imports
import './src/i18n'; // Initialize i18n
import { LanguageProvider } from './src/contexts/LanguageContext';

// Infrastructure
import { logger } from './src/infrastructure/logging/logger';
import ErrorBoundary from './src/components/ErrorBoundary';
import ContextErrorBoundary from './src/components/ContextErrorBoundary';
import { NetworkStatus } from './src/components/NetworkStatus';
import IncomingOrderModal from './src/components/IncomingOrderModal';


// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import AcceptedOrdersScreen from './src/screens/AcceptedOrdersScreen';
import AvailableOrdersScreen from './src/screens/AvailableOrdersScreen';
import RouteNavigationScreen from './src/screens/RouteNavigationScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BatchLegsScreen from './src/screens/BatchLegsScreen';
import DriverProfileSettingsScreen from './src/screens/DriverProfileSettingsScreen';

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
import { soundService } from './src/services/soundService';
import { notificationService } from './src/services/notificationService';
import { haptics } from './src/utils/haptics';
import { ENV, getTenantHost } from './src/config/environment';
import { appStateService } from './src/services/appStateService';

// Environment configuration
const API_BASE_URL = ENV.API_BASE_URL;
const WEBSOCKET_URL = ENV.WS_BASE_URL;

// Type definitions
interface RootStackParamList extends Record<string, object | undefined> {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  DriverProfileSettings: undefined;
  AvailableOrders: undefined;
  AcceptedOrders: undefined;
}

interface TabParamList extends Record<string, object | undefined> {
  Home: undefined;
  Navigation: undefined;
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
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: string = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Navigation') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as React.ComponentProps<typeof Ionicons>['name']} size={size} color={color} />;
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
        name="Home" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Navigation" 
        component={RouteNavigationScreen} 
        options={{ tabBarLabel: 'Navigation' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ tabBarLabel: 'History' }}
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
  // Wrap useOrders in try-catch to handle context errors gracefully
  let orderContext;
  try {
    orderContext = useOrders();
  } catch (error) {
    console.error('IncomingOrderManager: Failed to access OrderContext:', error);
    return null;
  }
  
  if (!orderContext) {
    console.error('IncomingOrderManager: OrderContext is undefined');
    return null;
  }
  
  const { 
    acceptOrder, 
    declineOrder, 
    setOrderNotificationCallback,
    getDriverOrders,
    refreshOrders
  } = orderContext;
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
      // Error handled silently
    }
  };
  
  const handleAcceptRoute = async (routeId: string, orderData?: any) => {
    try {
      // Import the orderActionService for batch acceptance
      const { orderActionService } = await import('./src/services/orderActionService');
      
      // Use the acceptRoute method which handles batch acceptance
      const response = await orderActionService.acceptRoute(routeId, orderData);
      
      if (response.success) {
        setShowModal(false);
        setIncomingOrder(null);
        Alert.alert('Success', 'Batch order accepted successfully!');
        
        // Refresh driver orders to show the newly accepted batch
        await getDriverOrders();
        await refreshOrders();
      } else {
        Alert.alert('Error', response.error || 'Failed to accept batch order. Please try again.');
      }
    } catch (error) {
      logger.error('Error accepting batch order:', error as Error);
      Alert.alert('Error', 'Failed to accept batch order. Please try again.');
    }
  };

  const handleDecline = async (_orderId: string) => {
    try {
      await declineOrder(_orderId);
      setShowModal(false);
      setIncomingOrder(null);
    } catch (error) {
      // Error handled silently
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
      timerDuration={10}
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
    try {
      logger.info('Splash screen animation completed');
      
      setAppInitState({
        showSplash: false,
        isInitialized: true,
      });
    } catch (error) {
      // Force completion anyway to prevent freeze
      setAppInitState({
        showSplash: false,
        isInitialized: true,
      });
    }
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
              name="DriverProfileSettings" 
              component={DriverProfileSettingsScreen} 
              options={{ 
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_right'
              }}
            />
            <Stack.Screen 
              name="AvailableOrders" 
              component={AvailableOrdersScreen} 
              options={{ 
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
              }}
            />
            <Stack.Screen 
              name="AcceptedOrders" 
              component={AcceptedOrdersScreen} 
              options={{ 
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
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
  
  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Play sound when app comes to foreground
        soundService.playOrderNotification();
        logger.info('🔊 App became active - playing startup sound');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Initialize app permissions and services
  useEffect(() => {
    const initializeApp = async () => {
      logger.info('🚀 Initializing Mursal Driver App');
      
      // Check if app was launched from a notification
      if (global.pendingNotification) {
        logger.info('📱 App launched with pending notification:', global.pendingNotification);
      }
      
      // Play startup sound
      soundService.playOrderNotification();
      
      try {
        // Initialize app state service for WebSocket management
        logger.debug('🔄 Initializing app state service');
        appStateService.initialize();
        
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
            
            // Check if we have an FCM token and send it to backend
            if (global.fcmToken) {
              logger.info('🔑 Sending FCM token to backend...');
              try {
                const { apiService } = await import('./src/services/api');
                const result = await apiService.updateFCMToken(global.fcmToken);
                if (result.success) {
                  logger.info('✅ FCM token sent to backend successfully');
                } else {
                  logger.error('❌ Failed to send FCM token to backend:', result.error);
                }
              } catch (error) {
                logger.error('❌ Error sending FCM token to backend:', error as Error);
              }
            } else {
              logger.warn('⚠️ No FCM token available to send to backend');
            }
            
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
      // Cleanup app state service
      appStateService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ErrorBoundary>
        <LanguageProvider>
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
        </LanguageProvider>
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