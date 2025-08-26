# Django Multi-Tenant Setup for Physical Device Testing

## Current Configuration
- **Local IP**: `192.168.0.191`
- **Django Server**: `http://192.168.0.191:8000`
- **Tenant Host**: `sirajjunior.192.168.0.191`
- **Mobile App**: Configured to connect to your physical device

## Django Configuration Required

### 1. Update Django Settings (`settings.py`)

```python
# Add to ALLOWED_HOSTS
ALLOWED_HOSTS = [
    '192.168.0.191',
    '127.0.0.1',
    '192.168.0.191',  # Your local IP
    'sirajjunior.192.168.0.191',  # Tenant host
    'sirajjunior.192.168.0.191',  # For local development
    # Add your production domains here
]

# CORS Configuration (if using django-cors-headers)
CORS_ALLOWED_ORIGINS = [
    "http://192.168.0.191:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.191:8000",
]

# Allow all origins for development (REMOVE IN PRODUCTION)
CORS_ALLOW_ALL_ORIGINS = True  # Only for development

# CORS Headers for mobile app
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'host',  # Important for tenant resolution
]
```

### 2. Tenant Middleware Configuration

Ensure your tenant middleware handles the Host header correctly:

```python
# Example tenant middleware
class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract tenant from Host header
        host = request.META.get('HTTP_HOST', '').lower()
        
        # Handle different host formats
        if 'sirajjunior.' in host:
            tenant = 'sirajjunior'
        elif host.startswith('sirajjunior'):
            tenant = 'sirajjunior'
        else:
            tenant = 'default'  # fallback
        
        # Set tenant context
        request.tenant = tenant
        
        response = self.get_response(request)
        return response
```

### 3. API Endpoints

Ensure your API endpoints are accessible:

```python
# urls.py
urlpatterns = [
    path('api/v1/auth/', include('your_auth_app.urls')),
    path('api/v1/delivery/', include('your_delivery_app.urls')),
    # WebSocket routing
    path('ws/', include('your_websocket_app.routing')),
]
```

### 4. WebSocket Configuration (if using Django Channels)

```python
# asgi.py or routing.py
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter([
            path('ws/driver/orders/', YourWebSocketConsumer.as_asgi()),
        ])
    ),
})
```

## Testing the Connection

### 1. Start Django Development Server
```bash
# Make sure Django is running on all interfaces
python manage.py runserver 0.0.0.0:8000
```

### 2. Test API Endpoints
```bash
# Test basic connectivity
curl -H "Host: sirajjunior.192.168.0.191" http://192.168.0.191:8000/api/v1/auth/

# Test with tenant header
curl -H "Host: sirajjunior.192.168.0.191" \
     -H "Content-Type: application/json" \
     http://192.168.0.191:8000/api/v1/delivery/
```

### 3. Run Mobile App
```bash
# Make sure environment is configured
npm run setup:env

# Run on Android
npm run android

# Or run on iOS
npm run ios
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Django is running on `0.0.0.0:8000`, not `127.0.0.1:8000`
   - Check firewall settings on your development machine

2. **Host Not Allowed**
   - Add your IP and tenant host to `ALLOWED_HOSTS`
   - Restart Django development server

3. **CORS Errors**
   - Configure CORS headers properly
   - Allow the Host header in CORS configuration

4. **Tenant Not Found**
   - Check tenant middleware is handling Host header correctly
   - Verify the Host header format matches your tenant logic

### Debug Commands

```bash
# Check current IP
ifconfig | grep "inet.*broadcast" | grep -v "127.0.0.1"

# Test Django server
curl -v -H "Host: sirajjunior.192.168.0.191" http://192.168.0.191:8000/

# Reconfigure app for different IP
npm run setup:ip -- 192.168.1.100  # Replace with your IP
```

## Environment Management

### Development
```bash
npm run setup:env          # Auto-detect IP and configure
npm run setup:ip -- IP     # Use specific IP
```

### Production
- Update `.env` file with production URLs
- Use HTTPS endpoints
- Configure proper CORS settings
- Remove debug flags

## Security Notes

⚠️ **Important**: The current configuration allows HTTP traffic and has CORS_ALLOW_ALL_ORIGINS enabled. This is ONLY for development. For production:

1. Use HTTPS only
2. Configure specific CORS origins
3. Remove debug flags
4. Use environment-specific settings
5. Implement proper authentication and authorization