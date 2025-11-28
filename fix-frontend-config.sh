#!/bin/bash
# Script to fix frontend configuration to point to monolith

ENV_FILE="web/.env.local"

echo "🔧 Fixing frontend configuration to use monolith on port 3000..."

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE..."
    touch "$ENV_FILE"
fi

# Backup existing file
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backed up existing config to ${ENV_FILE}.backup.*"

# Remove old service-specific configs
sed -i.bak '/^VITE_API_APPLICATION=/d' "$ENV_FILE"
sed -i.bak '/^VITE_API_KYC=/d' "$ENV_FILE"
sed -i.bak '/^VITE_API_DOCUMENT=/d' "$ENV_FILE"
rm -f "${ENV_FILE}.bak"

# Add or update VITE_API_GATEWAY
if grep -q "^VITE_API_GATEWAY=" "$ENV_FILE"; then
    sed -i.bak 's|^VITE_API_GATEWAY=.*|VITE_API_GATEWAY=http://localhost:3000|' "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
else
    echo "" >> "$ENV_FILE"
    echo "# Using monolith on port 3000 (all services consolidated)" >> "$ENV_FILE"
    echo "VITE_API_GATEWAY=http://localhost:3000" >> "$ENV_FILE"
fi

echo "✅ Updated $ENV_FILE"
echo ""
echo "Current configuration:"
grep "VITE_API" "$ENV_FILE" || echo "  (no VITE_API variables found)"
echo ""
echo "⚠️  Please restart your web dev server for changes to take effect:"
echo "   cd web && pnpm dev"

