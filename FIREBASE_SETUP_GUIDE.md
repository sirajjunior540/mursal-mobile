# Firebase Push Notification Setup Guide for Mursal Driver App

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Mursal Driver App.

## 1. Create a Firebase Account and Project

1. **Create a Firebase Account**:
   - Go to [https://firebase.google.com/](https://firebase.google.com/)
   - Click "Get Started" and sign in with your Google account

2. **Create a New Firebase Project**:
   - Click "Add project"
   - Enter a project name (e.g., "Mursal Driver App")
   - Choose whether to enable Google Analytics (recommended)
   - Click "Create project"

3. **Register Your App with Firebase**:
   - On the Firebase project dashboard, click the Android icon to add an Android app
   - Enter your Android package name (found in `android/app/build.gradle` under `applicationId`)
   - Enter a nickname for your app (optional)
   - Enter your SHA-1 signing certificate (optional for initial setup, required for production)
   - Click "Register app"
   - Download the `google-services.json` file

   - Click the iOS icon to add an iOS app
   - Enter your iOS bundle ID (found in Xcode project settings)
   - Enter a nickname for your app (optional)
   - Enter your App Store ID (optional)
   - Click "Register app"
   - Download the `GoogleService-Info.plist` file

## 2. Add Firebase Configuration Files to Your Project

### Android Setup

1. **Add the google-services.json file**:
   - Place the downloaded `google-services.json` file in the `android/app/` directory

2. **Update build.gradle files**:
   - In `android/build.gradle`, add to the `buildscript` > `dependencies` section:
     ```gradle
     classpath 'com.google.gms:google-services:4.3.15'
     ```

   - In `android/app/build.gradle`, add at the bottom of the file:
     ```gradle
     apply plugin: 'com.google.gms.google-services'
     ```

### iOS Setup

1. **Add the GoogleService-Info.plist file**:
   - Open your iOS project in Xcode
   - Right-click on your project in the Project Navigator
   - Select "Add Files to [Your Project Name]"
   - Select the downloaded `GoogleService-Info.plist` file
   - Make sure "Copy items if needed" is checked
   - Click "Add"

## 3. Install Required Firebase Packages

Run the following commands in your project root directory:

```bash
# Install Firebase core and messaging
npm install @react-native-firebase/app @react-native-firebase/messaging --save

# Install push notification libraries
npm install react-native-push-notification @react-native-community/push-notification-ios --save
```

## 4. Configure Firebase Messaging in Your App

### Android Configuration

1. **Update AndroidManifest.xml**:
   - Open `android/app/src/main/AndroidManifest.xml`
   - Add the following permissions if not already present:
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.VIBRATE" />
     <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
     ```

   - Add the following inside the `<application>` tag:
     ```xml
     <meta-data
       android:name="com.google.firebase.messaging.default_notification_icon"
       android:resource="@mipmap/ic_notification" />
     <meta-data
       android:name="com.google.firebase.messaging.default_notification_color"
       android:resource="@color/notification_color" />
     ```

2. **Create notification icon and color resources**:
   - Add a notification icon to `android/app/src/main/res/mipmap/ic_notification.png`
   - Add a color resource file at `android/app/src/main/res/values/colors.xml`:
     ```xml
     <?xml version="1.0" encoding="utf-8"?>
     <resources>
         <color name="notification_color">#4CAF50</color>
     </resources>
     ```

### iOS Configuration

1. **Update AppDelegate.m**:
   - Open `ios/YourAppName/AppDelegate.m`
   - Add the following imports at the top:
     ```objective-c
     #import <Firebase.h>
     #import <UserNotifications/UserNotifications.h>
     #import <RNCPushNotificationIOS.h>
     ```

   - In the `didFinishLaunchingWithOptions` method, add:
     ```objective-c
     [FIRApp configure];
     
     // Define UNUserNotificationCenter
     UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
     center.delegate = self;
     ```

   - Add these methods to the implementation:
     ```objective-c
     // Required for the register event.
     - (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
     {
       [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
     }
     
     // Required for the notification event.
     - (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
     {
       [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
     }
     
     // Required for the registrationError event.
     - (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
     {
       [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
     }
     
     // Required for localNotification event
     - (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler
     {
       [RNCPushNotificationIOS didReceiveNotificationResponse:response];
     }
     
     // Called when a notification is delivered to a foreground app.
     - (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
     {
       completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
     }
     ```

2. **Update Podfile**:
   - Open `ios/Podfile`
   - Add the following line at the top of the file:
     ```ruby
     require_relative '../node_modules/@react-native-firebase/app/ios_config'
     ```

## 5. Update the PushNotificationClient Implementation

The existing `pushNotificationClient.ts` file already has the structure needed for Firebase integration. Once the Firebase packages are installed, the conditional imports should work correctly.

## 6. Send FCM Token to Backend

Update the `onRegistration` callback in `DriverContext.tsx` to send the FCM token to your backend:

```typescript
onRegistration: async (token) => {
  console.log('📱 FCM token received:', token);
  
  // Send token to backend
  try {
    const response = await apiService.updateFcmToken(token);
    if (response.success) {
      console.log('✅ FCM token sent to backend');
    } else {
      console.error('❌ Failed to send FCM token to backend:', response.error);
    }
  } catch (error) {
    console.error('❌ Error sending FCM token to backend:', error);
  }
}
```

## 7. Test Push Notifications

1. **Test from Firebase Console**:
   - Go to your Firebase project console
   - Navigate to "Messaging" in the left sidebar
   - Click "Send your first message"
   - Create a notification message
   - Target your app
   - Schedule the message to send now
   - Click "Review" and then "Publish"

2. **Test from Backend**:
   - Implement a server-side function to send notifications using the Firebase Admin SDK
   - Use the FCM token stored in your database to send targeted notifications to specific devices

## 8. Troubleshooting

- **Notifications not showing**: Check that permissions are properly requested and granted
- **Token not generated**: Verify Firebase configuration files are correctly placed
- **App crashes on startup**: Check for errors in the Firebase initialization code

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [React Native Push Notification Documentation](https://github.com/zo0r/react-native-push-notification)