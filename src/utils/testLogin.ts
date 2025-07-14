/**
 * Simple login test utility for debugging
 * Can be run from React Native Debugger console
 */

import { ENV } from '../config/environment';
import { Platform } from 'react-native';

// Import Android-specific debugging if on Android
if (Platform.OS === 'android') {
  import('./androidNetworkDebug');
}

// Make this function globally available in development
if (__DEV__) {
  (global as any).testLogin = async (username: string, password: string) => {
    console.log('\n🔐 Testing Login...');
    console.log('📍 Server:', ENV.API_BASE_URL);
    console.log('👤 Username:', username);
    console.log('🏢 Tenant:', ENV.TENANT_ID);
    
    const url = `${ENV.API_BASE_URL}/api/v1/auth/token/`;
    
    try {
      // Test 1: Basic connectivity
      console.log('\n1️⃣ Testing server connectivity...');
      const pingResponse = await fetch(ENV.API_BASE_URL, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      }).catch(err => ({ ok: false, error: err.message }));
      
      console.log('   Server reachable:', pingResponse.ok ? '✅ YES' : '❌ NO');
      
      // Test 2: Login endpoint
      console.log('\n2️⃣ Testing login endpoint...');
      const loginResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-ID': ENV.TENANT_ID,
        },
        body: JSON.stringify({
          username,
          password,
          tenant_id: ENV.TENANT_ID,
        }),
      });
      
      console.log('   Status:', loginResponse.status, loginResponse.statusText);
      console.log('   Headers:', Object.fromEntries(loginResponse.headers.entries()));
      
      const responseText = await loginResponse.text();
      console.log('   Response length:', responseText.length);
      
      try {
        const data = JSON.parse(responseText);
        console.log('   Response data:', data);
        
        if (data.access || data.token) {
          console.log('\n✅ LOGIN SUCCESSFUL!');
          console.log('   Token:', (data.access || data.token).substring(0, 20) + '...');
        } else if (data.error || data.detail) {
          console.log('\n❌ LOGIN FAILED!');
          console.log('   Error:', data.error || data.detail);
        }
      } catch (e) {
        console.log('   Response (not JSON):', responseText.substring(0, 200));
      }
      
    } catch (error) {
      console.log('\n💥 ERROR:', error);
    }
    
    console.log('\n========================================\n');
  };
  
  // Also expose a network test function
  (global as any).testNetwork = async () => {
    console.log('\n🌐 Network Diagnostics');
    console.log('========================');
    
    const tests = [
      { name: 'Google DNS', url: 'https://8.8.8.8' },
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'Local Server', url: ENV.API_BASE_URL },
      { name: 'Login Endpoint', url: `${ENV.API_BASE_URL}/api/v1/auth/token/` },
    ];
    
    for (const test of tests) {
      try {
        const start = Date.now();
        const response = await fetch(test.url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        }).catch(err => ({ ok: false, status: 0, error: err.message }));
        
        const time = Date.now() - start;
        console.log(`${test.name}: ${response.ok ? '✅' : '❌'} (${time}ms) ${response.status || response.error || ''}`);
      } catch (error) {
        console.log(`${test.name}: ❌ ${error.message}`);
      }
    }
    
    console.log('\n========================\n');
  };
  
  console.log('🔧 Debug functions available:');
  console.log('   testLogin(username, password)');
  console.log('   testNetwork()');
}

export {};