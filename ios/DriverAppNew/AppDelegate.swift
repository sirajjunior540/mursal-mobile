import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import UserNotifications
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()
    
    // Request notification permissions
    UNUserNotificationCenter.current().delegate = self
    requestNotificationPermissions()
    
    // Configure audio session for background sound
    configureAudioSession()
    
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "mursaldriver",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  // MARK: - Notification Setup
  private func requestNotificationPermissions() {
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if granted {
        print("✅ iOS notification permissions granted")
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      } else {
        print("❌ iOS notification permissions denied: \(error?.localizedDescription ?? "Unknown error")")
      }
    }
  }
  
  private func configureAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.allowBluetooth, .allowAirPlay])
      try AVAudioSession.sharedInstance().setActive(true)
      print("✅ Audio session configured for background playback")
    } catch {
      print("❌ Failed to configure audio session: \(error)")
    }
  }
  
  // MARK: - Remote Notifications
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    print("📱 iOS device token received: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
    // Forward to Firebase Messaging
    // Messaging.messaging().apnsToken = deviceToken
  }
  
  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error)")
  }
}

// MARK: - UNUserNotificationCenterDelegate
extension AppDelegate: UNUserNotificationCenterDelegate {
  // Handle notifications when app is in foreground
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    print("📱 Notification received while app in foreground")
    
    // Check if this is an order notification
    let userInfo = notification.request.content.userInfo
    if let orderType = userInfo["type"] as? String, orderType == "new_order" {
      print("🚚 New order notification received while app is active")
      
      // Play sound and show alert even when app is in foreground
      completionHandler([.alert, .sound, .badge])
      
      // Wake the app and show modal
      DispatchQueue.main.async {
        self.handleOrderNotification(userInfo: userInfo)
      }
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }
  
  // Handle notification taps when app is in background/closed
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    print("📱 Notification tapped - app waking from background")
    
    let userInfo = response.notification.request.content.userInfo
    
    // Check if this is an order notification
    if let orderType = userInfo["type"] as? String, orderType == "new_order" {
      print("🚚 Order notification tapped - launching order modal")
      
      // Wake the app and show modal with delay to ensure app is ready
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        self.handleOrderNotification(userInfo: userInfo)
      }
    }
    
    completionHandler()
  }
  
  private func handleOrderNotification(userInfo: [AnyHashable: Any]) {
    // This will trigger the incoming order modal
    // The React Native side should listen for this notification
    NotificationCenter.default.post(
      name: NSNotification.Name("IncomingOrderNotification"),
      object: nil,
      userInfo: userInfo
    )
    
    print("🔔 Posted incoming order notification to React Native")
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
