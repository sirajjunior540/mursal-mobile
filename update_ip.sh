#!/bin/bash

# Script to update IP address across all configuration files
# Usage: ./update_ip.sh <new_ip>

if [ $# -eq 0 ]; then
    echo "Usage: ./update_ip.sh <new_ip>"
    echo "Example: ./update_ip.sh 192.168.1.192"
    exit 1
fi

NEW_IP=$1
OLD_IP=$(grep "SERVER_IP=" .env | cut -d'=' -f2)

if [ -z "$OLD_IP" ]; then
    echo "Could not find current IP in .env file"
    exit 1
fi

echo "Updating IP from $OLD_IP to $NEW_IP"
echo "================================"

# Files to update
FILES=(
    ".env"
    ".env.development"
    "android/app/src/main/res/xml/network_security_config.xml"
    "ios/DriverAppNew/Info.plist"
    "src/config/environment.ts"
    "test_backend_connection.js"
)

# Update each file
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        sed -i.bak "s/$OLD_IP/$NEW_IP/g" "$file"
        rm "${file}.bak"
    fi
done

echo ""
echo "✅ IP address updated to $NEW_IP"
echo ""
echo "Next steps:"
echo "1. Stop Metro bundler (Ctrl+C)"
echo "2. Clear cache: npx react-native start --reset-cache"
echo "3. Rebuild app:"
echo "   - iOS: npx react-native run-ios"
echo "   - Android: npx react-native run-android"
echo ""
echo "4. Update Django settings.py:"
echo "   ALLOWED_HOSTS = ['$NEW_IP', 'sirajjunior.$NEW_IP', '192.168.1.192', '*']"
echo ""
echo "5. Run Django server:"
echo "   python manage.py runserver $NEW_IP:8000"
echo ""

# Make the script executable
chmod +x update_ip.sh