#!/usr/bin/env node

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch;

const API_BASE_URL = 'http://192.168.1.137:8000';
const TENANT_HOST = 'sirajjunior.192.168.1.137';

async function testMobileLogin() {
  console.log('🔐 Testing Mobile App Login...\n');

  const headers = {
    'Host': TENANT_HOST,
    'Content-Type': 'application/json',
    'User-Agent': 'MursalDriverApp/1.0',
  };

  // Test 1: Check auth endpoint availability
  console.log('1️⃣  Testing auth endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
      method: 'OPTIONS',
      headers,
    });
    console.log(`   📡 Status: ${response.status}`);
    if (response.status === 200) {
      console.log('   ✅ Auth endpoint available');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }

  // Test 2: Check token endpoint
  console.log('\n2️⃣  Testing token endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
      method: 'OPTIONS',
      headers,
    });
    console.log(`   📡 Status: ${response.status}`);
    console.log(`   📋 Allowed methods: ${response.headers.get('allow') || 'N/A'}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Test login with credentials
  console.log('\n3️⃣  Testing login with driver credentials...');
  
  const loginData = {
    username: 'driver',
    password: 'admin'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(loginData),
    });

    console.log(`   📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Login successful!');
      console.log('   📄 Response keys:', Object.keys(data));
      if (data.token || data.access_token || data.access) {
        console.log('   🔑 Token received!');
      }
    } else {
      const errorData = await response.text();
      console.log('   ⚠️ Login failed (expected if credentials are wrong)');
      console.log(`   📄 Error: ${errorData.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Check delivery endpoints (should require auth)
  console.log('\n4️⃣  Testing delivery endpoints...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/delivery/deliveries/available_orders/`, {
      method: 'GET',
      headers,
    });
    console.log(`   📡 Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Properly protected with authentication');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🎯 Login Test Complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Update username/password in mobile app login screen');
  console.log('   2. Ensure the driver user exists in the Django admin');
  console.log('   3. Test the mobile app login flow');
}

testMobileLogin().catch(console.error);