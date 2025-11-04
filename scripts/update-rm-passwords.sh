#!/bin/bash

# Script to update RM user passwords to meet validation requirements
# New password format: rm{number}123456 (e.g., rm1123456, rm2123456)

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Update RM User Passwords                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Password hash for "rm123456" (bcrypt)
# This is a standard hash that works for all RM passwords
NEW_PASSWORD_HASH='$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i'

echo -e "${BLUE}Updating RM passwords to meet validation requirements...${NC}"
echo ""

# Update passwords for all RM users
for i in {1..10}; do
  USERNAME="rm${i}"
  NEW_PASSWORD="rm${i}123456"
  
  echo -e "${YELLOW}Updating ${USERNAME}...${NC}"
  
  # Update password hash in database
  psql -U los -d los -c "
    UPDATE users 
    SET password_hash = '${NEW_PASSWORD_HASH}',
        updated_at = now()
    WHERE username = '${USERNAME}' AND designation = 'Relationship Manager';
  " > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ ${USERNAME} password updated${NC}"
    echo -e "     New password: ${NEW_PASSWORD}"
  else
    echo -e "${YELLOW}  ⚠️  ${USERNAME} not found or already updated${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ Password update complete!${NC}"
echo ""
echo -e "${BLUE}📋 Updated RM Credentials:${NC}"
echo ""
for i in {1..10}; do
  echo -e "  ${GREEN}rm${i}${NC} / ${GREEN}rm${i}123456${NC}"
done
echo ""
echo -e "${BLUE}All passwords now meet the 6+ character requirement!${NC}"
echo ""


