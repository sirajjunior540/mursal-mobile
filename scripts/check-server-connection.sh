#!/bin/bash

echo "🔍 Checking server connectivity..."
echo ""

# Current configured IP from .env
CURRENT_IP=$(grep SERVER_IP .env | cut -d'=' -f2)
CURRENT_PORT=$(grep SERVER_PORT .env | cut -d'=' -f2)

echo "📋 Current configuration:"
echo "  - SERVER_IP: $CURRENT_IP"
echo "  - SERVER_PORT: $CURRENT_PORT"
echo ""

# Check if current IP is reachable
echo "🔌 Testing connection to $CURRENT_IP:$CURRENT_PORT..."
if curl -s --connect-timeout 2 "http://$CURRENT_IP:$CURRENT_PORT/api/v1/auth/token/" > /dev/null 2>&1; then
    echo "✅ Server is reachable at $CURRENT_IP:$CURRENT_PORT"
else
    echo "❌ Server is NOT reachable at $CURRENT_IP:$CURRENT_PORT"
    echo ""
    echo "🔍 Checking common local addresses..."
    
    # Check common local addresses
    for IP in "localhost" "127.0.0.1" "192.168.1.1" "10.0.0.1" "192.168.0.1" "host.docker.internal"; do
        if curl -s --connect-timeout 2 "http://$IP:$CURRENT_PORT/api/v1/auth/token/" > /dev/null 2>&1; then
            echo "✅ Found server at $IP:$CURRENT_PORT"
            echo ""
            echo "📝 To fix, update your .env file:"
            echo "   SERVER_IP=$IP"
            break
        else
            echo "   ❌ Not at $IP"
        fi
    done
    
    echo ""
    echo "💡 If server is running on a different machine:"
    echo "   1. Find the server machine's IP address (run 'ifconfig' or 'ip addr' on server)"
    echo "   2. Update SERVER_IP in .env file"
    echo "   3. Restart the React Native app"
fi

echo ""
echo "📱 For React Native on physical device:"
echo "   - iOS Simulator: Use 'localhost' or '127.0.0.1'"
echo "   - Android Emulator: Use '10.0.2.2' for localhost"
echo "   - Physical device: Use your computer's network IP (e.g., 192.168.x.x)"