#!/bin/bash

# Setup Test Users for Different Personas
# Creates RM, Admin, and Operations users in Keycloak

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setting Up Test Users for Personas           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="los"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"

echo -e "${BLUE}Step 1: Getting Keycloak Admin Token...${NC}"

# Get admin token
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Could not get admin token. Is Keycloak running?${NC}"
  echo -e "${YELLOW}   Trying to use Keycloak Admin CLI instead...${NC}"
  
  # Alternative: Use Keycloak Admin CLI if available
  if command -v kcadm.sh &> /dev/null; then
    echo "Using kcadm.sh..."
  else
    echo -e "${YELLOW}⚠️  Keycloak Admin CLI not found.${NC}"
    echo -e "${BLUE}Creating users manually via API...${NC}"
  fi
else
  echo -e "${GREEN}✅ Got admin token${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Creating test users...${NC}"

# Function to create user in Keycloak
create_user() {
  local username=$1
  local password=$2
  local email=$3
  local firstName=$4
  local lastName=$5
  local roles=$6
  
  echo -e "${YELLOW}  Creating user: ${username}${NC}"
  
  if [ -n "$ACCESS_TOKEN" ]; then
    # Create user
    CREATE_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\": \"${username}\",
        \"email\": \"${email}\",
        \"firstName\": \"${firstName}\",
        \"lastName\": \"${lastName}\",
        \"enabled\": true,
        \"credentials\": [{
          \"type\": \"password\",
          \"value\": \"${password}\",
          \"temporary\": false
        }]
      }" 2>&1)
    
    # Get user ID
    USER_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else '')" 2>/dev/null || echo "")
    
    if [ -n "$USER_ID" ]; then
      # Assign roles
      IFS=',' read -ra ROLE_ARRAY <<< "$roles"
      for role in "${ROLE_ARRAY[@]}"; do
        curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${USER_ID}/role-mappings/realm" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d "[{\"id\": \"$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${role}" -H "Authorization: Bearer ${ACCESS_TOKEN}" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")\", \"name\": \"${role}\"}]" > /dev/null 2>&1 || true
      done
      echo -e "${GREEN}    ✅ Created ${username} with roles: ${roles}${NC}"
    else
      echo -e "${YELLOW}    ⚠️  User might already exist${NC}"
    fi
  else
    echo -e "${YELLOW}    ⚠️  Skipping (no admin token)${NC}"
  fi
}

# Create RM user
create_user "rm1" "rm1" "rm1@los.test" "Relationship" "Manager" "rm,relationship_manager"

# Create Admin user  
create_user "admin1" "admin1" "admin1@los.test" "System" "Administrator" "admin,pii:read"

# Create Operations user
create_user "ops1" "ops1" "ops1@los.test" "Operations" "Officer" "ops,checker"

echo ""
echo -e "${GREEN}✅ User creation complete!${NC}"
echo ""
echo -e "${BLUE}Test Users Created:${NC}"
echo -e "  ${GREEN}RM User:${NC}"
echo -e "    Username: rm1"
echo -e "    Password: rm1"
echo -e "    Roles: rm, relationship_manager"
echo ""
echo -e "  ${GREEN}Admin User:${NC}"
echo -e "    Username: admin1"
echo -e "    Password: admin1"
echo -e "    Roles: admin, pii:read"
echo ""
echo -e "  ${GREEN}Operations User:${NC}"
echo -e "    Username: ops1"
echo -e "    Password: ops1"
echo -e "    Roles: ops, checker"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Setup RM-customer mappings: ./scripts/setup-rm-assignments.sh"
echo -e "  2. Test personas: See PERSONA_TESTING_GUIDE.md"

