#!/usr/bin/env node

/**
 * Network Debug Tool for DriverApp Login Issues
 * This script tests various network connectivity scenarios
 */

const fetch = require('node-fetch');

const CONFIG = {
  API_BASE_URL: 'http://192.168.1.137:8000',
  API_HOST: 'sirajjunior.192.168.1.137',
  DEFAULT_TENANT_ID: 'sirajjunior',
  TIMEOUT: 10000
};

console.log('🔧 Network Debug Tool for DriverApp Login');
console.log('=' .repeat(50));

async function testConnection(url, options = {}) {
  try {
    console.log(`🧪 Testing: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        console.log('  ⚠️  Response not valid JSON');
      }
    }
    
    console.log(`  ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`  📄 Content-Type: ${contentType || 'not set'}`);
    if (data) {
      console.log(`  📊 Response data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    }
    
    return { success: true, status: response.status, data };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    if (error.name === 'AbortError') {
      console.log(`  ⏰ Request timed out after ${CONFIG.TIMEOUT}ms`);
    }
    return { success: false, error: error.message };
  }
}

async function testLoginEndpoint(username = 'testuser', password = 'testpass') {
  console.log(`\n🔐 Testing Login Endpoint`);
  console.log('-'.repeat(30));
  
  const url = `${CONFIG.API_BASE_URL}/api/v1/auth/token/`;
  const payload = { username, password };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': CONFIG.API_HOST,
    },
    body: JSON.stringify(payload)
  };
  
  console.log(`📤 Request payload: ${JSON.stringify(payload, null, 2)}`);
  console.log(`🌐 Host header: ${CONFIG.API_HOST}`);
  
  return await testConnection(url, options);
}

async function runNetworkTests() {
  console.log(`📍 Configuration:`);
  console.log(`   API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(`   API Host: ${CONFIG.API_HOST}`);
  console.log(`   Tenant ID: ${CONFIG.DEFAULT_TENANT_ID}`);
  console.log(`   Timeout: ${CONFIG.TIMEOUT}ms\n`);

  // Test 1: Basic connectivity
  console.log('1️⃣ Basic Connectivity Tests');
  console.log('-'.repeat(30));
  
  await testConnection(`${CONFIG.API_BASE_URL}/`);
  await testConnection(`${CONFIG.API_BASE_URL}/health/`);
  await testConnection(`${CONFIG.API_BASE_URL}/api/`);
  await testConnection(`${CONFIG.API_BASE_URL}/api/v1/`);
  await testConnection(`${CONFIG.API_BASE_URL}/api/v1/auth/`);
  
  // Test 2: DNS/Host resolution
  console.log('\n2️⃣ Alternative URL Tests');
  console.log('-'.repeat(30));
  
  // Test with IP only (no host header)
  await testConnection(`http://192.168.1.137:8000/api/v1/auth/`);
  
  // Test with different host configurations
  await testConnection(`${CONFIG.API_BASE_URL}/api/v1/auth/`, {
    headers: { 'Host': 'localhost:8000' }
  });
  
  await testConnection(`${CONFIG.API_BASE_URL}/api/v1/auth/`, {
    headers: { 'Host': '192.168.1.137:8000' }
  });
  
  // Test 3: Login endpoint
  await testLoginEndpoint();
  
  // Test 4: Network info
  console.log('\n3️⃣ Network Information');
  console.log('-'.repeat(30));
  
  try {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    console.log('📱 Local Network Interfaces:');
    Object.keys(networkInterfaces).forEach(name => {
      const interfaces = networkInterfaces[name];
      interfaces.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   ${name}: ${iface.address}`);
        }
      });
    });
  } catch (error) {
    console.log(`❌ Could not get network info: ${error.message}`);
  }
  
  console.log('\n✅ Network tests completed!');
  console.log('\n💡 Troubleshooting Tips:');
  console.log('   • Ensure the Django server is running on 192.168.1.137:8000');
  console.log('   • Check if tenant "sirajjunior" is configured in Django');
  console.log('   • Verify CORS and ALLOWED_HOSTS settings in Django');
  console.log('   • Test from a browser: http://192.168.1.137:8000/api/v1/auth/');
  console.log('   • Check firewall settings on the server');
}

// Run the tests
runNetworkTests().catch(console.error);