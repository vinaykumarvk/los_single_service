#!/bin/bash

# Regression test script for login flow
# This ensures login doesn't break after code changes

set -e

echo "🔍 Verifying Login Flow (Regression Test)"
echo "=========================================="
echo ""

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
AUTH_URL="${AUTH_URL:-http://localhost:3002}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

# Test credentials
USERNAME="rm1"
PASSWORD="rm1Rm@123456"

ERRORS=0

# Test 1: Gateway health
echo "Test 1: Gateway Health Check"
if curl -s "$GATEWAY_URL/health" | grep -q "OK"; then
  echo "✅ Gateway is healthy"
else
  echo "❌ Gateway health check failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Auth service health
echo "Test 2: Auth Service Health Check"
if curl -s "$AUTH_URL/health" | grep -q "OK"; then
  echo "✅ Auth service is healthy"
else
  echo "❌ Auth service health check failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Direct auth service login
echo "Test 3: Direct Auth Service Login (port 3002)"
AUTH_RESPONSE=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$AUTH_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); exit(0 if 'accessToken' in data else 1)" 2>/dev/null; then
  echo "✅ Direct auth service login works"
else
  echo "❌ Direct auth service login failed"
  echo "Response: $AUTH_RESPONSE"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 4: Gateway /api/auth/login route
echo "Test 4: Gateway /api/auth/login Route"
GATEWAY_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$GATEWAY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); exit(0 if 'accessToken' in data else 1)" 2>/dev/null; then
  echo "✅ Gateway /api/auth/login route works"
else
  echo "❌ Gateway /api/auth/login route failed"
  echo "Response: $GATEWAY_RESPONSE"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 5: Gateway /auth/login route (backward compatibility)
echo "Test 5: Gateway /auth/login Route (backward compatibility)"
GATEWAY_LEGACY_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$GATEWAY_LEGACY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); exit(0 if 'accessToken' in data else 1)" 2>/dev/null; then
  echo "✅ Gateway /auth/login route works (backward compatibility)"
else
  echo "⚠️  Gateway /auth/login route failed (optional for backward compatibility)"
fi
echo ""

# Test 6: Frontend proxy (if frontend is running)
echo "Test 6: Frontend Proxy (via Vite dev server)"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
  FRONTEND_RESPONSE=$(curl -s -X POST "$FRONTEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
  
  if echo "$FRONTEND_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); exit(0 if 'accessToken' in data else 1)" 2>/dev/null; then
    echo "✅ Frontend proxy login works"
  else
    echo "⚠️  Frontend proxy login failed (may need frontend restart)"
  fi
else
  echo "⚠️  Frontend not running (skipping frontend proxy test)"
fi
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All critical tests passed! Login flow is working."
  exit 0
else
  echo "❌ $ERRORS test(s) failed. Please fix the issues above."
  exit 1
fi

