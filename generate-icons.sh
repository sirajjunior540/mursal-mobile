#!/bin/bash

# This script generates app icons for both iOS and Android
# Requires ImageMagick (install with: brew install imagemagick)
# Usage: ./generate-icons.sh icon.png

if [ -z "$1" ]; then
    echo "Usage: ./generate-icons.sh icon.png"
    echo "Please provide a 1024x1024 PNG file as input"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File $INPUT_FILE does not exist"
    exit 1
fi

echo "Generating iOS icons..."

# iOS Icon Sizes
convert "$INPUT_FILE" -resize 20x20 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-20.png
convert "$INPUT_FILE" -resize 40x40 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-20@2x.png
convert "$INPUT_FILE" -resize 60x60 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-20@3x.png
convert "$INPUT_FILE" -resize 29x29 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-29.png
convert "$INPUT_FILE" -resize 58x58 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-29@2x.png
convert "$INPUT_FILE" -resize 87x87 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-29@3x.png
convert "$INPUT_FILE" -resize 40x40 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-40.png
convert "$INPUT_FILE" -resize 80x80 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-40@2x.png
convert "$INPUT_FILE" -resize 120x120 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-40@3x.png
convert "$INPUT_FILE" -resize 120x120 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-60@2x.png
convert "$INPUT_FILE" -resize 180x180 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-60@3x.png
convert "$INPUT_FILE" -resize 1024x1024 ios/DriverAppNew/Images.xcassets/AppIcon.appiconset/Icon-1024.png

echo "Generating Android icons..."

# Android Icon Sizes
convert "$INPUT_FILE" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert "$INPUT_FILE" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert "$INPUT_FILE" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert "$INPUT_FILE" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert "$INPUT_FILE" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Round icons for Android
convert "$INPUT_FILE" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
convert "$INPUT_FILE" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
convert "$INPUT_FILE" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
convert "$INPUT_FILE" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
convert "$INPUT_FILE" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

echo "Icons generated successfully!"
echo ""
echo "Note: You may need to update the iOS Contents.json file to reference the new icons."
echo "Also, make sure to clean and rebuild your project after adding new icons."