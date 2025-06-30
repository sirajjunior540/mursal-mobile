#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration from .env
const API_BASE_URL = 'http://192.168.1.137:8000';
const TENANT_HOST = 'sirajjunior.192.168.1.137';

console.log('🔧 Testing backend connection...');
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`Tenant Host: ${TENANT_HOST}`);

// Test functions
async function testConnection(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'MursalDriverApp/1.0',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n📋 Running connection tests...\n');

  // Test 1: Basic API health check
  try {
    console.log('1️⃣  Testing basic API connection...');
    const response = await testConnection(`${API_BASE_URL}/api/v1/`);
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response length: ${response.data.length} bytes`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  // Test 2: Test with tenant host header
  try {
    console.log('\n2️⃣  Testing tenant API connection...');
    const response = await testConnection(`${API_BASE_URL}/api/v1/`, {
      'Host': TENANT_HOST
    });
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response length: ${response.data.length} bytes`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  // Test 3: Test whoami endpoint
  try {
    console.log('\n3️⃣  Testing tenant whoami endpoint...');
    const response = await testConnection(`${API_BASE_URL}/whoami/`, {
      'Host': TENANT_HOST
    });
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response: ${response.data}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  // Test 4: Test delivery API endpoint
  try {
    console.log('\n4️⃣  Testing delivery API endpoint...');
    const response = await testConnection(`${API_BASE_URL}/api/v1/delivery/`, {
      'Host': TENANT_HOST
    });
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response length: ${response.data.length} bytes`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  // Test 5: Test authentication endpoint
  try {
    console.log('\n5️⃣  Testing auth endpoint...');
    const response = await testConnection(`${API_BASE_URL}/api/v1/auth/`, {
      'Host': TENANT_HOST
    });
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response length: ${response.data.length} bytes`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  console.log('\n🎯 Connection tests completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Make sure Django server is running with: python manage.py runserver 192.168.1.137:8000');
  console.log('   2. Ensure the sirajjunior tenant exists in the database');
  console.log('   3. Test the mobile app connection');
}

runTests().catch(console.error);