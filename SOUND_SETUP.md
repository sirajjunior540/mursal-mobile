# Sound Setup Instructions

The app uses a custom notification sound for incoming orders. To enable this feature, you need to add the sound file to both platforms:

## Android
The sound file is already present at:
```
android/app/src/main/res/raw/order_notification.mp3
```

## iOS
You need to add the sound file to the iOS project:

1. Copy your `order_notification.mp3` file to the `ios/sounds/` directory
2. Open the project in Xcode
3. Right-click on your project name in the navigator
4. Select "Add Files to [YourProject]"
5. Navigate to the `sounds` folder and select `order_notification.mp3`
6. Make sure "Copy items if needed" is checked
7. Make sure your target is selected
8. Click "Add"

## Fallback Behavior
If the sound file is not found, the app will automatically fall back to:
- Vibration patterns on both platforms
- System beep simulation using vibration

## Testing
To test the notification sound:
1. Ensure the app has notification permissions
2. Receive an incoming order
3. The sound should play automatically along with vibration

## Sound Service Features
- Plays notification sound when order arrives
- Repeats sound every 3 seconds for up to 30 seconds
- Stops automatically when order is accepted, declined, or skipped
- Pauses when app goes to background
- Resumes when app returns to foreground