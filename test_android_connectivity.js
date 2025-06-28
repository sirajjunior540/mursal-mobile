#!/usr/bin/env node

/**
 * Test connectivity from Android device to Django backend
 */

const API_BASE_URL = 'http://192.168.1.52:8000';
const API_HOST = 'sirajjunior.localhost:8000';

console.log('🔍 Testing Android to Django Backend Connectivity\n');
console.log('📡 Server IP: 192.168.1.52');
console.log('🏢 Tenant Host: sirajjunior.localhost');
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('\n' + '='.repeat(50) + '\n');

// Test 1: Basic connectivity
console.log('Test 1: Basic connectivity check...');
fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
  method: 'GET',
  headers: {
    'Host': API_HOST
  }
})
.then(response => {
  console.log(`✅ Server is reachable! Status: ${response.status}`);
  console.log(`   Expected 405 (Method Not Allowed) for GET request\n`);
})
.catch(error => {
  console.error('❌ Cannot reach server:', error.message);
  console.log('\nTroubleshooting tips:');
  console.log('1. Ensure Django server is running: python manage.py runserver 0.0.0.0:8000');
  console.log('2. Check firewall settings');
  console.log('3. Verify both devices are on the same network');
  console.log('4. Try pinging 192.168.1.52 from your Android device\n');
});

// Test 2: API endpoint with proper headers
console.log('Test 2: Testing with tenant headers...');
fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
  method: 'POST',
  headers: {
    'Host': API_HOST,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'test',
    password: 'test'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ API endpoint is working!');
  console.log('   Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('⚠️  API error (this is expected without valid credentials):', error.message);
});

console.log('\n📱 Next Steps for React Native App:');
console.log('1. Rebuild the Android app: cd android && ./gradlew clean && cd .. && npx react-native run-android');
console.log('2. Or if already running, reload the app (press R twice in Metro)');
console.log('3. The app should now connect to http://192.168.1.52:8000');
console.log('4. Make sure your .env file has API_BASE_URL=http://192.168.1.52:8000');