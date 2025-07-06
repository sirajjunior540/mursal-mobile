#!/bin/bash

# Network Debug Tool for DriverApp Login Issues
echo "🔧 Network Debug Tool for DriverApp Login"
echo "=================================================="

API_BASE_URL="http://192.168.1.149:8000"
API_HOST="sirajjunior.192.168.1.149"
TENANT_ID="sirajjunior"

echo "📍 Configuration:"
echo "   API Base URL: $API_BASE_URL"
echo "   API Host: $API_HOST"
echo "   Tenant ID: $TENANT_ID"
echo ""

echo "1️⃣ Basic Connectivity Tests"
echo "------------------------------"

# Test 1: Server reachability
echo "🧪 Testing server reachability..."
if ping -c 1 192.168.1.149 &> /dev/null; then
    echo "  ✅ Server 192.168.1.149 is reachable"
else
    echo "  ❌ Server 192.168.1.149 is NOT reachable"
fi

# Test 2: Port connectivity
echo "🧪 Testing port 8000 connectivity..."
if nc -z 192.168.1.149 8000 2>/dev/null; then
    echo "  ✅ Port 8000 is open"
else
    echo "  ❌ Port 8000 is closed or filtered"
fi

echo ""
echo "2️⃣ HTTP Endpoint Tests"
echo "------------------------------"

# Test basic endpoints
endpoints=(
    "/"
    "/health/"
    "/api/"
    "/api/v1/"
    "/api/v1/auth/"
)

for endpoint in "${endpoints[@]}"; do
    url="${API_BASE_URL}${endpoint}"
    echo "🧪 Testing: $url"
    
    response=$(curl -s -w "%{http_code}" -H "Host: $API_HOST" "$url" 2>/dev/null)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "000" ]; then
        echo "  ❌ Connection failed (timeout or network error)"
    elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
        echo "  ✅ HTTP $http_code - Success"
        if [ ${#body} -gt 0 ] && [ ${#body} -lt 200 ]; then
            echo "     Response: $body"
        fi
    elif [ "$http_code" = "404" ]; then
        echo "  ⚠️  HTTP $http_code - Not Found (may be expected)"
    else
        echo "  ❌ HTTP $http_code - Error"
        if [ ${#body} -gt 0 ] && [ ${#body} -lt 200 ]; then
            echo "     Response: $body"
        fi
    fi
done

echo ""
echo "3️⃣ Login Endpoint Test"
echo "------------------------------"

# Test login endpoint with sample credentials
login_url="${API_BASE_URL}/api/v1/auth/token/"
echo "🧪 Testing login endpoint: $login_url"

# Test with sample credentials
login_response=$(curl -s -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -H "Host: $API_HOST" \
    -X POST \
    -d '{"username":"testuser","password":"testpass"}' \
    "$login_url" 2>/dev/null)

login_http_code="${login_response: -3}"
login_body="${login_response%???}"

echo "  📤 Request: POST $login_url"
echo "  📤 Headers: Content-Type: application/json, Host: $API_HOST"
echo "  📤 Body: {\"username\":\"testuser\",\"password\":\"testpass\"}"

if [ "$login_http_code" = "000" ]; then
    echo "  ❌ Connection failed (timeout or network error)"
elif [ "$login_http_code" = "200" ]; then
    echo "  ✅ HTTP $login_http_code - Login endpoint is working"
    echo "     Response: ${login_body:0:200}..."
elif [ "$login_http_code" = "400" ] || [ "$login_http_code" = "401" ]; then
    echo "  ⚠️  HTTP $login_http_code - Endpoint working but credentials invalid (expected)"
    echo "     Response: ${login_body:0:200}..."
elif [ "$login_http_code" = "404" ]; then
    echo "  ❌ HTTP $login_http_code - Login endpoint not found"
    echo "     Response: ${login_body:0:200}..."
else
    echo "  ❌ HTTP $login_http_code - Unexpected error"
    echo "     Response: ${login_body:0:200}..."
fi

echo ""
echo "4️⃣ Network Information"
echo "------------------------------"

echo "📱 Local IP addresses:"
if command -v ifconfig >/dev/null 2>&1; then
    ifconfig | grep -E "inet.*broadcast" | awk '{print "   " $2}'
elif command -v ip >/dev/null 2>&1; then
    ip addr show | grep -E "inet.*scope global" | awk '{print "   " $2}'
else
    echo "   Could not determine local IP addresses"
fi

echo ""
echo "📱 Default route:"
if command -v route >/dev/null 2>&1; then
    route -n get default 2>/dev/null | grep gateway || echo "   Could not determine default gateway"
elif command -v ip >/dev/null 2>&1; then
    ip route show default | head -1 || echo "   Could not determine default gateway"
else
    echo "   Could not determine routing information"
fi

echo ""
echo "✅ Network tests completed!"
echo ""
echo "💡 Troubleshooting Tips:"
echo "   • Ensure the Django server is running on 192.168.1.149:8000"
echo "   • Check if tenant 'sirajjunior' is configured in Django"
echo "   • Verify CORS and ALLOWED_HOSTS settings in Django"
echo "   • Test from a browser: http://192.168.1.149:8000/api/v1/auth/"
echo "   • Check firewall settings on the server"
echo "   • Make sure you're on the same network as the server"
echo ""
echo "📝 Django settings to check:"
echo "   ALLOWED_HOSTS = ['192.168.1.149', 'sirajjunior.192.168.1.149', '*']"
echo "   CORS_ALLOW_ALL_ORIGINS = True (for development)"
echo "   Django tenant middleware properly configured"