# 🔧 Troubleshooting Authentication Issues

## Current Issue: "Realtime service error: authentication failed"

This error occurs because the realtime service is trying to connect before the user has logged in, or there's an issue with the Django backend setup.

## 🔍 Debug Steps

### 1. Use the Built-in Debug Panel

The login screen now has a debug panel (only visible in development):

1. **Open the app** on your device
2. **Go to the login screen**
3. **Tap "🔧 Show Debug"** at the bottom
4. **Tap "Test Connection"** to run diagnostic tests

This will test:
- ✅ Basic API connectivity 
- ✅ Django tenant configuration
- ✅ Login endpoint functionality

### 2. Check Django Server Status

Make sure your Django server is running properly:

```bash
# Start Django on all interfaces (important for physical device access)
python manage.py runserver 0.0.0.0:8000

# Check if it's accessible from your network
curl -H "Host: sirajjunior.192.168.1.153" http://192.168.1.153:8000/
```

### 3. Verify Django Configuration

Check your Django `settings.py`:

```python
# REQUIRED: Add your IP and tenant host to ALLOWED_HOSTS
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '192.168.1.153',  # Your development machine IP
    'sirajjunior.192.168.1.153',  # Tenant host
    'sirajjunior.localhost',  # For local development
]

# CORS Configuration (if using django-cors-headers)
CORS_ALLOW_ALL_ORIGINS = True  # Only for development!

# Ensure these headers are allowed
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding', 
    'authorization',
    'content-type',
    'host',  # Important for tenant resolution
    'x-csrftoken',
    'x-requested-with',
]
```

### 4. Check Your Django URLs

Ensure these endpoints exist and are accessible:

```python
# urls.py
urlpatterns = [
    path('api/v1/auth/', include('your_auth_app.urls')),
    path('api/v1/delivery/', include('your_delivery_app.urls')),
    # Add a simple health check
    path('health/', lambda r: JsonResponse({'status': 'ok'})),
]
```

### 5. Test API Endpoints Manually

```bash
# Test basic connectivity
curl -v -H "Host: sirajjunior.192.168.1.153" http://192.168.1.153:8000/health/

# Test auth endpoint
curl -v -H "Host: sirajjunior.192.168.1.153" \
     -H "Content-Type: application/json" \
     http://192.168.1.153:8000/api/v1/auth/

# Test login endpoint (replace with actual credentials)
curl -v -H "Host: sirajjunior.192.168.1.153" \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"testpass","tenantId":"sirajjunior"}' \
     http://192.168.1.153:8000/api/v1/auth/login/
```

## 🐛 Common Issues & Solutions

### Issue 1: "Connection refused" 
**Cause**: Django server not accessible from network
**Solution**: 
- Start Django with `python manage.py runserver 0.0.0.0:8000`
- Check firewall settings
- Verify IP address is correct

### Issue 2: "DisallowedHost" error
**Cause**: Django ALLOWED_HOSTS doesn't include your IP/host
**Solution**: Add `192.168.1.153` and `sirajjunior.192.168.1.153` to ALLOWED_HOSTS

### Issue 3: "CORS error"
**Cause**: Django not configured to accept requests from mobile app
**Solution**: Install and configure django-cors-headers properly

### Issue 4: "404 Not Found" on API endpoints
**Cause**: URLs not configured or tenant middleware issues
**Solution**: 
- Check Django URL configuration
- Verify tenant middleware is working
- Test endpoints without tenant first

### Issue 5: "Authentication failed" even with correct credentials
**Cause**: 
- Wrong API endpoint format
- Tenant middleware not handling Host header correctly
- Token format issues

**Solution**:
- Check the exact format your Django login endpoint expects
- Verify tenant middleware extracts tenant from Host header
- Check token generation and validation

## 🔧 Quick Fixes

### Fix 1: Update IP Address (if changed)
```bash
npm run setup:ip -- YOUR_NEW_IP
```

### Fix 2: Reset Environment
```bash
npm run setup:env
```

### Fix 3: Clear App Data
```bash
# Android
adb shell pm clear com.driverappnew

# iOS - Delete and reinstall app
```

### Fix 4: Rebuild App
```bash
npm run clean:all
npm run android  # or npm run ios
```

## 📱 Mobile App Debug Logs

The app now has enhanced debug logging. Check the logs for:

```
[API] GET http://192.168.1.153:8000/api/v1/auth/
[API] Host header: sirajjunior.192.168.1.153
[API] Using auth token: abcd1234...
```

If you see authentication errors, the issue is likely:
1. Django server not running or accessible
2. ALLOWED_HOSTS configuration
3. API endpoint not found
4. Tenant middleware issues

## 🆘 Next Steps

1. **First**: Use the debug panel in the app to test connectivity
2. **Then**: Check Django server logs for incoming requests
3. **Finally**: Compare the app's requests with what Django expects

The debug panel will show you exactly what's happening with the connection and help identify whether the issue is:
- Network connectivity ❌
- Django configuration ❌  
- API endpoint issues ❌
- Authentication logic ❌

This will help us pinpoint the exact problem! 🎯