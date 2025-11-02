#!/bin/bash

# Fix Docker Installation Conflict
# Removes orphaned symlinks from previous failed installation

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Fix Docker Installation Conflict             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Diagnosing the issue...${NC}"
echo ""

# Check what's there
BROKEN_LINKS=0
if [ -L "/usr/local/bin/hub-tool" ]; then
    TARGET=$(readlink "/usr/local/bin/hub-tool" 2>/dev/null || echo "")
    if [ ! -f "$TARGET" ] && [ ! -d "$TARGET" ]; then
        echo -e "${RED}❌ Broken symlink: /usr/local/bin/hub-tool${NC}"
        echo -e "   Points to: $TARGET (missing)"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
    fi
fi

if [ $BROKEN_LINKS -gt 0 ]; then
    echo ""
    echo -e "${BLUE}🧹 Step 1: Removing broken symlinks...${NC}"
    echo -e "${YELLOW}You will be prompted for your password${NC}"
    echo ""
    
    # List all Docker-related symlinks
    DOCKER_SYMLINKS=(
        "/usr/local/bin/docker"
        "/usr/local/bin/docker-compose"
        "/usr/local/bin/docker-credential-desktop"
        "/usr/local/bin/docker-credential-osxkeychain"
        "/usr/local/bin/docker-index"
        "/usr/local/bin/hub-tool"
        "/usr/local/bin/kubectl.docker"
    )
    
    echo -e "${BLUE}Removing orphaned Docker symlinks...${NC}"
    for link in "${DOCKER_SYMLINKS[@]}"; do
        if [ -L "$link" ] || [ -f "$link" ]; then
            echo -e "${YELLOW}   Removing: $link${NC}"
            sudo rm -f "$link" 2>/dev/null || {
                echo -e "${RED}   ❌ Could not remove (permission denied)${NC}"
                echo -e "${YELLOW}   Please run manually: sudo rm $link${NC}"
            }
        fi
    done
    
    # Remove CLI plugins directory if it's a symlink or empty
    if [ -d "/usr/local/cli-plugins" ]; then
        if [ -z "$(ls -A /usr/local/cli-plugins 2>/dev/null)" ]; then
            echo -e "${YELLOW}   Removing empty directory: /usr/local/cli-plugins${NC}"
            sudo rmdir /usr/local/cli-plugins 2>/dev/null || true
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Cleanup complete${NC}"
else
    echo -e "${GREEN}✅ No broken symlinks found${NC}"
fi

echo ""
echo -e "${BLUE}🧹 Step 2: Cleaning Homebrew cask state...${NC}"

# Uninstall if partially installed
if brew list --cask docker &> /dev/null 2>&1; then
    echo -e "${BLUE}Removing partial Homebrew installation...${NC}"
    brew uninstall --cask docker 2>/dev/null || true
fi

# Clean Homebrew
brew cleanup 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Ready for fresh installation${NC}"
echo ""
echo -e "${BLUE}📦 Step 3: Installing Docker Desktop...${NC}"
echo -e "${YELLOW}You may be prompted for your password${NC}"
echo ""

# Install Docker Desktop
brew install --cask docker

echo ""
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${GREEN}✅ Docker Desktop installed!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Opening Docker Desktop...${NC}"
    open -a Docker
    
    echo ""
    echo -e "${YELLOW}⏳ Please wait for Docker Desktop to start (1-2 minutes)${NC}"
    echo -e "${BLUE}   Look for whale icon (🐳) in menu bar${NC}"
    
    # Wait and check
    sleep 15
    if docker info &> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is running!${NC}"
    else
        echo -e "${YELLOW}⏳ Docker is still starting...${NC}"
    fi
else
    echo -e "${RED}❌ Installation may have failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo -e "${BLUE}Verify with: ${YELLOW}./scripts/check-docker.sh${NC}"

