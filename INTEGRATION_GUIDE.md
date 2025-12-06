# Batch Order Handling - Integration Guide

This guide walks through integrating the batch order handling UI into your existing Murrsal Driver App.

## Step 1: Add Navigation Route

### Option A: React Navigation Stack
Add the screen to your navigation stack (typically in `App.tsx`, `MainNavigator.tsx`, or similar):

```typescript
import BatchOrderScreen from './src/screens/BatchOrderScreen';

// In your Stack.Navigator:
<Stack.Screen
  name="BatchOrderScreen"
  component={BatchOrderScreen}
  options={{
    title: 'Batch Route',
    headerShown: false, // Screen has custom header
  }}
/>
```

### Option B: Update Navigation Types
If using TypeScript with React Navigation, update your navigation types:

```typescript
// navigation/types.ts or similar
export type RootStackParamList = {
  // ... existing screens
  BatchOrderScreen: {
    batchId: string;
    orderId?: string;
  };
  // ... other screens
};
```

## Step 2: Update IncomingOrderModal Handler

The IncomingOrderModal already has batch detection logic. Update the acceptance flow:

### In your order management context or screen:

```typescript
const handleAcceptRoute = async (batchId: string, orderData: ExtendedOrder) => {
  try {
    // Accept the batch via API
    const response = await apiService.post(
      `/api/v1/batches/${batchId}/accept/`,
      {}
    );

    if (response.success) {
      // Navigate to BatchOrderScreen
      navigation.navigate('BatchOrderScreen', {
        batchId: batchId,
      });

      // Close the modal
      setModalVisible(false);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to accept batch order');
  }
};
```

### Pass the handler to IncomingOrderModal:

```typescript
<IncomingOrderModal
  visible={modalVisible}
  order={selectedOrder}
  onAccept={handleAcceptOrder}
  onDecline={handleDeclineOrder}
  onSkip={handleSkipOrder}
  onClose={handleCloseModal}
  onAcceptRoute={handleAcceptRoute} // Add this prop
  timerDuration={10}
/>
```

## Step 3: Update PickupScreen and DeliveryScreen

Add navigation back to BatchOrderScreen after completing a stop:

### In PickupScreen:

```typescript
const handlePickupComplete = async () => {
  try {
    // Complete pickup logic
    await updateOrderStatus(order.id, 'picked_up');

    // If part of a batch, return to BatchOrderScreen
    if (route.params?.batchId) {
      navigation.navigate('BatchOrderScreen', {
        batchId: route.params.batchId,
      });
    } else {
      // Single order flow
      navigation.goBack();
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to complete pickup');
  }
};
```

### In DeliveryScreen:

```typescript
const handleDeliveryComplete = async () => {
  try {
    // Complete delivery logic
    await updateOrderStatus(order.id, 'delivered');

    // If part of a batch, return to BatchOrderScreen
    if (route.params?.batchId) {
      navigation.navigate('BatchOrderScreen', {
        batchId: route.params.batchId,
      });
    } else {
      // Single order flow
      navigation.goBack();
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to complete delivery');
  }
};
```

## Step 4: Update Navigation Params (Optional)

Update PickupScreen and DeliveryScreen to accept batchId:

```typescript
// PickupScreen route params
type PickupScreenParams = {
  orderId: string;
  deliveryId: string;
  batchId?: string; // Add this
  stopId?: string;  // Add this
};

// DeliveryScreen route params
type DeliveryScreenParams = {
  order: Order;
  batchId?: string; // Add this
  stopId?: string;  // Add this
};
```

## Step 5: Test the Integration

### Test Cases:

1. **Single Order Flow (Existing):**
   ```
   IncomingOrderModal → Accept → PickupScreen → DeliveryScreen → Dashboard
   ```

2. **Batch Order Flow (New):**
   ```
   IncomingOrderModal (Batch) → Accept Route → BatchOrderScreen
   → Navigate to Stop 1 → PickupScreen → Complete → BatchOrderScreen
   → Navigate to Stop 2 → DeliveryScreen → Complete → BatchOrderScreen
   → ... (repeat for all stops) ...
   → All Complete → Dashboard
   ```

### Testing Checklist:

```
□ Batch order appears with "BATCH ORDER" badge
□ Batch shows correct number of orders
□ "Accept Route" button works
□ BatchOrderScreen loads with map
□ All stops appear on map with markers
□ Current stop is highlighted
□ "Navigate to Stop" button works
□ Completing stop returns to BatchOrderScreen
□ Next stop becomes current
□ Progress bar updates correctly
□ All stops completed → Dashboard
□ Reoptimize button works
□ Back button returns to Dashboard
```

## Step 6: Environment Variables (Optional)

If using Google Maps API for route optimization:

```
# .env
GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_ROUTES_API_ENABLED=true
```

## Step 7: Permissions

Ensure location permissions are properly configured:

### iOS (Info.plist):
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to optimize delivery routes</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location to provide accurate navigation</string>
```

### Android (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Step 8: Backend API Integration

Ensure your backend supports these endpoints:

### 1. Get Batch Details:
```
GET /api/v1/batches/{batchId}/
```

### 2. Accept Batch:
```
POST /api/v1/batches/{batchId}/accept/
```

### 3. Update Stop Status:
```
POST /api/v1/deliveries/{orderId}/update-status/
Body: { status: 'completed', latitude, longitude, timestamp }
```

### 4. Get Optimized Route (Optional):
```
GET /api/v1/batches/{batchId}/optimized-route/
```

## Step 9: Error Handling

Add global error handling for batch operations:

```typescript
// services/batchErrorHandler.ts
export const handleBatchError = (error: any, context: string) => {
  console.error(`Batch Error [${context}]:`, error);

  if (error.message?.includes('network')) {
    Alert.alert(
      'Network Error',
      'Unable to connect. Please check your internet connection.',
      [{ text: 'Retry' }, { text: 'Cancel', style: 'cancel' }]
    );
  } else if (error.status === 404) {
    Alert.alert('Batch Not Found', 'This batch order may have been cancelled.');
  } else {
    Alert.alert('Error', `Failed to ${context}. Please try again.`);
  }
};
```

Use in components:

```typescript
try {
  await routeOptimizationService.getOptimizedRoute(batchId);
} catch (error) {
  handleBatchError(error, 'load route');
}
```

## Step 10: Analytics (Optional)

Add analytics tracking for batch operations:

```typescript
// Track batch acceptance
analytics.logEvent('batch_accepted', {
  batch_id: batchId,
  num_orders: stops.length,
  total_distance_km: totalDistance,
});

// Track stop completion
analytics.logEvent('stop_completed', {
  batch_id: batchId,
  stop_number: stopNumber,
  stop_type: stopType,
});

// Track batch completion
analytics.logEvent('batch_completed', {
  batch_id: batchId,
  total_stops: totalStops,
  completion_time_minutes: completionTime,
});
```

## Troubleshooting

### Issue: Map not showing stops
**Solution:** Ensure UniversalMapView is properly configured and has access to location permissions.

### Issue: Route optimization taking too long
**Solution:** Implement loading states and consider caching optimized routes.

### Issue: Navigation buttons not working
**Solution:** Verify navigation params are correctly passed between screens.

### Issue: Progress not updating
**Solution:** Check that stop completion is properly calling state updates.

### Issue: Back button not working
**Solution:** Ensure navigation stack is properly configured and handleGoBack is implemented.

## Performance Tips

1. **Lazy Load Stops:** Only render visible stops in the list
2. **Cache Route Data:** Store optimized routes to avoid recalculation
3. **Debounce Location Updates:** Limit GPS updates to every 10 seconds
4. **Optimize Map Rendering:** Use memo and shouldComponentUpdate
5. **Batch API Calls:** Combine status updates where possible

## Security Considerations

1. **Validate Batch Ownership:** Ensure driver is assigned to batch
2. **Secure Location Data:** Use HTTPS for all API calls
3. **Token Management:** Implement token refresh for long routes
4. **Data Encryption:** Encrypt sensitive customer data
5. **Permission Checks:** Verify permissions before accessing location

## Next Steps

After integration:

1. Test with real batch orders
2. Gather driver feedback
3. Monitor performance metrics
4. Iterate on UI/UX based on usage
5. Add advanced features (offline mode, etc.)

## Support

- Review `BATCH_ORDER_IMPLEMENTATION.md` for detailed feature documentation
- Check console logs for debugging information
- Test in development with mock data first
- Monitor API response times and errors

## Quick Start Checklist

```
□ Add BatchOrderScreen to navigation
□ Update navigation types
□ Add onAcceptRoute handler
□ Update PickupScreen with batchId param
□ Update DeliveryScreen with batchId param
□ Test single order flow (should still work)
□ Test batch order flow
□ Add error handling
□ Add analytics (optional)
□ Deploy and monitor
```

That's it! Your Murrsal Driver App now supports efficient batch order handling with optimized routing.
