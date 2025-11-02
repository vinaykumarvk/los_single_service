#!/bin/bash

# Create Multiple RM Users and Get Their IDs
# Creates rm1, rm2, rm3 with different customer assignments

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

KEYCLOAK_URL="http://localhost:8080"
REALM="los"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Creating Multiple RM Users                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

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

echo -e "${GREEN}✅ Got admin token${NC}"
echo ""

# Function to create user
create_user() {
  local username=$1
  local password=$2
  local email=$3
  local firstName=$4
  local lastName=$5
  
  # Check if user exists
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users and len(users) > 0 else '')" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    echo -e "${YELLOW}  User ${username} already exists (ID: ${USER_ID})${NC}"
    echo "$USER_ID"
    return
  fi
  
  echo -e "${BLUE}  Creating user: ${username}...${NC}"
  
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
  
  if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "409" ]; then
    echo -e "${YELLOW}  ⚠️  Failed to create user (HTTP $HTTP_CODE)${NC}"
    return
  fi
  
  # Get user ID
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users and len(users) > 0 else '')" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    echo -e "${GREEN}  ✅ User created (ID: ${USER_ID})${NC}"
    echo "$USER_ID"
  else
    echo -e "${YELLOW}  ⚠️  Could not get user ID${NC}"
    return
  fi
}

# Function to assign roles
assign_roles() {
  local user_id=$1
  
  # Get role IDs
  ROLE_IDS=""
  for role in "rm" "relationship_manager"; do
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
  
  echo -e "${GREEN}  ✅ Roles assigned${NC}"
}

echo -e "${BLUE}👥 Creating RM users...${NC}"
echo ""

# Create RM users
RM1_ID=$(create_user "rm1" "rm1" "rm1@los.test" "Relationship" "Manager")
if [ -n "$RM1_ID" ]; then
  assign_roles "$RM1_ID"
fi

RM2_ID=$(create_user "rm2" "rm2" "rm2@los.test" "John" "Smith")
if [ -n "$RM2_ID" ]; then
  assign_roles "$RM2_ID"
fi

RM3_ID=$(create_user "rm3" "rm3" "rm3@los.test" "Sarah" "Johnson")
if [ -n "$RM3_ID" ]; then
  assign_roles "$RM3_ID"
fi

echo ""
echo -e "${GREEN}✅ RM users created!${NC}"
echo ""
echo -e "${BLUE}📋 RM User IDs:${NC}"
echo -e "  ${GREEN}RM1:${NC} ${RM1_ID}"
echo -e "  ${GREEN}RM2:${NC} ${RM2_ID}"
echo -e "  ${GREEN}RM3:${NC} ${RM3_ID}"
echo ""

# Save IDs to file
cat > /tmp/rm_user_ids.txt << EOF
RM1_ID=${RM1_ID}
RM2_ID=${RM2_ID}
RM3_ID=${RM3_ID}
EOF

echo -e "${BLUE}💾 User IDs saved to: /tmp/rm_user_ids.txt${NC}"
echo ""
echo -e "${BLUE}🚀 Next: Run ./scripts/assign-applications-to-rms.sh to assign customers${NC}"

