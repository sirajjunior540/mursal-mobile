/**
 * Simplified and clean App.tsx with improved provider nesting
 */
import React, { memo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Infrastructure
import { logger } from './infrastructure/logging/logger';

// Feature providers
import { AuthProvider } from './features/auth/context/AuthContext';
import { OrderProvider } from './features/orders/context/OrderProvider';

// Debug utilities (only in development)
if (__DEV__) {
  import('./utils/mobileDebug');
}

// Screens
import { DashboardScreen } from './features';

// Environment configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.mursal.app';
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'wss://ws.mursal.app';

// Stack navigator
const Stack = createStackNavigator();

// Navigation component
const AppNavigator = memo(() => (
  <NavigationContainer
    onStateChange={(state) => {
      // Log navigation state changes in development
      if (__DEV__ && state) {
        logger.debug('Navigation state changed', { routeName: state.routes[state.index]?.name });
      }
    }}
  >
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
        }}
      />
    </Stack.Navigator>
  </NavigationContainer>
));

// Main App component
const App: React.FC = memo(() => {
  React.useEffect(() => {
    logger.info('Mursal Driver App started');
    
    return () => {
      logger.info('Mursal Driver App stopped');
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider apiBaseUrl={API_BASE_URL}>
          <OrderProvider 
            apiBaseUrl={API_BASE_URL}
            websocketUrl={WEBSOCKET_URL}
          >
            <AppNavigator />
          </OrderProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});

App.displayName = 'App';

export default App;