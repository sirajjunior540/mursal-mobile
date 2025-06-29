# Quick Django Backend Fix for Decline API
# File: views.py or wherever your DeliveryViewSet is located

"""
PROBLEM: Backend only allows declining already-assigned deliveries
SOLUTION: Allow declining available (unassigned) deliveries

Replace the decline action in your DeliveryViewSet with this code:
"""

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

@action(detail=True, methods=['post'])
def decline(self, request, pk=None):
    """
    Decline a delivery order.
    Drivers can decline:
    1. Available deliveries (driver=null) - Primary use case
    2. Their own assigned deliveries (edge case)
    """
    delivery = self.get_object()
    current_driver = request.user.driver
    
    # Check if delivery is assigned to a different driver
    if delivery.driver is not None and delivery.driver != current_driver:
        return Response(
            {"error": "This delivery is already assigned to another driver."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Case 1: Declining available delivery (most common)
    if delivery.driver is None:
        # Optional: Track decline for analytics/filtering
        # You can implement DriverOrderInteraction model later
        
        return Response({
            "message": "Delivery declined successfully.",
            "delivery_id": delivery.id,
            "status": "declined"
        }, status=status.HTTP_200_OK)
    
    # Case 2: Declining own assigned delivery (rare)
    if delivery.driver == current_driver:
        # Unassign the delivery
        delivery.driver = None
        delivery.status = 'pending'  # Back to available pool
        delivery.save()
        
        return Response({
            "message": "Delivery unassigned and declined.",
            "delivery_id": delivery.id,
            "status": "unassigned"
        }, status=status.HTTP_200_OK)

"""
MINIMAL FIX (if you just want to make it work quickly):

@action(detail=True, methods=['post'])
def decline(self, request, pk=None):
    delivery = self.get_object()
    current_driver = request.user.driver
    
    # Allow declining if not assigned to someone else
    if delivery.driver is not None and delivery.driver != current_driver:
        return Response(
            {"error": "This delivery is already assigned to another driver."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Success response for any valid decline
    return Response({
        "message": "Delivery declined successfully.",
        "delivery_id": delivery.id
    }, status=status.HTTP_200_OK)
"""

# After making this change:
# 1. Restart your Django server
# 2. Test the decline functionality from the mobile app
# 3. Available orders should be declinable without errors