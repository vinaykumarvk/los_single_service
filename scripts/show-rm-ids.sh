#!/bin/bash

# Simple script to show RM user IDs

KEYCLOAK_URL="http://localhost:8080"

echo "Getting RM user IDs..."
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  RM USER IDs"
echo "════════════════════════════════════════════════"
echo ""

for user in rm1 rm2 rm3; do
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/los/users?username=${user}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "
import sys, json
try:
    users = json.load(sys.stdin)
    if users and len(users) > 0:
        print(users[0].get('id', 'NOT_FOUND'))
    else:
        print('NOT_FOUND')
except:
    print('NOT_FOUND')
" 2>/dev/null)
  
  if [ "$USER_ID" != "NOT_FOUND" ] && [ -n "$USER_ID" ]; then
    printf "%-8s | %s\n" "$user" "$USER_ID"
  else
    printf "%-8s | NOT_FOUND\n" "$user"
  fi
done

echo ""
echo "════════════════════════════════════════════════"
echo ""
echo "To assign applications, use these IDs in SQL:"
echo ""
for user in rm1 rm2 rm3; do
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/los/users?username=${user}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "
import sys, json
try:
    users = json.load(sys.stdin)
    if users and len(users) > 0:
        print(users[0].get('id', ''))
    else:
        print('')
except:
    print('')
" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    echo "-- ${user}:"
    echo "UPDATE applications SET assigned_to = '${USER_ID}' WHERE ..."
    echo ""
  fi
done

