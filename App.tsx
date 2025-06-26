/**
 * Mursal Driver App
 * Multi-tenant delivery driver application
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DriverProvider } from './src/contexts/DriverContext';
import { OrderProvider } from './src/contexts/OrderContext';
import { RootStackParamList, TabParamList } from './src/types';
import LoginScreen from './src/screens/auth/LoginScreen';

// Create navigation stacks
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder screens

const DashboardScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Dashboard</Text>
    <Text>Driver dashboard with active orders will be implemented here</Text>
  </View>
);

const HistoryScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Order History</Text>
    <Text>Order history will be displayed here</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Driver Profile</Text>
    <Text>Driver profile and settings will be implemented here</Text>
  </View>
);

const OrderDetailsScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Order Details</Text>
    <Text>Order details will be displayed here</Text>
  </View>
);

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main navigation container with authentication flow
const AppNavigator = () => {
  const { isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <DriverProvider>
          <OrderProvider>
            <AppNavigator />
          </OrderProvider>
        </DriverProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default App;
