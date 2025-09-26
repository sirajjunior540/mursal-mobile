/**
 * App Navigation Service - Handles navigation between screens
 * This is different from navigationService.ts which handles GPS/map navigation
 */

import { createNavigationContainerRef, StackActions, CommonActions } from '@react-navigation/native';
import { Alert } from 'react-native';
import { logger } from '../infrastructure/logging/logger';
import { Order } from '../types';

// Create a global navigation reference
export const navigationRef = createNavigationContainerRef();

// Type definitions for navigation
export interface NavigationActionData {
  orderId?: string;
  orderData?: Order;
  action_type?: 'view_order' | 'accept_order' | 'new_order';
  screen?: string;
  params?: any;
}

class AppNavigationService {
  private isReady = false;

  /**
   * Set navigation ready state
   */
  setReady(ready: boolean) {
    this.isReady = ready;
    logger.debug('[AppNavigationService] Navigation ready state:', { ready });
  }

  /**
   * Check if navigation is ready
   */
  isNavigationReady(): boolean {
    return this.isReady && navigationRef.isReady();
  }

  /**
   * Navigate to a specific screen
   */
  navigate(screenName: string, params?: any): boolean {
    try {
      if (!this.isNavigationReady()) {
        logger.warn('[AppNavigationService] Navigation not ready, queuing navigation');
        // Queue navigation for when ready
        setTimeout(() => this.navigate(screenName, params), 1000);
        return false;
      }

      logger.info('[AppNavigationService] Navigating to screen:', { screenName, params });
      navigationRef.navigate(screenName as never, params as never);
      return true;
    } catch (error) {
      logger.error('[AppNavigationService] Navigation error:', error as Error);
      return false;
    }
  }

  /**
   * Reset navigation stack and navigate to screen
   */
  reset(screenName: string, params?: any): boolean {
    try {
      if (!this.isNavigationReady()) {
        logger.warn('[AppNavigationService] Navigation not ready for reset');
        return false;
      }

      logger.info('[AppNavigationService] Resetting navigation to screen:', { screenName, params });
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: screenName, params }],
        })
      );
      return true;
    } catch (error) {
      logger.error('[AppNavigationService] Reset navigation error:', error as Error);
      return false;
    }
  }

  /**
   * Navigate to specific tab
   */
  navigateToTab(tabName: 'Home' | 'Navigation' | 'History' | 'Notifications' | 'Profile'): boolean {
    try {
      if (!this.isNavigationReady()) {
        logger.warn('[AppNavigationService] Navigation not ready for tab navigation');
        return false;
      }

      logger.info('[AppNavigationService] Navigating to tab:', { tabName });
      navigationRef.navigate('Main' as never, { screen: tabName } as never);
      return true;
    } catch (error) {
      logger.error('[AppNavigationService] Tab navigation error:', error as Error);
      return false;
    }
  }

  /**
   * Handle notification tap navigation
   */
  async handleNotificationNavigation(data: NavigationActionData): Promise<boolean> {
    try {
      logger.info('[AppNavigationService] Handling notification navigation:', data);

      if (!this.isNavigationReady()) {
        logger.warn('[AppNavigationService] Navigation not ready, showing alert instead');
        this.showNotificationAlert(data);
        return false;
      }

      const { action_type, orderId, orderData, screen, params } = data;

      // Handle different action types
      switch (action_type) {
        case 'view_order':
        case 'new_order':
          return this.navigateToOrderView(orderId, orderData);

        case 'accept_order':
          return this.navigateToAcceptOrder(orderId, orderData);

        default:
          // Custom screen navigation
          if (screen) {
            return this.navigate(screen, params);
          }

          // Default: navigate to order view if we have order data
          if (orderId || orderData) {
            return this.navigateToOrderView(orderId, orderData);
          }

          // Fallback: navigate to home
          logger.warn('[AppNavigationService] Unknown action type, navigating to home');
          return this.navigateToTab('Home');
      }
    } catch (error) {
      logger.error('[AppNavigationService] Error handling notification navigation:', error as Error);
      this.showNotificationAlert(data);
      return false;
    }
  }

  /**
   * Navigate to order view (opens order details modal)
   */
  private async navigateToOrderView(orderId?: string, orderData?: Order): Promise<boolean> {
    try {
      logger.info('[AppNavigationService] Navigating to order view:', { orderId, hasOrderData: !!orderData });

      if (!orderId && !orderData?.id) {
        logger.error('[AppNavigationService] No order ID provided for navigation');
        return false;
      }

      // Navigate to the appropriate screen based on where orders are typically viewed
      // Since we don't have a dedicated OrderDetailScreen, we'll navigate to AcceptedOrders
      // and pass the order data to trigger the modal
      const navigationParams = {
        openOrderId: orderId || orderData?.id,
        orderData: orderData
      };

      // First navigate to the Main tab container
      this.navigateToTab('Home');

      // Then navigate to the accepted orders screen with the order data
      setTimeout(() => {
        this.navigate('AcceptedOrders', navigationParams);
      }, 500);

      return true;
    } catch (error) {
      logger.error('[AppNavigationService] Error navigating to order view:', error as Error);
      return false;
    }
  }

  /**
   * Navigate to accept order flow
   */
  private async navigateToAcceptOrder(orderId?: string, orderData?: Order): Promise<boolean> {
    try {
      logger.info('[AppNavigationService] Navigating to accept order:', { orderId, hasOrderData: !!orderData });

      if (!orderId && !orderData?.id) {
        logger.error('[AppNavigationService] No order ID provided for accept navigation');
        return false;
      }

      // Navigate to available orders screen where orders can be accepted
      const navigationParams = {
        openOrderId: orderId || orderData?.id,
        orderData: orderData,
        autoAccept: true // Flag to indicate this should trigger accept flow
      };

      this.navigateToTab('Home');

      setTimeout(() => {
        this.navigate('AvailableOrders', navigationParams);
      }, 500);

      return true;
    } catch (error) {
      logger.error('[AppNavigationService] Error navigating to accept order:', error as Error);
      return false;
    }
  }

  /**
   * Show alert when navigation fails
   */
  private showNotificationAlert(data: NavigationActionData): void {
    const { orderId, action_type } = data;

    let title = 'Notification';
    let message = 'You have a new notification.';

    if (action_type === 'new_order' || action_type === 'view_order') {
      title = 'New Order Available';
      message = orderId
        ? `Order ${orderId} is available. Open the app to view details.`
        : 'A new order is available. Open the app to view details.';
    } else if (action_type === 'accept_order') {
      title = 'Accept Order';
      message = orderId
        ? `Accept order ${orderId}? Open the app to proceed.`
        : 'Open the app to accept the order.';
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Open App',
          onPress: () => {
            // Try navigation again after user interaction
            setTimeout(() => {
              if (this.isNavigationReady()) {
                this.handleNotificationNavigation(data);
              }
            }, 1000);
          }
        }
      ]
    );
  }

  /**
   * Get current route name
   */
  getCurrentRouteName(): string | undefined {
    if (!this.isNavigationReady()) {
      return undefined;
    }

    return navigationRef.getCurrentRoute()?.name;
  }

  /**
   * Go back
   */
  goBack(): boolean {
    try {
      if (!this.isNavigationReady()) {
        return false;
      }

      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('[AppNavigationService] Go back error:', error as Error);
      return false;
    }
  }

  /**
   * Debug: Log current navigation state
   */
  debugNavigationState(): void {
    if (!this.isNavigationReady()) {
      logger.debug('[AppNavigationService] Navigation not ready for debug');
      return;
    }

    try {
      const state = navigationRef.getRootState();
      const currentRoute = navigationRef.getCurrentRoute();

      logger.debug('[AppNavigationService] Navigation state:', {
        ready: this.isReady,
        navigationReady: navigationRef.isReady(),
        currentRoute: currentRoute?.name,
        routeParams: currentRoute?.params,
        stackState: state
      });
    } catch (error) {
      logger.error('[AppNavigationService] Error getting navigation state:', error as Error);
    }
  }
}

// Export singleton instance
export const appNavigationService = new AppNavigationService();
export default appNavigationService;