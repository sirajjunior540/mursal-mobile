# Mobile App Notification Integration with Mark as Viewed

## Overview

This integration connects the `mark_viewed` functionality with the DriverAppNew mobile app notification system to control when popup/ringing occurs for new orders. The system ensures that:

1. **Orders are only shown once per driver**
2. **Background app wake-up** is supported through push notifications
3. **Skip action marks orders as viewed** to prevent future notifications
4. **Declined orders don't reappear**

## Backend Changes

### 1. Enhanced Delivery Views (`delivery/views/delivery.py`)

**Added `mark_viewed` action:**
```python
@action(detail=True, methods=['post'])
def mark_viewed(self, request, pk=None):
    """Mark a delivery as viewed by the driver."""
    delivery = self.get_object()
    
    # Create or update interaction record to track viewing
    interaction, created = DriverOrderInteraction.objects.get_or_create(
        delivery=delivery,
        driver=request.user,
        defaults={'action': DriverOrderInteraction.INTERACTION_VIEWED}
    )
```

**Updated `decline` action:**
- Uses existing `DriverOrderInteraction` model instead of creating new model
- Properly tracks decline interactions to prevent re-appearance
- Supports both assigned and broadcast orders

**Updated `available_orders` filtering:**
- Excludes orders that driver has viewed or declined
- Uses efficient database queries

### 2. Smart Assignment Service (`delivery/services/smart_assignment.py`)

**Enhanced filtering:**
```python
# Exclude deliveries that this driver has already declined
from ..models.interactions import DriverOrderInteraction
available_deliveries = available_deliveries.exclude(
    driver_interactions__driver=driver,
    driver_interactions__action=DriverOrderInteraction.INTERACTION_DECLINED
)
```

### 3. WebSocket Notification System (`delivery/services/websocket_utils.py`)

**Smart notification filtering:**
```python
def broadcast_new_order_assignment(delivery):
    # Check if driver has already interacted with this delivery
    interaction = DriverOrderInteraction.objects.filter(
        delivery=delivery,
        driver=delivery.driver,
        action__in=[DriverOrderInteraction.INTERACTION_VIEWED, DriverOrderInteraction.INTERACTION_DECLINED]
    ).first()
    
    if interaction:
        logger.info(f"Skipping notification - driver already {interaction.action}")
        return
```

## Mobile App Changes

### 1. API Integration (`src/services/api.ts`)

**Added mark_viewed endpoint:**
```typescript
async markDeliveryViewed(deliveryId: string): Promise<ApiResponse<void>> {
  console.log(`👁️ API: Marking delivery ${deliveryId} as viewed`);
  return this.client.post<void>(`/api/v1/delivery/deliveries/${deliveryId}/mark_viewed/`, {});
}
```

### 2. Order Action Service (`src/services/orderActionService.ts`)

**Added skip functionality:**
```typescript
async skipOrder(
  orderId: string,
  options: {
    showConfirmation?: boolean;
    onSuccess?: () => void;
    onError?: (error: string) => void;
  } = {}
): Promise<OrderActionResult> {
  const response = await deliveryApi.markDeliveryViewed(orderId);
  // Order skipped and marked as viewed - won't appear again
}
```

### 3. Notification Service Enhancement (`src/services/notificationService.ts`)

**Push notification integration:**
```typescript
private initializePushNotifications() {
  this.pushClient = new PushNotificationClient({});
  
  this.pushClient.setCallbacks({
    onNotification: (data) => {
      this.handlePushNotification(data);
    },
    onRegistration: (token) => {
      this.sendTokenToBackend(token);
    }
  });
}

private handlePushNotification(data: any) {
  if (data.type === 'new_order' && data.order) {
    const appState = AppState.currentState;
    
    if (appState === 'active') {
      // Show popup immediately
      this.notificationCallbacks.onNewOrder?.(data.order);
    } else {
      // Push notification will wake device
      console.log('📱 App in background - push notification will wake device');
    }
    
    // Always play sound and vibrate (wakes phone)
    this.playOrderSound();
    this.vibrateForOrder();
  }
}
```

### 4. Dashboard Screen Integration (`src/screens/DashboardScreen.tsx`)

**Enhanced skip handling:**
```typescript
const handleSkipOrder = useCallback(async (orderId: string) => {
  try {
    const result = await orderActionService.skipOrder(orderId, {
      showConfirmation: false,
      onSuccess: () => {
        console.log('✅ Order skipped successfully');
        refreshOrders();
      }
    });
    
    if (result.success) {
      console.log('🎉 Order skipped and marked as viewed - won\'t appear again');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to skip order');
  }
}, [refreshOrders]);
```

**Push notification callback setup:**
```typescript
// Set up push notification callback for background wake-up
notificationService.setNotificationCallbacks({
  onNewOrder: handleNewOrder
});
```

## How It Works

### 1. Normal Flow (App Active)
1. New order arrives → WebSocket/polling receives it
2. Check if driver has viewed/declined → If yes, skip notification
3. If no interaction → Show popup with Accept/Decline/Skip buttons
4. Skip pressed → Call `mark_viewed` API → Order marked as viewed
5. Order won't appear again for this driver

### 2. Background Flow (App Inactive)
1. New order arrives → Backend sends push notification
2. Push notification wakes up phone with sound/vibration
3. Driver opens app → Normal flow continues
4. If driver has already viewed order → No popup shown

### 3. Interaction Tracking
- **VIEWED**: Driver skipped the order - won't show popup again
- **DECLINED**: Driver explicitly declined - won't show popup again  
- **ACCEPTED**: Driver accepted order - normal workflow continues

## Key Benefits

1. **No Repeated Notifications**: Orders only notify once per driver
2. **Background Wake-Up**: Push notifications wake phone even when app is closed
3. **Efficient Database Queries**: Uses exclusion filters to prevent unnecessary notifications
4. **Proper State Management**: Tracks all driver interactions with orders
5. **Scalable Architecture**: Works with multiple drivers and high order volumes

## Configuration Requirements

### Mobile App
- Firebase FCM properly configured
- Push notification permissions granted
- Background app refresh enabled

### Backend  
- FCM server key configured
- Message queue system active
- WebSocket connections established

## Testing

To test the integration:

1. **Skip functionality**: Create test order → Skip in popup → Verify order doesn't appear again
2. **Background wake-up**: Put app in background → Send test notification → Verify phone wakes up
3. **Decline tracking**: Decline order → Verify it doesn't reappear in available orders
4. **Multi-driver**: Test same order with multiple drivers → Each driver sees it only once

## Error Handling

- Network failures gracefully handled with fallbacks
- Database constraint violations prevented with unique constraints
- Push notification failures fall back to polling/WebSocket
- API timeouts handled with appropriate user feedback

This integration provides a robust, scalable solution for mobile order notifications with proper state management and background wake-up capabilities.