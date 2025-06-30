#!/usr/bin/env node

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch;

const API_BASE_URL = 'http://192.168.1.137:8000';
const TENANT_HOST = 'sirajjunior.192.168.1.137';

async function testMobileOrders() {
  console.log('📱 Testing Mobile App Orders Flow...\n');

  const headers = {
    'Host': TENANT_HOST,
    'Content-Type': 'application/json',
    'User-Agent': 'MursalDriverApp/1.0',
  };

  // Step 1: Login
  console.log('1️⃣  Logging in...');
  const loginData = {
    username: 'driver',
    password: 'admin'
  };

  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(loginData),
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginResult = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`   Token: ${loginResult.access.substring(0, 20)}...`);

    const authHeaders = {
      ...headers,
      'Authorization': `Bearer ${loginResult.access}`
    };

    // Step 2: Get available orders
    console.log('\n2️⃣  Fetching available orders...');
    const ordersResponse = await fetch(`${API_BASE_URL}/api/v1/delivery/deliveries/available_orders/`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!ordersResponse.ok) {
      console.log(`❌ Orders fetch failed: ${ordersResponse.status}`);
      return;
    }

    const orders = await ordersResponse.json();
    console.log(`✅ Found ${orders.length} available orders`);

    orders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order ${order.order?.order_number || order.id}`);
      console.log(`      Customer: ${order.order?.customer?.name || 'Unknown'}`);
      console.log(`      Total: $${order.order?.total || 0}`);
      console.log(`      Status: ${order.status}`);
    });

    // Step 3: Get ongoing deliveries
    console.log('\n3️⃣  Fetching ongoing deliveries...');
    const ongoingResponse = await fetch(`${API_BASE_URL}/api/v1/delivery/deliveries/ongoing-deliveries/`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!ongoingResponse.ok) {
      console.log(`❌ Ongoing deliveries fetch failed: ${ongoingResponse.status}`);
      return;
    }

    const ongoingDeliveries = await ongoingResponse.json();
    console.log(`✅ Found ${ongoingDeliveries.length} ongoing deliveries`);

    ongoingDeliveries.forEach((delivery, index) => {
      console.log(`   ${index + 1}. Delivery ${delivery.id}`);
      console.log(`      Order: ${delivery.order?.order_number || 'Unknown'}`);
      console.log(`      Status: ${delivery.status}`);
    });

    // Step 4: Test driver profile
    console.log('\n4️⃣  Fetching driver profile...');
    const profileResponse = await fetch(`${API_BASE_URL}/api/v1/auth/drivers/`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!profileResponse.ok) {
      console.log(`❌ Driver profile fetch failed: ${profileResponse.status}`);
      return;
    }

    const driverProfile = await profileResponse.json();
    console.log(`✅ Driver profile loaded`);
    console.log(`   Name: ${driverProfile.first_name} ${driverProfile.last_name}`);
    console.log(`   Available: ${driverProfile.is_available}`);
    console.log(`   On Duty: ${driverProfile.is_on_duty}`);

    console.log('\n🎯 Mobile App Orders Test Complete!');
    console.log('✅ Backend is working correctly');
    console.log('✅ Authentication working');
    console.log(`✅ ${orders.length} orders available`);
    console.log(`✅ ${ongoingDeliveries.length} ongoing deliveries`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testMobileOrders().catch(console.error);