/**
 * Notification Debug Utilities
 *
 * Comprehensive debugging tools for notification flow testing
 */

import { Alert } from 'react-native';
import { logger } from '../infrastructure/logging/logger';
import { appNavigationService } from '../services/appNavigationService';
import { notificationService } from '../services/notificationService';
import { Order } from '../types';

export interface DebugNotificationData {
  orderId?: string;
  orderData?: Order;
  action_type?: 'view_order' | 'accept_order' | 'new_order';
  title?: string;
  message?: string;
  type?: string;
  priority?: string;
  wake_screen?: string;
}

class NotificationDebugUtils {
  private testOrderData: Order = {
    id: 'TEST_ORDER_123',
    order_number: '#TEST-123',
    customer_details: {
      name: 'Test Customer',
      phone: '+1234567890'
    },
    delivery_address: '123 Test Street, Test City',
    pickup_address: 'Test Restaurant, 456 Main St',
    total: 29.99,
    subtotal: 25.99,
    delivery_fee: 4.00,
    status: 'pending',
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'item1',
        name: 'Test Burger',
        quantity: 2,
        price: 12.99
      }
    ],
    currency: 'SDG'
  };

  /**
   * Test notification navigation without actual notification
   */
  async testNotificationNavigation(data?: Partial<DebugNotificationData>): Promise<void> {
    const testData: DebugNotificationData = {
      orderId: 'TEST_ORDER_123',
      orderData: this.testOrderData,
      action_type: 'view_order',
      ...data
    };

    logger.info('[NotificationDebugUtils] Testing notification navigation with data:', testData);

    try {
      const success = await appNavigationService.handleNotificationNavigation({
        orderId: testData.orderId,
        orderData: testData.orderData,
        action_type: testData.action_type
      });

      const message = success
        ? `✅ Navigation test SUCCESS for order ${testData.orderId}`
        : `❌ Navigation test FAILED for order ${testData.orderId}`;

      logger.info(message);
      Alert.alert('Navigation Test Result', message);

    } catch (error) {
      const errorMessage = `💥 Navigation test ERROR: ${error}`;
      logger.error(errorMessage, error as Error);
      Alert.alert('Navigation Test Error', errorMessage);
    }
  }

  /**
   * Test notification tap simulation
   */
  async testNotificationTap(): Promise<void> {
    logger.info('[NotificationDebugUtils] Simulating notification tap...');

    const mockNotificationData = {
      orderId: 'TEST_ORDER_123',
      order_id: 'TEST_ORDER_123',
      order: JSON.stringify(this.testOrderData),
      action_type: 'view_order',
      type: 'new_order',
      title: 'New Order Available!',
      message: `Order ${this.testOrderData.order_number} from ${this.testOrderData.customer_details?.name}`,
      priority: 'high',
      wake_screen: 'true'
    };

    try {
      // Import push notification client dynamically
      const { PushNotificationClient } = await import('../sdk/pushNotificationClient');
      const client = new PushNotificationClient({});

      // Simulate the handleNotificationTap method
      await this.simulateNotificationTap(mockNotificationData);

      Alert.alert('Notification Tap Test', '✅ Notification tap simulation completed. Check logs for details.');
    } catch (error) {
      logger.error('[NotificationDebugUtils] Error testing notification tap:', error as Error);
      Alert.alert('Notification Tap Error', `❌ Error: ${error}`);
    }
  }

  /**
   * Simulate notification tap handling
   */
  private async simulateNotificationTap(data: any): Promise<void> {
    logger.info('[NotificationDebugUtils] Simulating notification tap with data:', data);

    try {
      // Extract navigation data
      const orderId = data.orderId || data.order_id || data.id;
      const actionType = data.action_type || 'view_order';

      // Parse order data if available
      let orderData = data.order;
      if (typeof orderData === 'string') {
        try {
          orderData = JSON.parse(orderData);
        } catch (e) {
          logger.error('[NotificationDebugUtils] Error parsing order data:', e);
          orderData = null;
        }
      }

      // Navigate using the app navigation service
      const success = await appNavigationService.handleNotificationNavigation({
        orderId,
        orderData,
        action_type: actionType,
        params: data
      });

      if (success) {
        logger.info(`[NotificationDebugUtils] ✅ Successfully navigated to order ${orderId}`);
      } else {
        logger.warn(`[NotificationDebugUtils] ⚠️ Failed to navigate to order ${orderId}`);
      }
    } catch (error) {
      logger.error('[NotificationDebugUtils] Error simulating notification tap:', error as Error);
    }
  }

  /**
   * Debug navigation state
   */
  debugNavigationState(): void {
    logger.info('[NotificationDebugUtils] Debugging navigation state...');
    appNavigationService.debugNavigationState();

    Alert.alert(
      'Navigation State Debug',
      'Navigation state logged to console. Check logs for details.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Test all navigation scenarios
   */
  async testAllNavigationScenarios(): Promise<void> {
    logger.info('[NotificationDebugUtils] Testing all navigation scenarios...');

    const scenarios = [
      {
        name: 'View Order',
        data: { action_type: 'view_order' as const, orderId: 'TEST_001' }
      },
      {
        name: 'Accept Order',
        data: { action_type: 'accept_order' as const, orderId: 'TEST_002' }
      },
      {
        name: 'New Order',
        data: { action_type: 'new_order' as const, orderId: 'TEST_003' }
      },
      {
        name: 'With Order Data',
        data: { action_type: 'view_order' as const, orderId: 'TEST_004', orderData: this.testOrderData }
      },
      {
        name: 'Navigate to Home',
        data: { screen: 'Main', params: { screen: 'Home' } }
      }
    ];

    for (const scenario of scenarios) {
      try {
        logger.info(`[NotificationDebugUtils] Testing scenario: ${scenario.name}`);
        await this.testNotificationNavigation(scenario.data);

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`[NotificationDebugUtils] Error in scenario ${scenario.name}:`, error as Error);
      }
    }

    Alert.alert('All Scenarios Tested', '✅ All navigation scenarios have been tested. Check logs for results.');
  }

  /**
   * Test notification service callbacks
   */
  async testNotificationServiceCallbacks(): Promise<void> {
    logger.info('[NotificationDebugUtils] Testing notification service callbacks...');

    try {
      // Test onNavigateToOrder callback
      notificationService.setNotificationCallbacks({
        onNavigateToOrder: (orderId: string) => {
          logger.info(`[NotificationDebugUtils] onNavigateToOrder callback triggered for order: ${orderId}`);
          Alert.alert('Callback Test', `✅ onNavigateToOrder callback triggered for order: ${orderId}`);
        },
        onOrderReceived: (orderId: string, action: 'accept' | 'decline') => {
          logger.info(`[NotificationDebugUtils] onOrderReceived callback triggered: ${action} for order: ${orderId}`);
        }
      });

      // Simulate callback triggers
      const testCallbacks = notificationService['notificationCallbacks'];
      if (testCallbacks.onNavigateToOrder) {
        testCallbacks.onNavigateToOrder('TEST_CALLBACK_ORDER_123');
      }

      Alert.alert('Callback Test', '✅ Notification service callbacks have been tested.');
    } catch (error) {
      logger.error('[NotificationDebugUtils] Error testing callbacks:', error as Error);
      Alert.alert('Callback Test Error', `❌ Error: ${error}`);
    }
  }

  /**
   * Show debug menu
   */
  showDebugMenu(): void {
    const options = [
      { text: 'Test Navigation', onPress: () => this.testNotificationNavigation() },
      { text: 'Test Notification Tap', onPress: () => this.testNotificationTap() },
      { text: 'Debug Navigation State', onPress: () => this.debugNavigationState() },
      { text: 'Test All Scenarios', onPress: () => this.testAllNavigationScenarios() },
      { text: 'Test Callbacks', onPress: () => this.testNotificationServiceCallbacks() },
      { text: 'Cancel', style: 'cancel' as const }
    ];

    Alert.alert(
      'Notification Debug Menu',
      'Choose a debug action to test the notification flow:',
      options
    );
  }

  /**
   * Create a test button component data
   */
  getDebugButtonData() {
    return {
      title: '🔧 Debug Notifications',
      onPress: () => this.showDebugMenu(),
      style: {
        backgroundColor: '#FF6B35',
        padding: 15,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center' as const
      },
      textStyle: {
        color: 'white',
        fontWeight: 'bold' as const,
        fontSize: 16
      }
    };
  }

  /**
   * Log comprehensive notification system status
   */
  logSystemStatus(): void {
    logger.info('[NotificationDebugUtils] === NOTIFICATION SYSTEM STATUS ===');

    // Navigation service status
    logger.info('[NotificationDebugUtils] Navigation Service Status:', {
      isReady: appNavigationService.isNavigationReady(),
      currentRoute: appNavigationService.getCurrentRouteName()
    });

    // Notification service status
    try {
      const fcmToken = notificationService.getFcmToken();
      logger.info('[NotificationDebugUtils] Notification Service Status:', {
        hasFcmToken: !!fcmToken,
        fcmTokenLength: fcmToken?.length || 0
      });
    } catch (error) {
      logger.error('[NotificationDebugUtils] Error getting notification service status:', error as Error);
    }

    logger.info('[NotificationDebugUtils] === END STATUS ===');
  }
}

// Export singleton instance
export const notificationDebugUtils = new NotificationDebugUtils();
export default notificationDebugUtils;