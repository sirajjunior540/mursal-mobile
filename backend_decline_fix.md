# Backend Decline API Fix

## 🚨 Current Problem

The backend decline endpoint is rejecting requests with:
```
"You can only decline your own assigned deliveries."
```

This is incorrect logic for a delivery app. The error shows the backend expects:
- Order must be already assigned to the current driver
- Only then can the driver decline it

## ✅ Correct Behavior

Drivers should be able to decline:
1. **Available orders** (not yet assigned to anyone) - PRIMARY USE CASE
2. **Orders assigned to them** (edge case for after acceptance)

## 🛠️ Django Backend Fix Required

### Current (Broken) Logic:
```python
# In delivery ViewSet decline action
def decline(self, request, pk=None):
    delivery = self.get_object()
    
    # ❌ WRONG: Only allows declining own assigned deliveries
    if delivery.driver != request.user.driver:
        return Response(
            {"error": "You can only decline your own assigned deliveries."}, 
            status=400
        )
    # ... rest of logic
```

### Fixed Logic:
```python
# In delivery ViewSet decline action
def decline(self, request, pk=None):
    delivery = self.get_object()
    current_driver = request.user.driver
    
    # ✅ CORRECT: Allow declining available OR own assigned deliveries
    if delivery.driver is not None and delivery.driver != current_driver:
        return Response(
            {"error": "This delivery is already assigned to another driver."}, 
            status=400
        )
    
    # Case 1: Declining available delivery (driver=null)
    if delivery.driver is None:
        # Track the decline for this driver
        DriverOrderInteraction.objects.update_or_create(
            driver=current_driver,
            delivery=delivery,
            defaults={'action': 'declined'}
        )
        
        return Response({
            "message": "Delivery declined. It will no longer appear in your available orders."
        })
    
    # Case 2: Declining own assigned delivery (rare case)
    if delivery.driver == current_driver:
        # Unassign the delivery and mark as declined
        delivery.driver = None
        delivery.status = 'pending'  # Back to available pool
        delivery.save()
        
        # Track the decline
        DriverOrderInteraction.objects.update_or_create(
            driver=current_driver,
            delivery=delivery,
            defaults={'action': 'declined'}
        )
        
        return Response({
            "message": "Delivery unassigned and declined."
        })
```

## 📋 Additional Backend Requirements

### 1. DriverOrderInteraction Model
```python
class DriverOrderInteraction(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE)
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=[
        ('viewed', 'Viewed'),
        ('declined', 'Declined'),
        ('accepted', 'Accepted'),
    ])
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['driver', 'delivery']
```

### 2. Updated available_orders Endpoint
```python
def available_orders(self, request):
    current_driver = request.user.driver
    
    # Get unassigned deliveries
    available_deliveries = Delivery.objects.filter(
        driver__isnull=True,
        status='pending'
    )
    
    # Exclude deliveries this driver has declined
    declined_ids = DriverOrderInteraction.objects.filter(
        driver=current_driver,
        action='declined'
    ).values_list('delivery_id', flat=True)
    
    available_deliveries = available_deliveries.exclude(id__in=declined_ids)
    
    serializer = self.get_serializer(available_deliveries, many=True)
    return Response(serializer.data)
```

## 🔧 Quick Backend Test

### Test the Current Behavior:
```bash
# 1. Get available orders
curl -H "Authorization: Bearer <token>" \
     -H "Host: sirajjunior.192.168.0.191" \
     http://192.168.0.191:8000/api/v1/delivery/deliveries/available_orders/

# 2. Try to decline an available order (currently fails)
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Host: sirajjunior.192.168.0.191" \
     http://192.168.0.191:8000/api/v1/delivery/deliveries/19/decline/
```

### Expected Response After Fix:
```json
{
    "message": "Delivery declined. It will no longer appear in your available orders."
}
```

## 🎯 Implementation Priority

1. **HIGH PRIORITY**: Fix the decline permission logic
2. **MEDIUM PRIORITY**: Add DriverOrderInteraction tracking
3. **LOW PRIORITY**: Update available_orders to exclude declined

The minimum fix is to change the permission check in the decline endpoint to allow declining unassigned deliveries.

## 🧪 Frontend Testing After Fix

Once the backend is fixed, test:
1. ✅ Driver can decline available orders
2. ✅ Declined orders disappear from that driver's list
3. ✅ Other drivers still see the same orders
4. ✅ Driver can accept other available orders normally

The current frontend implementation will work correctly once the backend allows declining unassigned deliveries.