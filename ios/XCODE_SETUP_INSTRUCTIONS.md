# Xcode Setup Instructions for iOS Build

## Current Status
- ✅ React Native Firebase packages are installed
- ✅ Firebase is configured in AppDelegate.swift  
- ✅ All CocoaPods dependencies are installed
- ⚠️ Temporary GoogleService-Info.plist created (needs real one)
- ❌ Build fails with error code 70

## Steps to Fix in Xcode

### 1. Open Project in Xcode
```bash
open DriverAppNew.xcworkspace
```
**Important:** Always use the `.xcworkspace` file, NOT the `.xcodeproj` file

### 2. Add GoogleService-Info.plist to Xcode Project
1. In Xcode, right-click on the `DriverAppNew` folder in the project navigator
2. Select "Add Files to DriverAppNew..."
3. Navigate to `ios/DriverAppNew/GoogleService-Info.plist`
4. Make sure these options are checked:
   - ✅ Copy items if needed
   - ✅ DriverAppNew target is selected
5. Click "Add"

### 3. Check Build Settings
1. Select the DriverAppNew project in the navigator
2. Select the DriverAppNew target
3. Go to Build Settings tab
4. Verify:
   - iOS Deployment Target: 15.1 or higher
   - Swift Language Version: 5.0 or higher

### 4. Check Signing & Capabilities
1. Go to "Signing & Capabilities" tab
2. Ensure:
   - Team is selected (if you have a developer account)
   - Bundle Identifier matches your Firebase configuration
   - Automatically manage signing is checked

### 5. Clean and Build
1. Product → Clean Build Folder (Shift+Cmd+K)
2. Product → Build (Cmd+B)

### 6. Check Build Errors
The detailed error messages in Xcode will show exactly what's causing error code 70. Common issues:
- Missing provisioning profile
- Code signing issues
- Missing capabilities
- Swift/Objective-C bridging issues

### 7. If Firebase Import Fails
If you see "No such module 'FirebaseCore'" error:
1. Close Xcode
2. Run: `cd ios && pod deintegrate && pod install`
3. Open the workspace again

### 8. Alternative: Use React Native Firebase
Since you want to keep React Native Firebase for Android compatibility, the current setup should work. The packages are already configured to handle the native Firebase setup automatically.

## To Run After Fixing
```bash
# From project root
cd /Users/admin/Documents/repo/mursal-backend/DriverAppNew
npx react-native run-ios

# Or run Metro bundler separately
npm start
# Then in another terminal
npx react-native run-ios --no-packager
```

## Real Firebase Configuration
Remember to replace the dummy `GoogleService-Info.plist` with the real one from your Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the iOS app
4. Download `GoogleService-Info.plist`
5. Replace the dummy file in `ios/DriverAppNew/`