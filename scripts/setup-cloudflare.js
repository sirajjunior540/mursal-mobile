#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function setupCloudflareEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  
  console.log('🌐 Setting up environment for Cloudflare tunnel connection...');
  console.log('📱 Using Cloudflare tunnel: german-cities-armed-ids.trycloudflare.com');
  
  const envContent = `# Environment Configuration for Driver App - Cloudflare Tunnel
NODE_ENV=development

# Server Configuration - Required for environment.ts
SERVER_IP=german-cities-armed-ids.trycloudflare.com
SERVER_PORT=443
SERVER_PROTOCOL=https

# API Configuration - Cloudflare Tunnel
API_BASE_URL=https://german-cities-armed-ids.trycloudflare.com
API_HOST=sirajjunior.german-cities-armed-ids.trycloudflare.com
API_TIMEOUT=30000

# Tenant Configuration
TENANT_ID=sirajjunior
TENANT_SUBDOMAIN=sirajjunior
DEFAULT_TENANT_ID=sirajjunior

# WebSocket Configuration - Cloudflare Tunnel
WS_BASE_URL=wss://german-cities-armed-ids.trycloudflare.com
WS_HOST=sirajjunior.german-cities-armed-ids.trycloudflare.com

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_LOCATION_TRACKING=true

# Debug Configuration
DEBUG_API_CALLS=true
DEBUG_REALTIME=true
DEBUG_LOCATION=true

# Production-like settings for tunnel
USE_HTTPS=true
VERIFY_SSL=true
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Cloudflare tunnel environment configured successfully!');
  console.log(`📝 Configuration written to: ${envPath}`);
  console.log('\n🚀 You can now run the app with:');
  console.log('  npm run android  (for Android)');
  console.log('  npm run ios      (for iOS)');
  console.log('\n🌐 App will connect to:');
  console.log('  API: https://german-cities-armed-ids.trycloudflare.com');
  console.log('  WebSocket: wss://german-cities-armed-ids.trycloudflare.com');
  console.log('  Tenant: sirajjunior.german-cities-armed-ids.trycloudflare.com');
  console.log('\n📋 Benefits of using Cloudflare tunnel:');
  console.log('  ✓ Works from anywhere (not just local network)');
  console.log('  ✓ HTTPS/WSS support for production-like testing');
  console.log('  ✓ No need to configure firewall or port forwarding');
  console.log('  ✓ Secure tunnel to your local development server');
}

if (require.main === module) {
  setupCloudflareEnvironment();
}

module.exports = { setupCloudflareEnvironment };