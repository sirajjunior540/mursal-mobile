// Debug helper to understand order ID structure
// Add this to your api.ts temporarily to debug the issue

export const debugOrderIds = (backendData: any, source: string) => {
  console.log(`\n🔍 DEBUG ORDER IDS - Source: ${source}`);
  console.log('================================');
  
  // Log the raw structure
  console.log('Raw data structure:', JSON.stringify(backendData, null, 2));
  
  // Check if it's a delivery object
  const hasOrder = backendData.order && typeof backendData.order === 'object';
  const hasDeliveryFields = 'driver' in backendData || 'delivery_time' in backendData;
  
  console.log('Structure analysis:');
  console.log(`- Has nested order object: ${hasOrder}`);
  console.log(`- Has delivery fields: ${hasDeliveryFields}`);
  console.log(`- Root level ID: ${backendData.id}`);
  
  if (hasOrder) {
    console.log(`- Order ID: ${backendData.order.id}`);
    console.log(`- Order Number: ${backendData.order.order_number}`);
  }
  
  console.log('\nExpected ID mapping:');
  console.log(`- Main ID (for API calls): ${backendData.id}`);
  console.log(`- Delivery ID: ${backendData.id}`);
  console.log(`- Order ID: ${hasOrder ? backendData.order.id : backendData.id}`);
  
  console.log('================================\n');
};

// Usage in api.ts:
// In getActiveOrders() after getting response:
// response.data.forEach((item, index) => debugOrderIds(item, `available_orders[${index}]`));

// In pollNewOrders() after getting response:
// response.data.forEach((item, index) => debugOrderIds(item, `poll_orders[${index}]`));