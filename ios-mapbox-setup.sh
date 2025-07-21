#!/bin/bash

echo "Setting up Mapbox for iOS..."

# Navigate to iOS directory
cd ios

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf Pods
rm -rf build

# Update pods repo
echo "Updating CocoaPods..."
pod repo update

# Install pods
echo "Installing pods..."
pod install

echo "iOS Mapbox setup complete!"
echo ""
echo "⚠️  IMPORTANT: Before building for iOS:"
echo "1. Update the MAPBOX_DOWNLOADS_TOKEN in .rnmbx file with your secret token"
echo "2. Make sure you have a valid Mapbox access token"
echo "3. Run 'cd ios && pod install' after updating the token"
echo ""
echo "To run the app: npx react-native run-ios"