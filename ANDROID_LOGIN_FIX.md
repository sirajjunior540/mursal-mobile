# Android Login Fix Guide

## Quick Fix Steps

### 1. Update Your Environment Configuration

First, update your `.env` file to use the Android emulator's special IP address:

```bash
# For Android Emulator
SERVER_IP=10.0.2.2
SERVER_PORT=8000

# For Physical Device (replace with your computer's IP)
# SERVER_IP=192.168.1.163
# SERVER_PORT=8000
```

### 2. Run Django Server Correctly

Make sure your Django server is accessible from other devices:

```bash
# This binds to all interfaces (required for external access)
python manage.py runserver 0.0.0.0:8000

# NOT just:
# python manage.py runserver  # This only binds to localhost
```

### 3. Rebuild the App

After changing the `.env` file, you must rebuild:

```bash
# Stop Metro bundler (Ctrl+C)
# Clear cache and restart
npx react-native start --reset-cache

# In another terminal, rebuild Android
npx react-native run-android
```

## Debugging Tools Available

### From React Native Debugger Console:

```javascript
// 1. Quick network test
testNetwork()

// 2. Test login directly
testLogin('your_username', 'your_password')

// 3. Android-specific debugging
debugAndroidNetwork()

// 4. Find working endpoint automatically
quickFix.findWorkingEndpoint()

// 5. Show Android-specific fixes
quickFix.androidFixes()
```

## Common Issues and Solutions

### Issue 1: Network Request Failed

**For Android Emulator:**
- The emulator cannot access `localhost` or `127.0.0.1` on your host machine
- Use `10.0.2.2` instead - this is the emulator's special alias for the host machine

**For Physical Device:**
1. Find your computer's IP address:
   - Mac: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`
2. Update `.env` with your actual IP
3. Ensure both devices are on the same WiFi network

### Issue 2: Cleartext Traffic Blocked

Your `network_security_config.xml` already allows cleartext for development IPs. If you're using a different IP, add it:

```xml
<domain includeSubdomains="true">your.ip.address</domain>
```

### Issue 3: Connection Refused

This usually means:
1. Django server is not running
2. Django is only bound to localhost (use `0.0.0.0:8000`)
3. Firewall is blocking the connection
4. Wrong IP address in `.env`

## Step-by-Step Verification

1. **Verify Django is accessible:**
   ```bash
   # From your computer
   curl http://localhost:8000
   
   # Should also work with
   curl http://10.0.2.2:8000  # For emulator
   curl http://YOUR_IP:8000   # For physical device
   ```

2. **Check from the app:**
   ```javascript
   // In React Native Debugger
   quickFix.findWorkingEndpoint()
   ```

3. **If still failing, run full diagnostics:**
   ```javascript
   debugAndroidNetwork()
   ```

## Current Configuration

Based on your setup:
- API URL: `http://192.168.1.163:8000`
- Tenant: `sirajjunior`
- Login endpoint: `/api/v1/auth/token/`

## Emergency Fixes

If nothing else works:

1. **Kill all processes and restart:**
   ```bash
   # Kill Metro
   lsof -ti:8081 | xargs kill -9
   
   # Kill Django
   lsof -ti:8000 | xargs kill -9
   
   # Clean and rebuild
   cd android && ./gradlew clean && cd ..
   npx react-native start --reset-cache
   npx react-native run-android
   ```

2. **Use ngrok for testing:**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Expose your Django server
   ngrok http 8000
   
   # Use the ngrok URL in your .env
   SERVER_IP=your-ngrok-subdomain.ngrok.io
   SERVER_PORT=443
   SERVER_PROTOCOL=https
   ```

## Next Steps

1. Run `quickFix.findWorkingEndpoint()` to automatically find the correct configuration
2. Update your `.env` file with the working values
3. Rebuild the app
4. Test login

The debugging tools will show you exactly what's failing and suggest specific fixes.