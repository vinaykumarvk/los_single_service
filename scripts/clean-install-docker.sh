#!/bin/bash

# Clean Install Docker Desktop
# Removes conflicts and does a fresh installation

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Clean Install Docker Desktop                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Step 1: Checking current Docker installation...${NC}"

# Check if Docker Desktop is running
if docker info &> /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is currently running${NC}"
    echo -e "${YELLOW}⚠️  Docker Desktop is already installed and working${NC}"
    echo -e "${BLUE}You may not need to reinstall.${NC}"
    echo ""
    read -p "Do you want to continue with clean reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Keeping current installation${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}🧹 Step 2: Cleaning up existing installation...${NC}"

# Remove Homebrew cask (if installed)
if brew list --cask docker &> /dev/null 2>&1; then
    echo -e "${BLUE}Removing Docker Desktop from Homebrew...${NC}"
    brew uninstall --cask docker 2>/dev/null || true
fi

# Remove conflicting symlinks
SYMLINKS=(
    "/usr/local/bin/docker"
    "/usr/local/bin/docker-compose"
    "/usr/local/bin/docker-credential-desktop"
    "/usr/local/bin/docker-credential-osxkeychain"
    "/usr/local/bin/docker-index"
    "/usr/local/bin/hub-tool"
    "/usr/local/bin/kubectl.docker"
    "/usr/local/cli-plugins/docker-compose"
)

BACKUP_DIR="$HOME/.docker-cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}Backing up existing symlinks to: $BACKUP_DIR${NC}"

for link in "${SYMLINKS[@]}"; do
    if [ -L "$link" ] || [ -f "$link" ]; then
        echo -e "${YELLOW}   Found: $link${NC}"
        sudo cp -L "$link" "$BACKUP_DIR/$(basename $link)" 2>/dev/null || true
        sudo rm -f "$link" 2>/dev/null || {
            echo -e "${YELLOW}   ⚠️  Need password to remove: $link${NC}"
            echo -e "${BLUE}   Please run: sudo rm $link${NC}"
        }
    fi
done

# Remove /usr/local/cli-plugins directory if empty
if [ -d "/usr/local/cli-plugins" ]; then
    if [ -z "$(ls -A /usr/local/cli-plugins)" ]; then
        sudo rmdir /usr/local/cli-plugins 2>/dev/null || true
    fi
fi

echo ""
echo -e "${GREEN}✅ Cleanup complete${NC}"

echo ""
echo -e "${YELLOW}📦 Step 3: Installing Docker Desktop fresh...${NC}"
echo -e "${BLUE}You will be prompted for your password if needed${NC}"
echo ""

# Clean Homebrew cache
brew cleanup 2>/dev/null || true

# Install Docker Desktop
brew install --cask docker

echo ""
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${GREEN}✅ Docker Desktop installed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Opening Docker Desktop...${NC}"
    open -a Docker
    
    echo ""
    echo -e "${YELLOW}⏳ Please wait for Docker Desktop to start${NC}"
    echo -e "${BLUE}   Look for the whale icon (🐳) in your menu bar${NC}"
    echo -e "${BLUE}   This takes 1-2 minutes the first time${NC}"
    echo ""
    
    echo -e "${BLUE}Waiting 15 seconds, then checking Docker status...${NC}"
    sleep 15
    
    # Check if Docker is ready
    if docker info &> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is running!${NC}"
    else
        echo -e "${YELLOW}⏳ Docker Desktop is still starting...${NC}"
        echo -e "${BLUE}   Please wait a bit longer${NC}"
        echo -e "${BLUE}   Verify with: docker info${NC}"
    fi
else
    echo -e "${RED}❌ Installation failed${NC}"
    echo -e "${YELLOW}Please check error messages above${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "   1. Wait for Docker Desktop to fully start"
echo -e "   2. Verify with: ${YELLOW}./scripts/check-docker.sh${NC}"
echo -e "   3. Start LOS infrastructure: ${YELLOW}cd infra && docker compose up -d${NC}"
echo ""
echo -e "${BLUE}Backup location: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "${BLUE}(You can delete this after verifying Docker works)${NC}"

