# Configuration Guide

## Industry Best Practice Environment Configuration

This project follows industry best practices for environment configuration with **zero hardcoded values** and full flexibility for different deployment environments.

## Quick Setup

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Update your server IP:**
   ```bash
   # Edit .env file
   SERVER_IP=192.168.1.149  # Replace with your actual IP
   ```

3. **Validate configuration:**
   ```bash
   node scripts/validate-config.js
   ```

## Configuration Structure

### Core Server Configuration
```env
# REQUIRED - No fallback values
SERVER_IP=192.168.1.149      # Your Django server IP
SERVER_PORT=8000            # Server port  
SERVER_PROTOCOL=http        # http or https
```

### Tenant Configuration
```env
TENANT_ID=sirajjunior       # Your tenant identifier
TENANT_SUBDOMAIN=sirajjunior # Tenant subdomain
```

### Generated URLs
The system automatically generates all URLs from the base configuration:
- **API Base URL**: `{SERVER_PROTOCOL}://{SERVER_IP}:{SERVER_PORT}`
- **Tenant Host**: `{TENANT_SUBDOMAIN}.{SERVER_IP}`
- **WebSocket URL**: `ws://{SERVER_IP}:{SERVER_PORT}` (or wss for https)

## Environment-Specific Files

### Development (`.env.development`)
- Debug logging enabled
- Extended timeouts
- Local IP configuration

### Production (`.env.production`)
- Debug logging disabled
- Optimized timeouts
- HTTPS configuration
- Performance optimizations

### Current (`.env`)
- Active configuration
- Override any environment-specific settings

## Feature Flags

Control app features via environment variables:

```env
ENABLE_WEBSOCKET=true           # Real-time updates
ENABLE_PUSH_NOTIFICATIONS=true # Push notifications
ENABLE_LOCATION_TRACKING=true  # GPS tracking
ENABLE_OFFLINE_MODE=false      # Offline functionality
```

## Debug Configuration

Debug logging is automatically disabled in production:

```env
DEBUG_API_CALLS=true       # API request/response logging
DEBUG_REALTIME=true        # WebSocket debugging
DEBUG_LOCATION=true        # GPS debugging
DEBUG_PERFORMANCE=true     # Performance metrics
```

## IP Address Management

### For Development
1. Find your machine's IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `.env`:
   ```env
   SERVER_IP=192.168.1.149  # Your actual IP
   ```

### For Production
```env
SERVER_IP=api.yourapp.com
SERVER_PORT=443
SERVER_PROTOCOL=https
```

## Validation

The configuration system includes comprehensive validation:

### Required Variables
- `NODE_ENV` - Environment type
- `SERVER_IP` - Server IP address
- `SERVER_PORT` - Server port
- `SERVER_PROTOCOL` - http or https
- `TENANT_ID` - Tenant identifier

### Automatic Checks
- ✅ Required variables present
- ✅ Valid IP address format
- ✅ Port in valid range (1-65535)
- ✅ Protocol is http/https
- ✅ URLs properly formatted

### Run Validation
```bash
node scripts/validate-config.js
```

## Configuration Loading

The system loads configuration in this order:
1. Environment-specific file (`.env.development`, `.env.production`)
2. Main `.env` file
3. Built-in fallbacks (minimal)

## Error Handling

### Configuration Errors
- Missing required variables → Emergency fallback configuration prevents crashes
- Invalid values → Clear error messages with helpful suggestions
- Production safeguards → Strict validation with fallbacks

### Runtime Safety
- **Emergency fallback**: App continues running with default values if config fails
- **Hybrid loading**: Works with both react-native-config and dotenv
- **Development support**: Automatic dotenv loading in development mode

### Network Errors
- Connection timeouts → Retry logic
- DNS resolution → Fallback mechanisms
- Host unreachable → User-friendly messages

## Mobile App Integration

The mobile app automatically:
- ✅ Reads configuration from environment
- ✅ Validates all settings on startup
- ✅ Builds URLs dynamically
- ✅ Handles network errors gracefully

## Examples

### Local Development
```env
NODE_ENV=development
SERVER_IP=192.168.1.149
SERVER_PORT=8000
SERVER_PROTOCOL=http
TENANT_ID=sirajjunior
```

### Staging Environment
```env
NODE_ENV=staging
SERVER_IP=staging.yourapp.com
SERVER_PORT=8080
SERVER_PROTOCOL=https
TENANT_ID=staging
```

### Production Environment
```env
NODE_ENV=production
SERVER_IP=api.yourapp.com
SERVER_PORT=443
SERVER_PROTOCOL=https
TENANT_ID=production
DEBUG_API_CALLS=false
```

## Troubleshooting

### Common Issues

1. **"Configuration Error: Required environment variable SERVER_IP is not set"**
   - Copy `.env.example` to `.env`
   - Set `SERVER_IP` to your actual IP address

2. **"Network error. Cannot reach http://192.168.1.149:8000"**
   - Verify Django is running: `python manage.py runserver 0.0.0.0:8000`
   - Check phone and computer are on same WiFi network

3. **"Invalid SERVER_IP configuration"**
   - Update `SERVER_IP` from `YOUR_SERVER_IP_HERE` to actual IP
   - Use `ifconfig` to find your IP address

### Debug Steps
1. Run configuration validation
2. Check Django server is accessible
3. Verify tenant configuration in Django
4. Test with curl commands

## Security

### Production Checklist
- [ ] Use HTTPS (`SERVER_PROTOCOL=https`)
- [ ] Disable debug logging (`DEBUG_*=false`)
- [ ] Use secure ports (443, not 8000)
- [ ] Validate SSL certificates
- [ ] Configure proper CORS settings

### Development Safety
- ✅ No hardcoded credentials
- ✅ Environment isolation
- ✅ Configuration validation
- ✅ Error handling without exposure