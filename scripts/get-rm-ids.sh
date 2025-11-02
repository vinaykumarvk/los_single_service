#!/bin/bash

# Quick script to get all RM user IDs from Keycloak

KEYCLOAK_URL="http://localhost:8080"
REALM="los"

echo "🔐 Getting Keycloak admin token..."
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Got token"
echo ""
echo "📋 RM User IDs:"
echo ""

curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?briefRepresentation=true" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import sys, json
users = json.load(sys.stdin)
rm_users = [u for u in users if u.get('username', '').startswith('rm')]
if rm_users:
    print('Username        | User ID')
    print('-' * 70)
    for u in sorted(rm_users, key=lambda x: x.get('username', '')):
        print(f\"{u.get('username', ''):<15} | {u.get('id', 'N/A')}\")
    
    print('')
    print('SQL Assignment Commands:')
    print('')
    for u in sorted(rm_users, key=lambda x: x.get('username', '')):
        username = u.get('username', '')
        user_id = u.get('id', '')
        print(f\"-- {username}: {user_id}\")
        print(f\"UPDATE applications SET assigned_to = '{user_id}' WHERE ...\")
        print('')
else:
    print('No RM users found. Run ./scripts/create-multiple-rms.sh first')
"

