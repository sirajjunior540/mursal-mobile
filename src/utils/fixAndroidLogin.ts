/**
 * Quick Android Login Fix Script
 * Run this from React Native Debugger console: fixAndroidLogin()
 */

import { Platform } from 'react-native';
import { ENV } from '../config/environment';

const fixAndroidLogin = async () => {
  console.log('\n🔧 ANDROID LOGIN FIX SCRIPT');
  console.log('==========================\n');
  
  if (Platform.OS !== 'android') {
    console.log('⚠️  This script is for Android only. Your platform:', Platform.OS);
    return;
  }
  
  // Step 1: Diagnose current configuration
  console.log('📋 Current Configuration:');
  console.log(`   Server IP: ${ENV.SERVER_IP}`);
  console.log(`   API URL: ${ENV.API_BASE_URL}`);
  console.log(`   Tenant: ${ENV.TENANT_ID}`);
  
  // Step 2: Test current endpoint
  console.log('\n🔍 Testing current endpoint...');
  try {
    const response = await fetch(ENV.API_BASE_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    console.log('✅ Current endpoint is reachable!');
    console.log('   The issue might be with the login endpoint specifically.');
    
    // Test login endpoint
    console.log('\n🔍 Testing login endpoint...');
    const loginUrl = `${ENV.API_BASE_URL}/api/v1/auth/token/`;
    const loginTest = await fetch(loginUrl, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(3000),
    });
    console.log('✅ Login endpoint is reachable!');
    console.log('   Try logging in again.');
    return;
  } catch (error) {
    console.log('❌ Cannot reach current endpoint');
  }
  
  // Step 3: Try Android emulator special IP
  console.log('\n🤖 Trying Android emulator configuration...');
  const emulatorUrl = `http://10.0.2.2:${ENV.SERVER_PORT}`;
  try {
    const response = await fetch(emulatorUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    console.log('✅ Android emulator endpoint works!');
    console.log('\n📝 TO FIX:');
    console.log('1. Update your .env file:');
    console.log('   SERVER_IP=10.0.2.2');
    console.log('\n2. Restart Metro bundler:');
    console.log('   - Press Ctrl+C to stop');
    console.log('   - Run: npx react-native start --reset-cache');
    console.log('\n3. Rebuild the app:');
    console.log('   - Run: npx react-native run-android');
    return;
  } catch (error) {
    console.log('❌ Not accessible via emulator IP');
  }
  
  // Step 4: Try localhost variations
  console.log('\n🌐 Scanning for working endpoints...');
  const possibleHosts = [
    '10.0.2.2',      // Android emulator
    'localhost',      // Localhost
    '127.0.0.1',     // Loopback
    ENV.SERVER_IP,   // Current config
    '192.168.1.163', // Hardcoded IP from config
  ];
  
  let foundWorking = false;
  for (const host of possibleHosts) {
    const testUrl = `http://${host}:${ENV.SERVER_PORT}`;
    process.stdout.write(`   Testing ${host}...`);
    try {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      });
      console.log(' ✅ WORKS!');
      
      if (!foundWorking) {
        foundWorking = true;
        console.log('\n📝 SOLUTION FOUND:');
        console.log(`1. Update .env file:`);
        console.log(`   SERVER_IP=${host}`);
        console.log('\n2. Restart and rebuild as shown above');
      }
    } catch (error) {
      console.log(' ❌');
    }
  }
  
  if (!foundWorking) {
    console.log('\n❌ No working endpoint found!');
    console.log('\n🚨 IMMEDIATE ACTIONS:');
    console.log('\n1. Check Django is running with proper binding:');
    console.log('   python manage.py runserver 0.0.0.0:8000');
    console.log('   (NOT just "python manage.py runserver")');
    console.log('\n2. For physical device, find your computer\'s IP:');
    console.log('   Mac: ifconfig | grep "inet " | grep -v 127.0.0.1');
    console.log('   Windows: ipconfig');
    console.log('\n3. Ensure both devices on same WiFi');
    console.log('\n4. Check firewall settings');
    console.log('\n5. Try ngrok as last resort:');
    console.log('   ngrok http 8000');
  }
  
  console.log('\n==========================\n');
};

// Make it globally available
if (__DEV__) {
  (global as any).fixAndroidLogin = fixAndroidLogin;
  
  // Show helpful message on import
  if (Platform.OS === 'android') {
    console.log('\n🚀 Android Login Fix Available!');
    console.log('   Run: fixAndroidLogin()');
    console.log('   This will diagnose and fix your login issue\n');
  }
}

export { fixAndroidLogin };