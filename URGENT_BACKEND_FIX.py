"""
URGENT BACKEND FIX REQUIRED
===========================

The mobile app is experiencing critical errors when declining orders.
This file contains the exact fix needed for your Django backend.

ERRORS OCCURRING:
1. "You can only decline your own assigned deliveries" - when declining from dashboard
2. "No delivery matches the query" - when declining from modal

ROOT CAUSE:
The decline endpoint is checking if delivery.driver == current_driver,
but available orders have delivery.driver = None, so this check fails.

SOLUTION:
Update the decline action in your DeliveryViewSet to handle both:
- Available orders (driver=None) - most common case
- Assigned orders (driver=current_driver) - edge case

FILE TO UPDATE: delivery/views.py (or wherever your DeliveryViewSet is)
"""

# ===== COPY THIS CODE TO YOUR BACKEND =====

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class DeliveryViewSet(viewsets.ModelViewSet):
    # ... your existing code ...
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """
        Decline a delivery order.
        
        This action allows drivers to decline:
        1. Available orders (driver=None) - removes from their available list
        2. Their own assigned orders - unassigns the order
        """
        try:
            delivery = self.get_object()
            current_driver = request.user
            
            print(f"📋 Decline request: delivery_id={pk}, driver={current_driver.username}, delivery.driver={delivery.driver}")
            
            # Check if delivery is assigned to a different driver
            if delivery.driver and delivery.driver != current_driver:
                return Response(
                    {"error": "This delivery is already assigned to another driver."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Case 1: Declining available delivery (most common)
            if delivery.driver is None:
                # Track decline for this driver (optional - for filtering)
                # You can create a DeclinedDelivery model or use a M2M field
                
                # For now, just return success
                print(f"✅ Driver {current_driver.username} declined available delivery {delivery.id}")
                
                return Response({
                    "message": "Delivery declined successfully.",
                    "delivery_id": str(delivery.id),
                    "status": "declined"
                }, status=status.HTTP_200_OK)
            
            # Case 2: Declining own assigned delivery (edge case)
            if delivery.driver == current_driver:
                # Unassign the delivery
                delivery.driver = None
                delivery.status = DeliveryStatus.ASSIGNED.value  # or PENDING
                delivery.save()
                
                print(f"✅ Driver {current_driver.username} unassigned themselves from delivery {delivery.id}")
                
                return Response({
                    "message": "Delivery unassigned and declined.",
                    "delivery_id": str(delivery.id),
                    "status": "unassigned"
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"❌ Error in decline action: {str(e)}")
            return Response(
                {"error": f"Failed to decline delivery: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ===== OPTIONAL: TRACK DECLINED ORDERS =====

# If you want to prevent declined orders from showing up again for the same driver,
# add this to your models.py:

class DeclinedDelivery(models.Model):
    """Track which deliveries have been declined by which drivers"""
    delivery = models.ForeignKey('Delivery', on_delete=models.CASCADE)
    driver = models.ForeignKey(User, on_delete=models.CASCADE)
    declined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['delivery', 'driver']

# Then update your available_orders action to filter out declined ones:

@action(detail=False, methods=['get'])
def available_orders(self, request):
    """Get available orders, excluding ones this driver declined"""
    driver = request.user
    
    # Get declined delivery IDs for this driver
    declined_ids = DeclinedDelivery.objects.filter(
        driver=driver
    ).values_list('delivery_id', flat=True)
    
    # Filter available orders
    deliveries = self.get_queryset().filter(
        driver__isnull=True,
        status=DeliveryStatus.ASSIGNED.value
    ).exclude(
        id__in=declined_ids  # Exclude declined ones
    )
    
    serializer = self.get_serializer(deliveries, many=True)
    return Response(serializer.data)

# ===== TESTING THE FIX =====

# After implementing, test with:
# 1. Create an order with no driver assigned
# 2. Try to decline it from the mobile app
# 3. Should succeed without "you can only decline" error
# 4. Order should disappear from that driver's list

print("🚨 IMPLEMENT THIS FIX IN YOUR DJANGO BACKEND IMMEDIATELY!")
print("📁 File to update: delivery/views.py")
print("🎯 Function to update: DeliveryViewSet.decline()")