# Batch Order Acceptance Flow Fix

## Problem Summary

The mobile app was getting a 404 error when trying to call `/api/v1/delivery/deliveries/2/accept/` because:
1. The order with ID "2" is actually a batch leg, not a regular delivery
2. Batch legs have a different endpoint: `/api/v1/delivery/batch-legs/{id}/accept_leg/`
3. The mobile app wasn't detecting the order type before calling the acceptance endpoint

## Backend API Structure

### Regular Orders (DeliveryViewSet)
- **List Available**: `GET /api/v1/delivery/deliveries/available_orders/`
- **Accept**: `POST /api/v1/delivery/deliveries/{id}/accept/`
- **Decline**: `POST /api/v1/delivery/deliveries/{id}/decline/`
- **Update Status**: `POST /api/v1/delivery/deliveries/{id}/update_status/`

### Batch Legs (BatchLegViewSet)
- **List Available**: `GET /api/v1/delivery/batch-legs/available_legs/`
- **Accept**: `POST /api/v1/delivery/batch-legs/{id}/accept_leg/`
- **Complete**: `POST /api/v1/delivery/batch-legs/{id}/complete_leg/`
- **Assign Driver**: `POST /api/v1/delivery/batch-legs/{id}/assign_driver/`

### Unified Feed (DriverOrderFeedViewSet)
According to the backend description, there should be a unified feed that combines both regular orders and batch legs. However, if this isn't available, the mobile app needs to handle both types separately.

## Solution Architecture

### 1. UnifiedOrderService (`src/services/unifiedOrderService.ts`)
Created a service that:
- Fetches both regular orders and batch legs
- Detects order type from the data structure
- Routes acceptance/decline to the correct endpoint
- Provides a unified interface for the UI

### 2. Order Type Detection
The service detects batch legs by checking for specific fields:
```typescript
isOrderBatchLeg(orderData: any): boolean {
  return !!(
    orderData.leg_number || 
    orderData.leg_type || 
    orderData.stops_count ||
    orderData.origin_type ||
    orderData.destinations
  );
}
```

### 3. Unified Order Interface
```typescript
interface UnifiedOrder {
  id: string;
  type: 'regular' | 'batch_leg';
  displayName: string;
  status: string;
  // Common fields for both types
  pickupAddress?: string;
  deliveryAddress?: string;
  // ... other fields
  originalData: Order | BatchLeg;
}
```

## Implementation Steps

### 1. Update Order Fetching
Replace direct API calls with the unified service:

```typescript
// Old way
const orders = await apiService.getAvailableOrders();

// New way
const { data: unifiedOrders } = await unifiedOrderService.getAvailableOrders();
```

### 2. Update Order Acceptance
Use the unified acceptance method:

```typescript
// Old way
await apiService.acceptOrder(orderId);

// New way
await unifiedOrderService.acceptOrder(unifiedOrder);
```

### 3. Update UI Components
Use the UnifiedOrderCard component or update existing components to handle both types:

```typescript
<UnifiedOrderCard
  order={unifiedOrder}
  onAccept={handleAcceptUnifiedOrder}
  onDecline={handleDeclineUnifiedOrder}
/>
```

## Testing the Fix

### 1. Test Regular Orders
```bash
# Should use /api/v1/delivery/deliveries/{id}/accept/
curl -X GET http://your-backend/api/v1/delivery/deliveries/available_orders/
# Accept a regular order
curl -X POST http://your-backend/api/v1/delivery/deliveries/{regular_order_id}/accept/
```

### 2. Test Batch Legs
```bash
# Should use /api/v1/delivery/batch-legs/{id}/accept_leg/
curl -X GET http://your-backend/api/v1/delivery/batch-legs/available_legs/
# Accept a batch leg
curl -X POST http://your-backend/api/v1/delivery/batch-legs/{batch_leg_id}/accept_leg/
```

### 3. Mobile App Testing
1. Open the app and go online
2. Check available orders - should see both types
3. Regular orders show with restaurant icon and "Regular Order" badge
4. Batch legs show with cube icon and "Batch Leg" badge
5. Accept each type - should use correct endpoint

## Files Created/Modified

### New Files
1. `src/services/unifiedOrderService.ts` - Unified order handling service
2. `src/hooks/useUnifiedOrders.ts` - React hook for unified orders
3. `src/components/UnifiedOrderCard.tsx` - UI component for unified orders
4. `BATCH_ORDER_ACCEPTANCE_FIX.md` - This documentation

### Modified Files
1. `src/services/orderActionService.ts` - Added `acceptUnifiedOrder` method

## Future Improvements

### 1. Backend Unified Feed
If the backend provides a true unified feed endpoint that returns both types with a `type` field:
```json
{
  "id": "123",
  "type": "delivery",  // or "batch_leg"
  "order_number": "ORD-123",
  // ... other fields
}
```

The mobile app can simplify the detection logic.

### 2. Type Field in Response
Request the backend to add a `type` field to all order responses to make detection easier.

### 3. Error Handling
Add specific error handling for 404 errors that suggest using the wrong endpoint:
```typescript
if (error.status === 404 && error.message.includes('delivery')) {
  // Try batch leg endpoint
}
```

## Quick Fix for Existing Code

If you need a quick fix without major refactoring:

```typescript
// In your accept handler
async function handleAcceptOrder(orderId: string, orderData: any) {
  try {
    // Check if it's a batch leg
    const isBatchLeg = !!(
      orderData.leg_number || 
      orderData.leg_type || 
      orderData.stops_count
    );
    
    if (isBatchLeg) {
      // Use batch leg endpoint
      await apiService.acceptBatchLeg(orderId);
    } else {
      // Use regular endpoint
      await apiService.acceptOrder(orderId);
    }
  } catch (error) {
    console.error('Accept failed:', error);
  }
}
```

## Backend Recommendations

1. **Add type field**: Return a `type` field in all order responses
2. **Unified endpoint**: Create a single endpoint that accepts both types
3. **Better error messages**: Return specific errors like "This is a batch leg, use /batch-legs/{id}/accept_leg/"
4. **Documentation**: Document which fields indicate order type

## Conclusion

The fix ensures that:
1. The mobile app correctly identifies order types
2. Uses the appropriate endpoint for each type
3. Provides a unified UI/UX for drivers
4. Handles errors gracefully

This solution is backward compatible and can work with the current backend while being ready for future improvements.