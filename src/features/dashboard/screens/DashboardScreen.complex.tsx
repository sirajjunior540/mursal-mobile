/**
 * Refactored DashboardScreen with improved architecture and performance
 */
import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, StatusBar, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { theme } from '../../../shared/styles/theme';
import { useOrders } from '../../orders/context/OrderProvider';
import { useAuth } from '../../auth/context/AuthContext';
import { logger } from '../../../infrastructure/logging/logger';

import DashboardHeader from '../components/DashboardHeader/DashboardHeader';
import OrderList from '../components/OrderList/OrderList';
import { createDashboardScreenStyles } from './DashboardScreen.styles';

interface DashboardStackParamList {
  OrderDetails: { orderId: string; autoNavigate?: boolean };
  Dashboard: undefined;
}

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = memo(() => {
  const navigation = useNavigation<NavigationProp>();
  const styles = createDashboardScreenStyles(theme);
  
  // Context hooks
  const { 
    orders, 
    isLoading, 
    error, 
    refreshOrders, 
    acceptOrder, 
    declineOrder 
  } = useOrders();
  
  const { 
    user: driver, 
    setOnlineStatus, 
    isLoading: authLoading 
  } = useAuth();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0.98)).current;

  // Entry animations
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animation.timing.slow,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Handle order acceptance with error handling
  const handleAcceptOrder = useCallback(async (orderId: string) => {
    try {
      logger.info(`Attempting to accept order ${orderId}`);
      await acceptOrder(orderId);
      
      Alert.alert(
        'Order Accepted',
        'You have successfully accepted this order.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error(`Failed to accept order ${orderId}`, error as Error);
      
      Alert.alert(
        'Error',
        'Failed to accept order. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [acceptOrder]);

  // Handle order decline with confirmation
  const handleDeclineOrder = useCallback(async (orderId: string) => {
    Alert.alert(
      'Decline Order',
      'Are you sure you want to decline this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: async () => {
            try {
              logger.info(`Attempting to decline order ${orderId}`);
              await declineOrder(orderId, 'Driver declined');
            } catch (error) {
              logger.error(`Failed to decline order ${orderId}`, error as Error);
              
              Alert.alert(
                'Error',
                'Failed to decline order. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  }, [declineOrder]);

  // Navigate to order details
  const handleOrderPress = useCallback((orderId: string) => {
    logger.debug(`Navigating to order details for ${orderId}`);
    navigation.navigate('OrderDetails', { orderId });
  }, [navigation]);

  // Toggle online status
  const handleToggleOnlineStatus = useCallback(async (isOnline: boolean) => {
    try {
      logger.info(`Setting driver status to ${isOnline ? 'online' : 'offline'}`);
      await setOnlineStatus(isOnline);
    } catch (error) {
      logger.error('Failed to update online status', error as Error);
      
      Alert.alert(
        'Error',
        'Failed to update your online status. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [setOnlineStatus]);

  // Handle refresh with error handling
  const handleRefresh = useCallback(async () => {
    try {
      logger.debug('Refreshing orders');
      await refreshOrders();
    } catch (error) {
      logger.error('Failed to refresh orders', error as Error);
      
      Alert.alert(
        'Error',
        'Failed to refresh orders. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [refreshOrders]);

  // Go online handler
  const handleGoOnline = useCallback(() => {
    handleToggleOnlineStatus(true);
  }, [handleToggleOnlineStatus]);

  // Show error if there's a persistent error
  useEffect(() => {
    if (error) {
      logger.error('Dashboard error state', new Error(error));
    }
  }, [error]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DashboardHeader
          driver={driver}
          onlineStatus={driver?.is_online || false}
          onToggleOnlineStatus={handleToggleOnlineStatus}
          headerOpacity={headerOpacity}
        />
        
        <Animated.View 
          style={[styles.content, { opacity: fadeAnim }]}
          accessibilityRole="main"
        >
          <OrderList
            orders={orders}
            driver={driver}
            isLoading={authLoading}
            isRefreshing={isLoading}
            onRefresh={handleRefresh}
            onAcceptOrder={handleAcceptOrder}
            onDeclineOrder={handleDeclineOrder}
            onOrderPress={handleOrderPress}
            onGoOnline={handleGoOnline}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
});

DashboardScreen.displayName = 'DashboardScreen';

export default DashboardScreen;