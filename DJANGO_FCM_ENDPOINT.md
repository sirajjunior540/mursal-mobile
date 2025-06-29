# Django FCM Token Endpoint

Add this to your Django backend to handle FCM token updates from the mobile app.

## 1. Add to your Driver model (if not already present)

```python
# In your driver/models.py or auth/models.py
from django.db import models

class Driver(models.Model):
    # ... your existing fields ...
    fcm_token = models.TextField(blank=True, null=True, help_text="Firebase Cloud Messaging token")
    fcm_token_updated_at = models.DateTimeField(auto_now=True)
    
    def update_fcm_token(self, token):
        """Update FCM token and timestamp"""
        self.fcm_token = token
        self.save(update_fields=['fcm_token', 'fcm_token_updated_at'])
```

## 2. Add the API view

```python
# In your auth/views.py or drivers/views.py
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_fcm_token(request, driver_id):
    """Update FCM token for a driver"""
    try:
        # Ensure the user can only update their own FCM token
        if str(request.user.id) != str(driver_id):
            return Response(
                {'error': 'You can only update your own FCM token'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        fcm_token = request.data.get('fcm_token')
        if not fcm_token:
            return Response(
                {'error': 'fcm_token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the user's FCM token
        driver = request.user
        driver.fcm_token = fcm_token
        driver.save(update_fields=['fcm_token'])
        
        return Response({
            'success': True,
            'message': 'FCM token updated successfully'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# OR if you're using ViewSets, add this as an action:
from rest_framework.viewsets import ModelViewSet

class DriverViewSet(ModelViewSet):
    # ... your existing viewset code ...
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_fcm_token(self, request, pk=None):
        """Update FCM token for a driver"""
        driver = self.get_object()
        
        # Ensure the user can only update their own FCM token
        if request.user.id != driver.id:
            return Response(
                {'error': 'You can only update your own FCM token'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        fcm_token = request.data.get('fcm_token')
        if not fcm_token:
            return Response(
                {'error': 'fcm_token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        driver.fcm_token = fcm_token
        driver.save(update_fields=['fcm_token'])
        
        return Response({
            'success': True,
            'message': 'FCM token updated successfully'
        })
```

## 3. Add URL pattern

```python
# In your auth/urls.py or drivers/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ... your existing URLs ...
    path('drivers/<int:driver_id>/update_fcm_token/', views.update_fcm_token, name='update_fcm_token'),
    
    # OR if using ViewSet, the URL will be automatically generated as:
    # /api/v1/auth/drivers/{id}/update_fcm_token/
]
```

## 4. Database Migration

Run this to add the FCM token field to your database:

```bash
python manage.py makemigrations
python manage.py migrate
```

## 5. Testing the Endpoint

```bash
# Test with curl
curl -X POST http://your-server:8000/api/v1/auth/drivers/1/update_fcm_token/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Host: sirajjunior.192.168.1.137" \
  -d '{"fcm_token": "test_token_12345"}'
```

## 6. Expected Response

```json
{
  "success": true,
  "message": "FCM token updated successfully"
}
```

Once you add this endpoint to your Django backend, the mobile app will be able to register FCM tokens successfully and you won't see the "failed to send fcm token to backend" error anymore.