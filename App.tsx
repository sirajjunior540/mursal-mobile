/**
 * Mursal Driver App
 * Multi-tenant delivery driver application
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Text, ActivityIndicator, Alert, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DriverProvider } from './src/contexts/DriverContext';
import { OrderProvider } from './src/contexts/OrderContext';
import { TenantProvider } from './src/contexts/TenantContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import ContextErrorBoundary from './src/components/ContextErrorBoundary';
import { RootStackParamList, TabParamList } from './src/types';
import './src/utils/DevUtils'; // Import for development utilities
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from './src/constants';
import { locationService } from './src/services/locationService';
import { requestNotificationPermissions } from './src/utils/permissions';
import { notificationService } from './src/services/notificationService';
import { mapboxService } from './src/services/mapboxService';
import './src/utils/locationTest'; // Import location testing utilities

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
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary.default,
        tabBarInactiveTintColor: COLORS.text.secondary,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main navigation container with authentication flow
const AppNavigator = () => {
  const { isLoading, isLoggedIn, user } = useAuth();

  // Debug authentication state
  console.log('Auth State:', { isLoading, isLoggedIn, username: user?.username });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  console.log('Rendering navigation - isLoggedIn:', isLoggedIn);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="OrderDetails" 
              component={OrderDetailsScreen} 
              options={{ headerShown: true }}
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
      console.log('🚀 Initializing app permissions and services...');
      
      try {
        // Request location permissions immediately
        console.log('📍 Requesting location permissions...');
        const locationPermissionGranted = await locationService.requestLocationPermissions();
        
        if (locationPermissionGranted) {
          console.log('✅ Location permissions granted');
        } else {
          console.log('❌ Location permissions denied');
          Alert.alert(
            'Location Required',
            'This app requires location access to track deliveries. Please enable location permissions in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // For production, you might want to use Linking.openSettings()
                console.log('Opening device settings...');
              }}
            ]
          );
        }
        
        // Request notification permissions
        console.log('🔔 Requesting notification permissions...');
        const notificationPermissionGranted = await requestNotificationPermissions();
        
        if (notificationPermissionGranted) {
          console.log('✅ Notification permissions granted');
          
          // Enable background notifications
          console.log('📱 Enabling background notifications...');
          const backgroundEnabled = await notificationService.enableBackgroundNotifications();
          
          if (backgroundEnabled) {
            console.log('✅ Background notifications enabled');
            
            // Set up notification callbacks for background actions
            notificationService.setNotificationCallbacks({
              onOrderReceived: (orderId: string, action: 'accept' | 'decline') => {
                console.log(`📱 Background notification action: ${action} for order ${orderId}`);
                // Handle background order acceptance/decline
                // This would typically trigger the appropriate API calls
              },
              onNavigateToOrder: (orderId: string) => {
                console.log(`📱 Navigate to order from background notification: ${orderId}`);
                // Handle navigation when app opens from notification tap
              }
            });
          } else {
            console.log('❌ Failed to enable background notifications');
          }
        } else {
          console.log('❌ Notification permissions denied');
        }
        
        // Test Mapbox configuration
        console.log('🗺️ Testing Mapbox configuration...');
        const mapboxConfigured = await mapboxService.testConfiguration();
        
        if (mapboxConfigured) {
          console.log('✅ Mapbox configured successfully');
        } else {
          console.log('❌ Mapbox configuration failed or token invalid');
        }
        
      } catch (error) {
        console.error('❌ Error initializing app permissions:', error);
      }
    };
    
    initializeApp();
    
    // Handle app state changes for background/foreground
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - check if location tracking should resume
        console.log('🔄 App became active, checking location tracking...');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ContextErrorBoundary contextName="AuthProvider">
          <AuthProvider>
            <ContextErrorBoundary contextName="TenantProvider">
              <TenantProvider>
                <ContextErrorBoundary contextName="DriverProvider">
                  <DriverProvider>
                    <ContextErrorBoundary contextName="OrderProvider">
                      <OrderProvider>
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default App;
