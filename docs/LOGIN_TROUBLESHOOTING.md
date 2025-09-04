# Login Troubleshooting Guide

## Quick Diagnosis

### 1. From the Login Screen (Development Mode)
- Tap the "Run Diagnostics" button that appears below the login form
- Check the console output for detailed diagnostic information

### 2. From React Native Debugger Console
```javascript
// Test basic connectivity
testNetwork()

// Test login with specific credentials
testLogin('your_username', 'your_password')

// Run full diagnostics
import('./src/utils/loginDiagnostics').then(m => m.runLoginDiagnostics())
```

## Common Issues and Solutions

### 1. Network Request Failed

**Symptoms:**
- Error: "Network request failed"
- Can't reach server

**Solutions:**

#### A. Check Server is Running
```bash
# On your backend server
python manage.py runserver 0.0.0.0:8000
```

#### B. Verify IP Address
- The app is configured to use: `192.168.100.51:8000`
- Make sure this is your server's actual IP
- Update `.env` file if needed:
```
SERVER_IP=your.actual.ip.address
```

#### C. Check Firewall
- Ensure port 8000 is open
- On macOS: System Preferences → Security & Privacy → Firewall
- On Windows: Windows Defender Firewall → Allow an app

#### D. Same Network
- Ensure phone and server are on the same WiFi network
- Check phone isn't on cellular data

### 2. HTTP Cleartext Traffic Blocked (Android)

**Symptoms:**
- Works on iOS but not Android
- Error mentions "cleartext" or "not permitted"

**Solution:**
Add network security config for Android 9+:

1. Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.100.51</domain>
        <!-- Add your server IP here -->
    </domain-config>
</network-security-config>
```

2. Update `android/app/src/main/AndroidManifest.xml`:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### 3. Invalid Credentials

**Symptoms:**
- Error: "Invalid credentials" or similar
- Status code 401

**Debugging Steps:**

1. Check exact error from server:
```javascript
testLogin('username', 'password')
```

2. Verify backend expectations:
- Username field name: `username`
- Password field name: `password`
- Tenant field name: `tenant_id`

3. Check tenant configuration:
- Current tenant: `sirajjunior`
- Verify this tenant exists in your backend

### 4. Token Storage Issues

**Symptoms:**
- Login seems successful but redirects back to login
- "No token found" in logs

**Solutions:**

1. Clear all storage:
```javascript
import { SecureStorage } from './src/utils/storage';
SecureStorage.clearAll();
```

2. Check Keychain/Keystore access (iOS/Android)
- iOS: May need to enable Keychain Sharing in Xcode
- Android: Check if device has secure lock screen

### 5. API Response Format Issues

**Symptoms:**
- Login request succeeds but app shows error
- "Invalid response from server"

**Expected Response Format:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": 123,
  "username": "driver1",
  "email": "driver@example.com",
  "role": "driver",
  "is_staff": false,
  "is_superuser": false,
  
  // Optional driver profile fields
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "rating": 4.5,
  "total_deliveries": 150,
  "is_online": false,
  "profile_image": "https://..."
}
```

### 6. CORS Issues (if using web debugger)

**Symptoms:**
- Works on device but not in web debugger
- CORS policy errors

**Solution:**
Add CORS headers to Django:
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://192.168.100.51:3000",
    "http://192.168.100.51:8081",
    # Add your dev machine IP
    "http://192.168.1.xxx:8081",
]
```

## Backend Checklist

Ensure your Django backend has:

1. **URL Pattern:**
```python
path('api/v1/auth/token/', YourTokenView.as_view(), name='token'),
```

2. **View accepts POST with:**
- `username`
- `password`
- `tenant_id` (optional)

3. **Returns JWT tokens:**
- `access` token
- `refresh` token
- User profile data

4. **CORS configured** (if needed)

5. **Authentication works:**
```bash
curl -X POST http://192.168.100.51:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","tenant_id":"sirajjunior"}'
```

## Debug Mode Features

When running in development (`__DEV__` is true):

1. **Console Logging:** All API calls are logged
2. **Diagnostic Button:** Visible on login screen
3. **Global Functions:** `testLogin()` and `testNetwork()`
4. **Detailed Errors:** More verbose error messages

## Still Having Issues?

1. **Enable Maximum Logging:**
```javascript
// In environment.ts
DEBUG: {
  API_CALLS: true,
  REALTIME: true,
  LOCATION: true,
  PERFORMANCE: true,
}
```

2. **Check React Native Logs:**
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

3. **Inspect Network Traffic:**
- Use React Native Debugger
- Or Flipper for network inspection
- Or Charles Proxy for detailed analysis

4. **Common Quick Fixes:**
```bash
# Clear caches
cd ios && pod install && cd ..
npx react-native start --reset-cache

# Android specific
cd android && ./gradlew clean && cd ..

# Rebuild
npx react-native run-ios
# or
npx react-native run-android
```