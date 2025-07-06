# Test Current Backend Decline Behavior

## 🧪 Test Script

Run these commands to test if the backend handles decline correctly:

### Step 1: Get Available Orders
```bash
# Get list of available orders
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Host: sirajjunior.192.168.1.149" \
     http://192.168.1.149:8000/api/v1/delivery/deliveries/available_orders/

# Note the order IDs - should be delivery IDs
```

### Step 2: Test Decline (After Backend Fix)
```bash
# Try to decline an order
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Host: sirajjunior.192.168.1.149" \
     http://192.168.1.149:8000/api/v1/delivery/deliveries/ORDER_ID/decline/

# Expected Response:
# {"message": "Delivery declined successfully.", "delivery_id": "ORDER_ID"}
```

### Step 3: Check if Order Disappeared
```bash
# Get available orders again
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Host: sirajjunior.192.168.1.149" \
     http://192.168.1.149:8000/api/v1/delivery/deliveries/available_orders/

# The declined order should NOT appear in this driver's list
```

### Step 4: Test with Different Driver
```bash
# Login with different driver account and check available orders
# The declined order SHOULD still appear for other drivers
```

## 🎯 Expected Backend Behavior

### Current Issue:
- Backend rejects decline with "You can only decline your own assigned deliveries"
- This prevents drivers from declining available orders

### Required Fix:
1. **Accept endpoint**: `/deliveries/{id}/accept/` - assign order to driver
2. **Decline endpoint**: `/deliveries/{id}/decline/` - remove from current driver's available list

### Correct Decline Logic:
```python
def decline(self, request, pk=None):
    delivery = self.get_object()
    current_driver = request.user.driver
    
    # Allow declining if not assigned to someone else
    if delivery.driver is not None and delivery.driver != current_driver:
        return Response(
            {"error": "This delivery is already assigned to another driver."}, 
            status=400
        )
    
    # For available orders (driver=null), just mark as declined for this driver
    # For assigned orders, unassign them
    
    return Response({
        "message": "Delivery declined successfully.",
        "delivery_id": delivery.id
    })
```

## 🔍 Debug Order ID Issues

The "no delivery matches" error suggests ID mismatch. Check:

1. **Available Orders Response**: What ID structure is returned?
2. **Frontend ID Usage**: Is the modal using the correct ID?
3. **API Endpoint**: Does the endpoint expect delivery ID or order ID?

### ID Structure Investigation:
```json
// Expected from /available_orders/:
{
  "id": "123",           // This should be the delivery ID
  "deliveryId": "123",   // Should match id
  "orderId": "456",      // The actual order ID
  "order": {
    "id": "456"          // Order details
  }
}
```

### Frontend ID Logic:
- Modal should use `order.id` (which is the delivery ID for available orders)
- NOT `order.deliveryId` or `order.orderId`

## ⚡ Quick Fixes Needed

### 1. Backend Decline Permission
```python
# In decline action - replace the permission check:
if delivery.driver is not None and delivery.driver != current_driver:
    return Response({"error": "Already assigned to another driver"}, status=400)
```

### 2. Frontend ID Usage
```typescript
// In OrderNotificationModal - use main ID for available orders:
const acceptId = order?.id || '';  // Main ID should be delivery ID
const declineId = order?.id || ''; // Same for decline
```

This should fix both the "no delivery matches" error and ensure proper decline behavior.