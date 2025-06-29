#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get local IP address
function getLocalIP() {
  try {
    // Try to get the IP from ifconfig (macOS/Linux)
    const result = execSync("ifconfig | grep -E 'inet.*broadcast' | grep -v '127.0.0.1' | awk '{print $2}' | head -1", { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    console.warn('Could not detect IP automatically. Please set it manually in .env');
    return '192.168.1.137'; // fallback
  }
}

function setupEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  const localIP = getLocalIP();
  
  console.log('🔧 Setting up environment for physical device testing...');
  console.log(`📱 Detected local IP: ${localIP}`);
  
  const envContent = `# Environment Configuration for Driver App - Physical Device
NODE_ENV=development

# API Configuration
API_BASE_URL=http://${localIP}:8000
API_HOST=sirajjunior.${localIP}
API_TIMEOUT=30000

# Tenant Configuration
DEFAULT_TENANT_ID=sirajjunior
TENANT_SUBDOMAIN=sirajjunior

# WebSocket Configuration
WS_BASE_URL=ws://${localIP}:8000
WS_HOST=sirajjunior.${localIP}

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_LOCATION_TRACKING=true

# Debug Configuration
DEBUG_API_CALLS=true
DEBUG_REALTIME=true
DEBUG_LOCATION=true
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Environment configured successfully!');
  console.log(`📝 Configuration written to: ${envPath}`);
  console.log('\n🚀 You can now run the app with:');
  console.log('  npm run android  (for Android)');
  console.log('  npm run ios      (for iOS)');
  console.log('\n🔧 Make sure your Django server is running on:');
  console.log(`  http://${localIP}:8000`);
  console.log('\n📋 Django setup checklist:');
  console.log('  1. Add the following to your Django ALLOWED_HOSTS:');
  console.log(`     - "${localIP}"`);
  console.log(`     - "sirajjunior.${localIP}"`);
  console.log('  2. Update CORS settings to allow requests from your mobile app');
  console.log('  3. Ensure tenant middleware handles the Host header correctly');
}

// Allow manual IP override
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === '--ip' && args[1]) {
  // Override IP manually
  const customIP = args[1];
  console.log(`🔧 Using custom IP: ${customIP}`);
  // Update the function to use custom IP
  setupEnvironment = () => {
    const envPath = path.join(__dirname, '..', '.env');
    
    console.log('🔧 Setting up environment for physical device testing...');
    console.log(`📱 Using custom IP: ${customIP}`);
    
    const envContent = `# Environment Configuration for Driver App - Physical Device
NODE_ENV=development

# API Configuration
API_BASE_URL=http://${customIP}:8000
API_HOST=sirajjunior.${customIP}
API_TIMEOUT=30000

# Tenant Configuration
DEFAULT_TENANT_ID=sirajjunior
TENANT_SUBDOMAIN=sirajjunior

# WebSocket Configuration
WS_BASE_URL=ws://${customIP}:8000
WS_HOST=sirajjunior.${customIP}

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_LOCATION_TRACKING=true

# Debug Configuration
DEBUG_API_CALLS=true
DEBUG_REALTIME=true
DEBUG_LOCATION=true
`;

    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Environment configured successfully!');
    console.log(`📝 Configuration written to: ${envPath}`);
    console.log('\n🚀 You can now run the app with:');
    console.log('  npm run android  (for Android)');
    console.log('  npm run ios      (for iOS)');
    console.log('\n🔧 Make sure your Django server is running on:');
    console.log(`  http://${customIP}:8000`);
  };
}

if (require.main === module) {
  setupEnvironment();
}