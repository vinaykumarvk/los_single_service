#!/bin/bash

# Simple script to create test users in Keycloak

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
  echo "❌ Failed to get admin token. Is Keycloak running?"
  exit 1
fi

echo "✅ Got admin token"
echo ""

# Create roles if they don't exist
echo "📋 Ensuring roles exist..."
for role in "rm" "relationship_manager"; do
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/roles" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${role}\",\"description\":\"${role}\"}" > /dev/null 2>&1 || true
done
echo "✅ Roles ready"
echo ""

# Function to create user
create_user() {
  local username=$1
  local password=$2
  local email=$3
  local firstName=$4
  local lastName=$5
  
  echo "👤 Creating user: ${username}..."
  
  # Create user
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${username}\",
      \"email\": \"${email}\",
      \"firstName\": \"${firstName}\",
      \"lastName\": \"${lastName}\",
      \"enabled\": true,
      \"credentials\": [{\"type\": \"password\", \"value\": \"${password}\", \"temporary\": false}]
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "201" ]; then
    echo "  ✅ User created"
  elif [ "$HTTP_CODE" = "409" ]; then
    echo "  ⚠️  User already exists, updating..."
  else
    echo "  ❌ Failed (HTTP $HTTP_CODE)"
    return 1
  fi
  
  # Get user ID
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users and len(users) > 0 else '')" 2>/dev/null)
  
  if [ -z "$USER_ID" ]; then
    echo "  ❌ Could not get user ID"
    return 1
  fi
  
  echo "  📝 User ID: ${USER_ID}"
  echo "$USER_ID"
}

# Create users
echo "👥 Creating users..."
echo ""

RM1_ID=$(create_user "rm1" "rm1" "rm1@los.test" "Relationship" "Manager")
OPS1_ID=$(create_user "ops1" "ops1" "ops1@los.test" "Operations" "Officer")

# Admin1 already exists in seed, skip or update
echo "👤 Checking admin1..."
ADMIN_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=admin1" \
  -H "Authorization: Bearer ${TOKEN}")
ADMIN1_ID=$(echo "$ADMIN_DATA" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users and len(users) > 0 else '')" 2>/dev/null)

if [ -z "$ADMIN1_ID" ]; then
  ADMIN1_ID=$(create_user "admin1" "admin1" "admin1@los.test" "System" "Administrator")
else
  echo "  ✅ Admin1 already exists"
fi

echo ""
echo "🔐 Assigning roles..."

# Assign roles to users
assign_roles() {
  local user_id=$1
  local roles=$2
  
  # Get role IDs
  ROLE_IDS=""
  for role in $roles; do
    ROLE_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${role}" \
      -H "Authorization: Bearer ${TOKEN}")
    ROLE_ID=$(echo "$ROLE_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
    if [ -n "$ROLE_ID" ]; then
      ROLE_IDS="${ROLE_IDS}{\"id\":\"${ROLE_ID}\",\"name\":\"${role}\"},"
    fi
  done
  
  # Remove trailing comma
  ROLE_IDS="[${ROLE_IDS%,}]"
  
  # Assign roles
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user_id}/role-mappings/realm" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$ROLE_IDS" > /dev/null 2>&1
}

if [ -n "$RM1_ID" ]; then
  echo "  Assigning roles to rm1..."
  assign_roles "$RM1_ID" "rm relationship_manager"
  echo "    ✅ RM roles assigned"
fi

if [ -n "$OPS1_ID" ]; then
  echo "  Assigning roles to ops1..."
  assign_roles "$OPS1_ID" "ops checker"
  echo "    ✅ Ops roles assigned"
fi

if [ -n "$ADMIN1_ID" ]; then
  echo "  Assigning roles to admin1..."
  assign_roles "$ADMIN1_ID" "admin pii:read"
  echo "    ✅ Admin roles assigned"
fi

echo ""
echo "✅ User setup complete!"
echo ""
echo "📋 Test Users Created:"
echo "  RM:      rm1 / rm1 (roles: rm, relationship_manager)"
echo "  Admin:   admin1 / admin1 (roles: admin, pii:read)"
echo "  Ops:     ops1 / ops1 (roles: ops, checker)"
echo ""
echo "🚀 Next steps:"
echo "  1. Run: ./scripts/setup-rm-assignments.sh"
echo "  2. See: PERSONA_TESTING_GUIDE.md"

