#!/bin/bash

echo "🚗 Starting DriverAppNew..."
echo "   Metro Port: 8082"
echo ""

# Start Metro bundler on port 8082
npx react-native start --port 8082 &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Run Android app
npx react-native run-android

# Keep script running
wait $METRO_PID