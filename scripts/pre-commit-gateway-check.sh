#!/bin/bash

# Pre-commit hook to check gateway route order
# This ensures critical routes are in the correct order

GATEWAY_FILE="gateway/src/server.ts"

if [ ! -f "$GATEWAY_FILE" ]; then
  echo "⚠️  Gateway file not found: $GATEWAY_FILE"
  exit 0
fi

# Check route order
AUTH_LINE=$(grep -n "app.use('/api/auth'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
APPLICANTS_LINE=$(grep -n "app.use('/api/applicants'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
APPLICATIONS_LINE=$(grep -n "app.use('/api/applications'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)

ERRORS=0

if [ -n "$AUTH_LINE" ] && [ -n "$APPLICANTS_LINE" ]; then
  if [ "$AUTH_LINE" -gt "$APPLICANTS_LINE" ]; then
    echo "❌ ERROR: /api/auth route comes AFTER /api/applicants"
    echo "   /api/auth must come before /api/applicants"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ -n "$APPLICANTS_LINE" ] && [ -n "$APPLICATIONS_LINE" ]; then
  if [ "$APPLICANTS_LINE" -gt "$APPLICATIONS_LINE" ]; then
    echo "❌ ERROR: /api/applicants route comes AFTER /api/applications"
    echo "   /api/applicants must come before /api/applications to avoid route conflicts"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "⚠️  Gateway route order is incorrect!"
  echo "   Correct order must be:"
  echo "   1. /api/auth"
  echo "   2. /api/applicants"
  echo "   3. /api/applications"
  echo ""
  echo "   Please fix the route order in gateway/src/server.ts"
  exit 1
fi

echo "✅ Gateway route order is correct"
exit 0

