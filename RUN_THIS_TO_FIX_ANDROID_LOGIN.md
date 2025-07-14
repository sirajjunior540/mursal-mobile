# 🚨 Android Login Fix - Quick Instructions

## If login is failing on Android, follow these steps:

### Step 1: Open React Native Debugger
Press `Cmd+D` (iOS) or `Cmd+M` (Android) in the app and select "Debug with Chrome"

### Step 2: Run this in the console:
```javascript
fixAndroidLogin()
```

This will:
- Test your current configuration
- Find a working server endpoint
- Tell you exactly what to change

### Step 3: Follow the instructions
The script will tell you to either:

**Option A - For Android Emulator:**
1. Edit `.env` file:
   ```
   SERVER_IP=10.0.2.2
   ```
2. Restart Metro: `Ctrl+C` then `npx react-native start --reset-cache`
3. Rebuild: `npx react-native run-android`

**Option B - For Physical Device:**
1. Find your computer's IP address
2. Edit `.env` file with your actual IP
3. Restart and rebuild as above

### If still having issues:
```javascript
// Run these for more debugging:
testNetwork()
debugAndroidNetwork()
quickFix.findWorkingEndpoint()
```

### Make sure Django is running correctly:
```bash
# This is REQUIRED for external access:
python manage.py runserver 0.0.0.0:8000

# NOT just:
python manage.py runserver
```

## That's it! The `fixAndroidLogin()` command will diagnose and fix your issue.