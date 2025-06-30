/**
 * Mursal Driver App - Refactored with improved architecture
 * Multi-tenant delivery driver application
 */

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Text, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
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

// Feature providers and components
import { AuthProvider, useAuth } from './src/features/auth/context/AuthContext';
import { OrderProvider } from './src/features/orders/context/OrderProvider';
import { DashboardScreen } from './src/features';

// Legacy contexts (to be refactored)
import { DriverProvider } from './src/contexts/DriverContext';
import { TenantProvider } from './src/contexts/TenantContext';

// Legacy screens (to be refactored)
import LoginScreen from './src/screens/auth/LoginScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import OngoingDeliveryScreen from './src/screens/OngoingDeliveryScreenNew';
import RouteNavigationScreen from './src/screens/RouteNavigationScreenNew';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Theme and constants
import { theme } from './src/shared/styles/theme';
import { locationService } from './src/services/locationService';
import { requestNotificationPermissions } from './src/utils/permissions';
import { notificationService } from './src/services/notificationService';

// Environment configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.mursal.app';
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'wss://ws.mursal.app';

// Type definitions
interface RootStackParamList {
  Login: undefined;
  Main: undefined;
  OrderDetails: { orderId: string; autoNavigate?: boolean };
}

interface TabParamList {
  Dashboard: undefined;
  OngoingDelivery: undefined;
  RouteNavigation: undefined;
  History: undefined;
  Profile: undefined;
}

// Create navigation stacks
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'OngoingDelivery') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'RouteNavigation') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 0.5,
          height: 83,
          paddingBottom: 34,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="OngoingDelivery" 
        component={OngoingDeliveryScreen} 
        options={{ tabBarLabel: 'Ongoing' }}
      />
      <Tab.Screen 
        name="RouteNavigation" 
        component={RouteNavigationScreen} 
        options={{ tabBarLabel: 'Orders' }}
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

// Main navigation container with authentication flow
const AppNavigator = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  // Debug authentication state
  logger.debug('Auth State', { isLoading, isAuthenticated, userId: user?.id });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  logger.debug('Rendering navigation', { isAuthenticated });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="OrderDetails" 
              component={OrderDetailsScreen} 
              options={{ headerShown: false }}
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
  
  // Initialize location and notification permissions on app start
  useEffect(() => {
    const initializeApp = async () => {
      logger.info('Initializing app permissions and services');
      
      try {
        // Request location permissions immediately
        logger.debug('Requesting location permissions');
        const locationPermissionGranted = await locationService.requestLocationPermissions();
        
        if (locationPermissionGranted) {
          logger.info('Location permissions granted');
        } else {
          logger.warn('Location permissions denied');
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
        logger.debug('Requesting notification permissions');
        const notificationPermissionGranted = await requestNotificationPermissions();
        
        if (notificationPermissionGranted) {
          logger.info('Notification permissions granted');
          
          // Enable background notifications
          logger.debug('Enabling background notifications');
          const backgroundEnabled = await notificationService.enableBackgroundNotifications();
          
          if (backgroundEnabled) {
            logger.info('Background notifications enabled');
            
            // Set up notification callbacks for background actions
            notificationService.setNotificationCallbacks({
              onOrderReceived: (orderId: string, action: 'accept' | 'decline') => {
                logger.info(`Background notification action: ${action} for order ${orderId}`);
              },
              onNavigateToOrder: (orderId: string) => {
                logger.info(`Navigate to order from background notification: ${orderId}`);
              }
            });
          } else {
            logger.error('Failed to enable background notifications');
          }
        } else {
          logger.warn('Notification permissions denied');
        }
        
        logger.info('Map service ready');
        
      } catch (error) {
        logger.error('Error initializing app permissions', error as Error);
      }
    };
    
    initializeApp();
    
    // Handle app state changes for background/foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logger.debug('App state changed', { nextAppState });
      
      if (nextAppState === 'active') {
        logger.debug('App became active, checking location tracking');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <ContextErrorBoundary contextName="AuthProvider">
            <AuthProvider apiBaseUrl={API_BASE_URL}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.bodyLarge.fontSize,
    color: theme.colors.text,
  },
});

export default App;