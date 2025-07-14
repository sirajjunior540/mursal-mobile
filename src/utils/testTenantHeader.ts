/**
 * Test utility to verify tenant header is being sent correctly
 */

import { ENV } from '../config/environment';

const testTenantHeader = async () => {
  console.log('\n🔍 Testing Tenant Header Configuration');
  console.log('=====================================\n');
  
  console.log('📋 Current Configuration:');
  console.log(`   API Base URL: ${ENV.API_BASE_URL}`);
  console.log(`   API Host: ${ENV.API_HOST}`);
  console.log(`   Tenant ID: ${ENV.TENANT_ID}`);
  console.log(`   Expected Host header: ${ENV.API_HOST}`);
  
  console.log('\n🧪 Testing with Host header...');
  
  const url = `${ENV.API_BASE_URL}/api/v1/auth/token/`;
  const headers = {
    'Content-Type': 'application/json',
    'Host': ENV.API_HOST,
    'X-Tenant-ID': ENV.TENANT_ID,
  };
  
  console.log(`\n📤 Request:`);
  console.log(`   URL: ${url}`);
  console.log(`   Headers:`, headers);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: 'test',
        password: 'test',
        tenant_id: ENV.TENANT_ID,
      }),
    });
    
    console.log(`\n📥 Response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`   Body preview: ${text.substring(0, 200)}...`);
    
    if (response.status === 404) {
      console.log('\n❌ 404 Error - The endpoint is not found');
      console.log('   This means the tenant routing is working (it found the tenant)');
      console.log('   But the URL is not configured in the tenant\'s URLconf');
      console.log('\n💡 Fix: Add auth URLs to your Django tenant URLconf');
    } else if (response.status === 401 || response.status === 400) {
      console.log('\n✅ Auth endpoint is reachable!');
      console.log('   The 401/400 error is expected with test credentials');
    } else if (response.ok) {
      console.log('\n✅ Success! The tenant header is working correctly');
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error);
    console.log('\n💡 Possible issues:');
    console.log('   - Server not running');
    console.log('   - Network connectivity');
    console.log('   - Firewall blocking request');
  }
  
  console.log('\n=====================================\n');
};

// Make it globally available in dev
if (__DEV__) {
  (global as any).testTenantHeader = testTenantHeader;
  
  console.log('🔧 Test tenant header function available:');
  console.log('   testTenantHeader()');
}

export { testTenantHeader };