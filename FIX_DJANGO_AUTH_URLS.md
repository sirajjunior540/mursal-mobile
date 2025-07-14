# 🚨 Django Auth URL Fix

The issue: Your Django tenant system is working but the auth URLs aren't registered for the tenant URLconf.

## The Problem

```
Request host: sirajjunior.192.168.1.163
URLConf from TENANT_TYPES: mursal.urls_tenants
Not Found: /api/v1/auth/token/
```

This means the `/api/v1/auth/token/` endpoint isn't included in your tenant's URLconf.

## Quick Fix

### 1. Check your Django URL configuration

In your Django project, you need to ensure the auth URLs are included in `mursal.urls_tenants`:

```python
# mursal/urls_tenants.py
from django.urls import path, include

urlpatterns = [
    # ... other patterns ...
    
    # Add this line to include auth URLs for tenants
    path('api/v1/auth/', include('your_auth_app.urls')),
    
    # Or if using a router:
    path('api/v1/', include('your_api_urls')),
]
```

### 2. Verify the auth endpoint exists

Check that your auth app has the token endpoint:

```python
# your_auth_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('token/', views.TokenView.as_view(), name='token'),
    # ... other auth endpoints ...
]
```

### 3. Test the endpoint directly

```bash
# Test with tenant header
curl -X POST http://192.168.1.163:8000/api/v1/auth/token/ \
  -H "Host: sirajjunior.192.168.1.163" \
  -H "Content-Type: application/json" \
  -d '{"username":"driver","password":"your_password","tenant_id":"sirajjunior"}'

# Test without tenant header (should work if public schema has the URL)
curl -X POST http://192.168.1.163:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"driver","password":"your_password"}'
```

### 4. Check Django tenant configuration

Make sure your tenant configuration includes auth URLs:

```python
# settings.py
TENANT_TYPES = {
    "public": {
        "APPS": [
            "django.contrib.auth",
            "your_auth_app",
            # ... other apps ...
        ],
        "URLCONF": "mursal.urls_public",
    },
    "clients": {
        "APPS": [
            "django.contrib.auth",
            "your_auth_app",  # Make sure auth app is here
            # ... other apps ...
        ],
        "URLCONF": "mursal.urls_tenants",  # This needs to include auth URLs
    },
}
```

### 5. Debug URL patterns

Add this to temporarily debug what URLs are available:

```python
# In your Django shell or a management command
from django.urls import get_resolver
from django_tenants.utils import get_tenant_model

# Get a tenant
TenantModel = get_tenant_model()
tenant = TenantModel.objects.get(schema_name='sirajjunior')

# Activate the tenant
from django.db import connection
connection.set_tenant(tenant)

# Print available URLs
resolver = get_resolver()
for pattern in resolver.url_patterns:
    print(pattern)
```

## The Solution

Most likely, you need to add the auth URLs to your `mursal/urls_tenants.py` file. The tenant system is working correctly (it's routing to the right URLconf), but that URLconf doesn't include the auth endpoints.

## Test After Fix

Once you've added the auth URLs to the tenant URLconf:

1. Restart Django
2. Test from the app:
   ```javascript
   testLogin('driver', 'password')
   ```

3. Or from curl:
   ```bash
   curl -X POST http://192.168.1.163:8000/api/v1/auth/token/ \
     -H "Host: sirajjunior.192.168.1.163" \
     -H "Content-Type: application/json" \
     -d '{"username":"driver","password":"password","tenant_id":"sirajjunior"}'
   ```

The key is ensuring that `/api/v1/auth/token/` is available in the `mursal.urls_tenants` URLconf.