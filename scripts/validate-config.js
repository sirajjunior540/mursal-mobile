#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates environment configuration before starting the app
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Required environment variables
const REQUIRED_VARS = [
  'NODE_ENV',
  'SERVER_IP',
  'SERVER_PORT',
  'SERVER_PROTOCOL',
  'TENANT_ID'
];

// Optional environment variables with defaults
const OPTIONAL_VARS = {
  'TENANT_SUBDOMAIN': process.env.TENANT_ID || 'sirajjunior',
  'API_TIMEOUT': '30000',
  'ENABLE_WEBSOCKET': 'true',
  'ENABLE_PUSH_NOTIFICATIONS': 'true',
  'ENABLE_LOCATION_TRACKING': 'true',
  'ENABLE_OFFLINE_MODE': 'false',
  'DEBUG_API_CALLS': 'true',
  'DEBUG_REALTIME': 'true',
  'DEBUG_LOCATION': 'true',
  'DEBUG_PERFORMANCE': 'true'
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateConfig() {
  log('blue', '🔍 Validating environment configuration...\n');
  
  let errors = [];
  let warnings = [];
  let isValid = true;
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('.env file not found. Copy .env.example to .env');
    isValid = false;
  }
  
  // Validate required variables
  log('blue', '📋 Checking required variables:');
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
      log('red', `  ❌ ${varName}: Missing`);
      isValid = false;
    } else {
      log('green', `  ✅ ${varName}: ${value}`);
    }
  }
  
  // Validate specific values
  log('blue', '\n🔧 Validating configuration values:');
  
  // SERVER_IP validation
  const serverIP = process.env.SERVER_IP;
  if (serverIP) {
    if (serverIP === 'YOUR_SERVER_IP_HERE') {
      errors.push('SERVER_IP is not configured. Update from YOUR_SERVER_IP_HERE to your actual IP');
      log('red', `  ❌ SERVER_IP: Not configured (${serverIP})`);
      isValid = false;
    } else if (serverIP.includes('192.168.') || serverIP.includes('10.') || serverIP.includes('172.')) {
      log('green', `  ✅ SERVER_IP: ${serverIP} (Local network)`);
    } else {
      log('green', `  ✅ SERVER_IP: ${serverIP} (External)`);
    }
  }
  
  // SERVER_PORT validation
  const serverPort = parseInt(process.env.SERVER_PORT);
  if (serverPort) {
    if (serverPort < 1 || serverPort > 65535) {
      errors.push('SERVER_PORT must be between 1 and 65535');
      log('red', `  ❌ SERVER_PORT: ${serverPort} (Invalid range)`);
      isValid = false;
    } else {
      log('green', `  ✅ SERVER_PORT: ${serverPort}`);
    }
  }
  
  // SERVER_PROTOCOL validation
  const serverProtocol = process.env.SERVER_PROTOCOL;
  if (serverProtocol && !['http', 'https'].includes(serverProtocol)) {
    errors.push('SERVER_PROTOCOL must be either "http" or "https"');
    log('red', `  ❌ SERVER_PROTOCOL: ${serverProtocol} (Invalid)`);
    isValid = false;
  } else if (serverProtocol) {
    log('green', `  ✅ SERVER_PROTOCOL: ${serverProtocol}`);
  }
  
  // API_TIMEOUT validation
  const apiTimeout = parseInt(process.env.API_TIMEOUT || '30000');
  if (apiTimeout < 1000) {
    warnings.push('API_TIMEOUT should be at least 1000ms for reliable connections');
    log('yellow', `  ⚠️  API_TIMEOUT: ${apiTimeout}ms (Very low)`);
  } else {
    log('green', `  ✅ API_TIMEOUT: ${apiTimeout}ms`);
  }
  
  // Environment-specific validations
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    log('blue', '\n🚀 Production environment checks:');
    
    if (serverProtocol === 'http') {
      warnings.push('Using HTTP in production is not recommended. Consider HTTPS');
      log('yellow', '  ⚠️  Using HTTP in production (consider HTTPS)');
    }
    
    if (process.env.DEBUG_API_CALLS === 'true') {
      warnings.push('Debug logging enabled in production may impact performance');
      log('yellow', '  ⚠️  Debug logging enabled in production');
    }
    
    if (serverPort === 8000) {
      warnings.push('Using development port 8000 in production');
      log('yellow', '  ⚠️  Using development port in production');
    }
  }
  
  // Check optional variables
  log('blue', '\n📝 Optional variables (using defaults if not set):');
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[varName] || defaultValue;
    log('blue', `  ℹ️  ${varName}: ${value}`);
  }
  
  // Build configuration summary
  if (serverIP && serverPort && serverProtocol) {
    const apiBaseUrl = `${serverProtocol}://${serverIP}:${serverPort}`;
    const tenantHost = `${process.env.TENANT_SUBDOMAIN || process.env.TENANT_ID || 'sirajjunior'}.${serverIP}`;
    
    log('blue', '\n🌐 Generated URLs:');
    log('green', `  📡 API Base URL: ${apiBaseUrl}`);
    log('green', `  🏠 Tenant Host: ${tenantHost}`);
    log('green', `  🔌 WebSocket URL: ${serverProtocol === 'https' ? 'wss' : 'ws'}://${serverIP}:${serverPort}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (isValid) {
    log('green', '✅ Configuration is valid!');
  } else {
    log('red', '❌ Configuration has errors!');
  }
  
  if (errors.length > 0) {
    log('red', '\n🚨 Errors:');
    errors.forEach(error => log('red', `  • ${error}`));
  }
  
  if (warnings.length > 0) {
    log('yellow', '\n⚠️  Warnings:');
    warnings.forEach(warning => log('yellow', `  • ${warning}`));
  }
  
  console.log('='.repeat(60));
  
  return isValid;
}

// Run validation
if (require.main === module) {
  const isValid = validateConfig();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateConfig };