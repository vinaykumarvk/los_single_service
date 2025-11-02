#!/bin/bash

# Fix Docker Desktop Installation Conflict

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Fixing Docker Desktop Installation Conflict   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check for the conflicting file
CONFLICT_FILE="/usr/local/bin/hub-tool"

if [ -f "$CONFLICT_FILE" ]; then
    echo -e "${YELLOW}⚠️  Found conflicting file: $CONFLICT_FILE${NC}"
    echo -e "${BLUE}   Checking what it is...${NC}"
    
    FILE_INFO=$(ls -lh "$CONFLICT_FILE" 2>/dev/null)
    echo -e "   $FILE_INFO"
    
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo -e "   1. Back up and remove the conflicting file"
    echo -e "   2. Rename it temporarily"
    echo ""
    
    read -p "Back up and remove $CONFLICT_FILE? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup first
        BACKUP_DIR="$HOME/.docker-install-backup"
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/hub-tool-$(date +%Y%m%d-%H%M%S)"
        
        echo -e "${BLUE}📦 Backing up to: $BACKUP_FILE${NC}"
        sudo cp "$CONFLICT_FILE" "$BACKUP_FILE" 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Need sudo password to backup/remove file${NC}"
            echo -e "${BLUE}Removing conflicting file (sudo required)...${NC}"
            sudo rm "$CONFLICT_FILE"
        }
        
        if [ -f "$BACKUP_FILE" ]; then
            sudo rm "$CONFLICT_FILE"
            echo -e "${GREEN}✅ File backed up and removed${NC}"
        else
            # Try without backup if permission denied
            echo -e "${YELLOW}Attempting removal (may need password)...${NC}"
            sudo rm "$CONFLICT_FILE" || {
                echo -e "${RED}❌ Could not remove file${NC}"
                echo -e "${YELLOW}Please run manually: sudo rm $CONFLICT_FILE${NC}"
                exit 1
            }
        fi
        
        echo -e "${GREEN}✅ Conflict resolved${NC}"
    else
        echo -e "${YELLOW}Skipping file removal${NC}"
        echo -e "${BLUE}You can manually remove it later: sudo rm $CONFLICT_FILE${NC}"
    fi
else
    echo -e "${GREEN}✅ No conflicting file found${NC}"
fi

echo ""
echo -e "${BLUE}Cleaning up any partial Docker installations...${NC}"

# Clean up any partial installations
brew uninstall --cask docker 2>/dev/null || true
brew cleanup 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Ready to install Docker Desktop${NC}"
echo ""
echo -e "${BLUE}Now installing Docker Desktop...${NC}"
echo -e "${YELLOW}You may be prompted for your password${NC}"
echo ""

# Install Docker Desktop
brew install --cask docker

echo ""
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${GREEN}✅ Docker Desktop installed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Opening Docker Desktop...${NC}"
    open -a Docker
    
    echo ""
    echo -e "${YELLOW}⏳ Please wait for Docker Desktop to start (1-2 minutes)${NC}"
    echo -e "${BLUE}   Look for the whale icon (🐳) in your menu bar${NC}"
else
    echo -e "${RED}❌ Installation may have failed${NC}"
    echo -e "${YELLOW}Please check for error messages above${NC}"
    exit 1
fi

