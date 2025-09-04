# Order Status and Decline Button Debug Guide

## Issues Fixed

### 1. ✅ Decline Button Not Working
**Problem**: The `handleDeclineOrder` function was not calling the actual `declineOrder` API method.

**Fix**: Updated `src/screens/DashboardScreen.tsx:219-247` to properly call the decline API:
```typescript
// Before: commented out API call
// await declineOrder(orderId);  // This was commented out

// After: actual implementation
await declineOrder(orderId);
console.log('✅ Order declined successfully:', orderId);
Alert.alert('Order Declined', 'The order has been declined successfully.');
```

### 2. ✅ ID Consistency for Decline
**Problem**: Accept button used `deliveryId || id` but decline button only used `id`.

**Fix**: Updated `src/components/OrderNotificationModal.tsx:195-201` to use same logic:
```typescript
// Before: 
onDecline(order?.id || '');

// After: 
const declineId = order?.deliveryId || order?.id || '';
onDecline(declineId);
```

### 3. ✅ Order Status Logic - Pending vs Assigned
**Problem**: Orders from `/available_orders/` endpoint were showing as "assigned" instead of "pending".

**Fix**: Added intelligent status transformation in `src/services/api.ts:578-607`:
```typescript
private transformOrderStatus = (delivery: any, order: any): string => {
  // If order has no driver assigned, it should be pending
  if (!delivery?.driver || delivery?.driver === null || delivery?.driver === '') {
    return 'pending';
  }
  
  // If order has driver and is assigned, keep assigned status
  if (deliveryStatus === 'assigned' && delivery?.driver) {
    return 'assigned';
  }
  
  return deliveryStatus || orderStatus || 'pending';
};
```

## Expected Behavior

### Order Status Flow:
1. **`pending`** - Orders available for drivers to accept (from `/available_orders/`)
2. **`assigned`** - Orders accepted by a driver but not yet picked up
3. **`picked_up`** - Driver has picked up the order
4. **`in_transit`** - Order is being delivered
5. **`delivered`** - Order completed successfully

### Accept/Decline Button Logic:
- **Show buttons when**: 
  - Status is `pending`, OR
  - Status is `assigned` AND no driver is assigned (`driverId` is null/empty)
- **Hide buttons when**: 
  - Order is already assigned to a driver
  - Order status is beyond `assigned` (picked_up, delivered, etc.)

## Backend Requirements

The Django backend should ensure:

### 1. Available Orders Endpoint
```python
# /api/v1/delivery/deliveries/available_orders/
# Should return deliveries with:
# - No driver assigned (driver=null)
# - Status should be 'pending' or ready for assignment
```

### 2. Order Status States
```python
DELIVERY_STATUS_CHOICES = [
    ('pending', 'Pending'),           # Available for drivers
    ('assigned', 'Assigned'),         # Accepted by driver
    ('picked_up', 'Picked Up'),       # Driver has the order
    ('in_transit', 'In Transit'),     # Being delivered
    ('delivered', 'Delivered'),       # Completed
    ('cancelled', 'Cancelled'),       # Cancelled
    ('failed', 'Failed'),             # Failed delivery
]
```

### 3. Accept/Decline API Logic

**IMPORTANT QUESTION**: Is the available list per-driver or global?

#### Option A: Global Available List (Recommended)
```python
# Accept: /api/v1/delivery/deliveries/{id}/accept/
# - Set delivery.driver = current_driver
# - Set delivery.status = 'assigned'
# - Order disappears from ALL drivers' available lists

# Decline: /api/v1/delivery/deliveries/{id}/decline/
# - Keep delivery.driver = null
# - Keep delivery.status = 'pending' 
# - Order remains available for OTHER drivers
# - Only removes from current driver's personal "declined" list
```

#### Option B: Per-Driver Available List
```python
# Accept: /api/v1/delivery/deliveries/{id}/accept/
# - Set delivery.driver = current_driver
# - Set delivery.status = 'assigned'

# Decline: /api/v1/delivery/deliveries/{id}/decline/
# - Add to driver's personal decline list
# - Order disappears for THIS driver only
# - Other drivers still see the order
```

#### Current Frontend Behavior:
The React Native app currently removes declined orders from the local state:
```typescript
// OrderContext.tsx:416-420
const updatedOrders = state.orders.filter(order => order.id !== orderId);
await Storage.setItem(STORAGE_KEYS.ACTIVE_ORDERS, updatedOrders);
```

This suggests **Option B** (per-driver decline tracking) is expected.

## Testing Checklist

### Frontend Testing:
- [ ] Orders show with `pending` status initially
- [ ] Accept button works and changes status to `assigned`
- [ ] Decline button works and removes order from list
- [ ] Both buttons use correct ID (deliveryId when available)
- [ ] Modal countdown works correctly
- [ ] Error handling shows appropriate messages

### Backend Testing:
- [ ] `/available_orders/` returns unassigned deliveries
- [ ] Accept endpoint assigns driver and updates status
- [ ] Decline endpoint removes order from driver's list
- [ ] Status transitions are correct
- [ ] CORS and authentication work properly

### Integration Testing:
- [ ] Accept order → status changes → button disappears
- [ ] Decline order → order removed → new orders appear
- [ ] Network errors handled gracefully
- [ ] Multiple drivers can see same pending orders
- [ ] Only one driver can accept each order

## Debug Commands

### Check Order Status in React Native:
```javascript
// In DashboardScreen console logs:
console.log('Order status:', order.status);
console.log('Driver ID:', order.driverId);
console.log('Show accept button:', showAcceptButton);
```

### Check API Responses:
```bash
# Test available orders endpoint
curl -H "Authorization: Bearer <token>" \
     -H "Host: sirajjunior.192.168.100.51" \
     http://192.168.100.51:8000/api/v1/delivery/deliveries/available_orders/

# Test accept endpoint  
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Host: sirajjunior.192.168.100.51" \
     http://192.168.100.51:8000/api/v1/delivery/deliveries/{id}/accept/

# Test decline endpoint
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Host: sirajjunior.192.168.100.51" \
     http://192.168.100.51:8000/api/v1/delivery/deliveries/{id}/decline/
```