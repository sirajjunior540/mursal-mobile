/**
 * Android-specific network debugging utility
 */

import { Platform, NativeModules } from 'react-native';
import { ENV } from '../config/environment';

export const debugAndroidNetwork = async () => {
  console.log('\n🤖 ANDROID NETWORK DEBUG');
  console.log('========================\n');
  
  // 1. Platform Info
  console.log('📱 Platform Information:');
  console.log(`  • Platform: ${Platform.OS}`);
  console.log(`  • Version: ${Platform.Version}`);
  console.log(`  • Is Android: ${Platform.OS === 'android'}`);
  
  // 2. Environment Config
  console.log('\n⚙️ Environment Configuration:');
  console.log(`  • API Base URL: ${ENV.API_BASE_URL}`);
  console.log(`  • Protocol: ${ENV.SERVER_PROTOCOL}`);
  console.log(`  • Server IP: ${ENV.SERVER_IP}`);
  console.log(`  • Server Port: ${ENV.SERVER_PORT}`);
  console.log(`  • Tenant ID: ${ENV.TENANT_ID}`);
  
  // 3. Try different endpoints
  console.log('\n🌐 Testing Network Endpoints:');
  
  const endpoints = [
    { name: 'Google (HTTPS)', url: 'https://www.google.com' },
    { name: 'Google DNS', url: 'http://8.8.8.8' },
    { name: 'Localhost', url: 'http://localhost:8000' },
    { name: 'Android Emulator Host', url: 'http://10.0.2.2:8000' },
    { name: 'Direct IP', url: `http://${ENV.SERVER_IP}:${ENV.SERVER_PORT}` },
    { name: 'API Base URL', url: ENV.API_BASE_URL },
    { name: 'Login Endpoint', url: `${ENV.API_BASE_URL}/api/v1/auth/token/` },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n  Testing: ${endpoint.name}`);
      console.log(`  URL: ${endpoint.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      
      console.log(`  ✅ Success: ${response.status} ${response.statusText} (${elapsed}ms)`);
      
      // Log some headers
      const contentType = response.headers.get('content-type');
      const server = response.headers.get('server');
      if (contentType) console.log(`  Content-Type: ${contentType}`);
      if (server) console.log(`  Server: ${server}`);
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      
      // Detailed error analysis
      if (error.message.includes('Network request failed')) {
        console.log('  💡 Possible causes:');
        console.log('     - Server not running or not accessible');
        console.log('     - Wrong IP address or port');
        console.log('     - Firewall blocking the connection');
        console.log('     - Not on same network as server');
        console.log('     - Android emulator network issues');
      } else if (error.message.includes('aborted')) {
        console.log('  💡 Request timed out after 5 seconds');
      }
    }
  }
  
  // 4. Check if we're on emulator or real device
  console.log('\n📱 Device Type:');
  try {
    const { isEmulator } = NativeModules.DeviceInfo || {};
    if (isEmulator !== undefined) {
      console.log(`  • Is Emulator: ${isEmulator}`);
      if (isEmulator) {
        console.log('  💡 For Android Emulator:');
        console.log('     - Use 10.0.2.2 instead of localhost');
        console.log('     - Use your machine\'s IP for external servers');
      }
    }
  } catch (e) {
    console.log('  • Cannot determine if emulator');
  }
  
  // 5. Provide solutions
  console.log('\n💡 SOLUTIONS TO TRY:');
  console.log('\n1. If using Android Emulator:');
  console.log('   - Replace localhost with 10.0.2.2');
  console.log('   - Or use your computer\'s actual IP address');
  
  console.log('\n2. If using physical device:');
  console.log('   - Ensure device and server are on same WiFi');
  console.log('   - Check your computer\'s IP address:');
  console.log('     • macOS: ifconfig | grep "inet " | grep -v 127.0.0.1');
  console.log('     • Windows: ipconfig');
  console.log('   - Update .env with correct SERVER_IP');
  
  console.log('\n3. Check server is accessible:');
  console.log('   - From terminal: curl http://192.168.1.163:8000');
  console.log('   - Ensure Django is running with: python manage.py runserver 0.0.0.0:8000');
  console.log('   - Note: 0.0.0.0 binds to all network interfaces');
  
  console.log('\n4. Check Android permissions:');
  console.log('   - Internet permission should be in AndroidManifest.xml');
  console.log('   - Network security config should allow your IP');
  
  console.log('\n5. For Metro bundler issues:');
  console.log('   - Kill Metro: lsof -ti:8081 | xargs kill -9');
  console.log('   - Clear cache: npx react-native start --reset-cache');
  
  console.log('\n========================\n');
};

// Auto-run on import if in dev mode
if (__DEV__ && Platform.OS === 'android') {
  // Make it globally available
  (global as any).debugAndroidNetwork = debugAndroidNetwork;
  
  console.log('🔧 Android network debug available: debugAndroidNetwork()');
}