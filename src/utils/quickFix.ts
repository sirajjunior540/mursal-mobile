/**
 * Quick fix utility for common issues
 */

import { Platform } from 'react-native';
import { ENV } from '../config/environment';

export const quickFix = {
  /**
   * Get the correct server URL based on platform and environment
   */
  getServerUrl: () => {
    const isAndroidEmulator = Platform.OS === 'android' && ENV.SERVER_IP === 'localhost';
    
    if (isAndroidEmulator) {
      console.log('🤖 Android Emulator detected, using 10.0.2.2 instead of localhost');
      return `${ENV.SERVER_PROTOCOL}://10.0.2.2:${ENV.SERVER_PORT}`;
    }
    
    return ENV.API_BASE_URL;
  },
  
  /**
   * Test if we can reach the server with different configurations
   */
  findWorkingEndpoint: async () => {
    console.log('\n🔍 Finding working endpoint...\n');
    
    const possibleHosts = [
      ENV.SERVER_IP,
      '10.0.2.2', // Android emulator
      'localhost',
      '127.0.0.1',
      // Add your actual machine IP here if different
      '192.168.1.163',
    ];
    
    const possiblePorts = [
      ENV.SERVER_PORT,
      8000,
      3000,
      80,
    ];
    
    for (const host of possibleHosts) {
      for (const port of possiblePorts) {
        const url = `${ENV.SERVER_PROTOCOL}://${host}:${port}`;
        try {
          console.log(`Testing: ${url}`);
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(2000),
          });
          
          if (response.ok || response.status < 500) {
            console.log(`✅ WORKING: ${url}`);
            console.log(`\n💡 Update your .env file:`);
            console.log(`SERVER_IP=${host}`);
            console.log(`SERVER_PORT=${port}`);
            return { host, port, url };
          }
        } catch (e) {
          // Continue to next combination
        }
      }
    }
    
    console.log('\n❌ No working endpoint found');
    console.log('\n💡 Make sure:');
    console.log('1. Your Django server is running: python manage.py runserver 0.0.0.0:8000');
    console.log('2. Your device/emulator can reach the server');
    console.log('3. Firewall is not blocking the connection');
    
    return null;
  },
  
  /**
   * Show current network configuration
   */
  showConfig: () => {
    console.log('\n📋 Current Configuration:');
    console.log('========================');
    console.log(`Platform: ${Platform.OS} ${Platform.Version}`);
    console.log(`API URL: ${ENV.API_BASE_URL}`);
    console.log(`Server: ${ENV.SERVER_IP}:${ENV.SERVER_PORT}`);
    console.log(`Protocol: ${ENV.SERVER_PROTOCOL}`);
    console.log(`Tenant: ${ENV.TENANT_ID}`);
    console.log('========================\n');
  },
  
  /**
   * Common Android fixes
   */
  androidFixes: () => {
    if (Platform.OS !== 'android') {
      console.log('This is only for Android devices');
      return;
    }
    
    console.log('\n🤖 Android Network Fixes:');
    console.log('========================\n');
    
    console.log('1. For Emulator:');
    console.log('   - Use 10.0.2.2 instead of localhost');
    console.log('   - Example: SERVER_IP=10.0.2.2');
    
    console.log('\n2. For Physical Device:');
    console.log('   - Find your computer\'s IP: ifconfig (Mac) or ipconfig (Windows)');
    console.log('   - Update .env: SERVER_IP=your.computer.ip.address');
    console.log('   - Ensure both devices are on same WiFi');
    
    console.log('\n3. Django Server:');
    console.log('   - Must bind to all interfaces: python manage.py runserver 0.0.0.0:8000');
    console.log('   - NOT just: python manage.py runserver (this only binds to localhost)');
    
    console.log('\n4. After changing .env:');
    console.log('   - Stop Metro bundler (Ctrl+C)');
    console.log('   - Run: npx react-native start --reset-cache');
    console.log('   - Rebuild app: npx react-native run-android');
    
    console.log('\n5. Still not working?');
    console.log('   - Run: debugAndroidNetwork()');
    console.log('   - Run: quickFix.findWorkingEndpoint()');
    
    console.log('\n========================\n');
  }
};

// Make available globally in dev
if (__DEV__) {
  (global as any).quickFix = quickFix;
  
  // Auto-show config on import
  quickFix.showConfig();
  
  // Show Android-specific help if on Android
  if (Platform.OS === 'android') {
    console.log('💡 Having network issues? Try:');
    console.log('   quickFix.androidFixes()');
    console.log('   quickFix.findWorkingEndpoint()');
    console.log('   debugAndroidNetwork()');
  }
}