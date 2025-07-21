#!/bin/bash

echo "Cleaning Android build..."
cd android
./gradlew clean

echo "Cleaning React Native cache..."
cd ..
npx react-native clean-project-auto

echo "Reinstalling pods for iOS..."
cd ios
pod install
cd ..

echo "Rebuilding Android app..."
npx react-native run-android

echo "Rebuild complete!"