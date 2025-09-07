# Network Connection Checklist for Physical Phone

## 1. Verify Both Devices on Same Network
- Your computer IP: 192.168.1.192
- Make sure your phone is connected to the same Wi-Fi network
- Check phone's Wi-Fi settings to confirm

## 2. Test Connection from Phone
Open your phone's browser and navigate to:
```
http://192.168.1.192:8000/whoami/
```

You should see a response like "mursal multi-tenant ecommerce delivery platform"

## 3. If Connection Fails

### On macOS, check firewall:
```bash
# Check if firewall is enabled
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Allow incoming connections for Python (Django)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/bin/python3
```

### Make sure Django is binding to all interfaces:
Your Django server should be running with:
```bash
python manage.py runserver 0.0.0.0:8000
```
NOT just:
```bash
python manage.py runserver  # This only binds to 192.168.1.192
```

## 4. Clear React Native Cache
Sometimes the app caches old configuration:
```bash
cd /Users/abdallah/Documents/mursal/DriverAppNew
npx react-native start --reset-cache
```

## 5. Rebuild the App
If the IP was changed recently, you might need to rebuild:
```bash
# For Android
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

## 6. Check the Network Diagnostic
The app now shows a network diagnostic component at the bottom of the login screen (in dev mode).
It will show:
- Green dot: Connected successfully
- Red dot: Connection failed (with error details)
- Orange dot: Checking connection

## 7. Common Issues

### Issue: "Network request failed"
- Usually means the phone can't reach the computer
- Check firewall and same network

### Issue: "Invalid host header"
- Django's ALLOWED_HOSTS might need updating
- Add your IP to ALLOWED_HOSTS in Django settings

### Issue: Timeout
- Network might be slow
- Firewall blocking connection
- Django not running or not bound to 0.0.0.0