#!/bin/bash

# Gateway Route Audit Script
# Ensures all frontend API calls have corresponding gateway routes

set -e

echo "🔍 Gateway Route Audit"
echo "====================="
echo ""

FRONTEND_ENDPOINTS=(
  "/api/auth/login"
  "/api/auth/refresh"
  "/api/applicants/:id"
  "/api/applications"
  "/api/applications/:id"
  "/api/applications/:id/submit"
  "/api/applications/:id/submit-for-verification"
  "/api/applications/:id/completeness"
  "/api/applications/:id/timeline"
  "/api/applications/:id/assign"
  "/api/applications/rm/dashboard"
  "/api/applications/:id/applicant"
  "/api/applications/:id/property"
  "/api/applications/:id/documents"
  "/api/applications/:id/documents/checklist"
  "/api/documents/:id"
  "/api/integrations/pan/validate"
  "/api/integrations/ekyc/start"
  "/api/integrations/ekyc/submit-otp"
  "/api/integrations/ekyc/:sessionId/status"
  "/api/integrations/bank/verify"
  "/api/integrations/bank/verify-name"
  "/api/integrations/bank/penny-drop"
  "/api/integrations/bank/penny-drop/:requestId/status"
  "/api/integrations/bureau/pull"
  "/api/integrations/bureau/:requestId/report"
  "/api/masters/branches"
  "/api/masters/products"
  "/api/masters/documents"
  "/api/masters/roles"
  "/api/masters/cities-states"
)

GATEWAY_ROUTES=(
  "/api/auth"
  "/api/applicants"
  "/api/applications"
  "/api/integrations"
  "/api/masters"
  "/api/documents"
)

MISSING_ROUTES=()
WARNINGS=()

echo "Checking frontend endpoints against gateway routes..."
echo ""

for endpoint in "${FRONTEND_ENDPOINTS[@]}"; do
  # Extract base path (remove :id, :sessionId, etc.)
  base_path=$(echo "$endpoint" | sed 's|/[^/]*:[^/]*|/:id|g' | cut -d'/' -f1-2)
  
  # Check if there's a matching gateway route
  found=false
  for route in "${GATEWAY_ROUTES[@]}"; do
    if [[ "$endpoint" == "$route"* ]]; then
      found=true
      break
    fi
  done
  
  if [ "$found" = false ]; then
    # Check if it's part of a known route pattern
    if [[ "$endpoint" == "/api/applications"* ]]; then
      # This should be handled by /api/applications route
      continue
    elif [[ "$endpoint" == "/api/integrations"* ]]; then
      # This should be handled by /api/integrations route
      continue
    elif [[ "$endpoint" == "/api/masters"* ]]; then
      # This should be handled by /api/masters route
      continue
    elif [[ "$endpoint" == "/api/documents"* ]]; then
      # This should be handled by /api/documents route
      continue
    elif [[ "$endpoint" == "/api/applicants"* ]]; then
      # This should be handled by /api/applicants route
      continue
    elif [[ "$endpoint" == "/api/auth"* ]]; then
      # This should be handled by /api/auth route
      continue
    else
      MISSING_ROUTES+=("$endpoint")
    fi
  fi
done

echo "✅ Route Coverage Check"
echo "----------------------"

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
  echo "✅ All frontend endpoints have corresponding gateway routes!"
else
  echo "❌ Missing routes found:"
  for route in "${MISSING_ROUTES[@]}"; do
    echo "   - $route"
  done
fi

echo ""
echo "📋 Route Order Verification"
echo "---------------------------"
echo "Checking critical route order in gateway..."

# Read gateway file to check route order
GATEWAY_FILE="gateway/src/server.ts"
if [ -f "$GATEWAY_FILE" ]; then
  # Check if /api/auth comes before /api/applicants
  AUTH_LINE=$(grep -n "app.use('/api/auth'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
  APPLICANTS_LINE=$(grep -n "app.use('/api/applicants'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
  APPLICATIONS_LINE=$(grep -n "app.use('/api/applications'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
  
  if [ -n "$AUTH_LINE" ] && [ -n "$APPLICANTS_LINE" ]; then
    if [ "$AUTH_LINE" -lt "$APPLICANTS_LINE" ]; then
      echo "✅ /api/auth comes before /api/applicants"
    else
      echo "❌ /api/auth should come before /api/applicants"
      WARNINGS+=("Route order issue: /api/auth should come before /api/applicants")
    fi
  fi
  
  if [ -n "$APPLICANTS_LINE" ] && [ -n "$APPLICATIONS_LINE" ]; then
    if [ "$APPLICANTS_LINE" -lt "$APPLICATIONS_LINE" ]; then
      echo "✅ /api/applicants comes before /api/applications"
    else
      echo "❌ /api/applicants should come before /api/applications"
      WARNINGS+=("Route order issue: /api/applicants should come before /api/applications")
    fi
  fi
else
  echo "⚠️  Gateway file not found: $GATEWAY_FILE"
fi

echo ""
echo "🔍 Specific Route Checks"
echo "------------------------"

# Check for specific problematic patterns
if grep -q "app.use('/api/applications'" "$GATEWAY_FILE" && grep -q "app.use('/api/applicants'" "$GATEWAY_FILE"; then
  APPLICANTS_BEFORE=$(grep -n "app.use('/api/applicants'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
  APPLICATIONS_BEFORE=$(grep -n "app.use('/api/applications'" "$GATEWAY_FILE" | head -1 | cut -d: -f1)
  
  if [ "$APPLICANTS_BEFORE" -gt "$APPLICATIONS_BEFORE" ]; then
    echo "❌ CRITICAL: /api/applicants route comes AFTER /api/applications"
    echo "   This will cause route conflicts! /api/applicants requests will match /api/applications"
    WARNINGS+=("CRITICAL: Route order will cause /api/applicants to fail")
  fi
fi

echo ""
echo "📊 Summary"
echo "----------"
if [ ${#MISSING_ROUTES[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
  echo "✅ All checks passed! No missing routes or warnings."
  exit 0
else
  if [ ${#MISSING_ROUTES[@]} -gt 0 ]; then
    echo "❌ Found ${#MISSING_ROUTES[@]} missing route(s)"
  fi
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "⚠️  Found ${#WARNINGS[@]} warning(s):"
    for warning in "${WARNINGS[@]}"; do
      echo "   - $warning"
    done
  fi
  exit 1
fi

