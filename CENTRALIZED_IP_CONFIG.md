# 🎯 Centralized IP Configuration

## Overview

Your IP address is now centralized in the `.env` file. When your network IP changes, you only need to update it in ONE place!

## Current Configuration

- **Current IP**: `192.168.1.170` (set in .env)
- **Server Port**: `8000`
- **Tenant**: `sirajjunior`

## 🚀 Quick Start - When Your IP Changes

### Option 1: Automatic Update (Recommended)

```bash
# Run the update script with your new IP
./update_ip.sh 192.168.1.XXX
```

This will:
- Update `.env` file
- Update Android network security config
- Update iOS Info.plist
- Update all test scripts
- Show you next steps

### Option 2: Manual Update

1. **Edit the .env file:**
   ```bash
   # Open .env
   nano .env
   
   # Change this line:
   SERVER_IP=192.168.1.XXX  # Your new IP
   ```

2. **That's it!** All other configurations read from this file.

## 📱 Mobile App Steps After IP Change

1. **Stop Metro bundler** (Ctrl+C)

2. **Clear cache and restart:**
   ```bash
   npx react-native start --reset-cache
   ```

3. **Rebuild the app:**
   ```bash
   # iOS
   npx react-native run-ios
   
   # Android
   npx react-native run-android
   ```

## 🐍 Django Backend Steps

1. **Get Django configuration:**
   ```bash
   python3 django_ip_config.py
   ```
   This will show you the exact ALLOWED_HOSTS to use.

2. **Update Django settings.py:**
   ```python
   ALLOWED_HOSTS = [
       'localhost',
       '127.0.0.1',
       '192.168.1.170',  # Your IP
       'sirajjunior.192.168.1.170',  # Tenant subdomain
       '10.0.2.2',  # Android emulator
   ]
   ```

3. **Run Django server:**
   ```bash
   # Option 1: Bind to all interfaces (recommended for development)
   python manage.py runserver 0.0.0.0:8000
   
   # Option 2: Bind to specific IP
   python manage.py runserver 192.168.1.170:8000
   ```

## 🧪 Testing the Connection

1. **Test from mobile app:**
   ```javascript
   // In React Native Debugger console
   testNetwork()
   testLogin('username', 'password')
   ```

2. **Test from command line:**
   ```bash
   # Basic test
   curl http://192.168.1.170:8000/
   
   # Test with tenant header
   curl -H "Host: sirajjunior.192.168.1.170" http://192.168.1.170:8000/
   ```

3. **Run connection test script:**
   ```bash
   node test_backend_connection.js
   ```

## 🤖 Android Specific

For Android emulator, the app automatically uses `10.0.2.2` when it detects:
- Platform is Android
- SERVER_IP is set to localhost

No manual changes needed!

## 📝 How It Works

1. **`.env` file** - Single source of truth for IP address
2. **`src/config/environment.ts`** - Reads from .env and builds URLs
3. **All API calls** - Use the dynamic `ENV.API_BASE_URL`
4. **Platform configs** - Android and iOS read from .env during build

## 🚨 Troubleshooting

### "Network request failed" on Android
```javascript
// Run in React Native Debugger
fixAndroidLogin()
```

### Can't find working endpoint
```javascript
// This will scan and find working configuration
quickFix.findWorkingEndpoint()
```

### Django not accessible
- Make sure to use `0.0.0.0:8000` not just `runserver`
- Check firewall settings
- Ensure devices are on same network

## 📁 Files That Use IP Configuration

These files automatically use the IP from `.env`:
- `src/services/api.ts` - API client
- `src/config/environment.ts` - Environment config
- `src/services/websocket.ts` - WebSocket connections
- All API endpoint files

## 🔄 Future IP Changes

Just run:
```bash
./update_ip.sh <new_ip>
```

Or manually update `.env` and rebuild the app. That's it!

---

**Remember**: The `.env` file is your single source of truth. Change the IP there, and everything else follows! 🎉