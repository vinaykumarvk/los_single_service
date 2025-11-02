#!/bin/bash

# Interactive Docker Desktop Installation
# This script will prompt for your password when needed
# Password is NOT stored - only used temporarily during installation

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Docker Desktop Installation (Interactive)     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Security notice
echo -e "${YELLOW}🔒 Security Note:${NC}"
echo -e "   Your password will be used temporarily for installation"
echo -e "   It will NOT be stored or saved anywhere"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found${NC}"
    echo ""
    echo -e "${YELLOW}Please install Homebrew first:${NC}"
    echo -e '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
fi

echo -e "${GREEN}✅ Homebrew found${NC}"
echo ""

# Check if Docker is already installed
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${YELLOW}⚠️  Docker Desktop appears to be already installed${NC}"
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Checking if Docker is running...${NC}"
        if docker info &> /dev/null; then
            echo -e "${GREEN}✅ Docker is already running${NC}"
            exit 0
        else
            echo -e "${YELLOW}Docker is installed but not running${NC}"
            echo -e "${BLUE}Opening Docker Desktop...${NC}"
            open -a Docker
            exit 0
        fi
    fi
fi

echo -e "${BLUE}📦 Installing Docker Desktop via Homebrew...${NC}"
echo -e "${YELLOW}You will be prompted for your password during installation${NC}"
echo ""

# Install Docker Desktop
# The password prompt will appear automatically when sudo is needed
brew install --cask docker

echo ""
echo -e "${GREEN}✅ Docker Desktop installation completed${NC}"
echo ""

# Check if Docker.app was installed
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${BLUE}Opening Docker Desktop...${NC}"
    open -a Docker
    
    echo ""
    echo -e "${YELLOW}⏳ Please wait for Docker Desktop to start${NC}"
    echo -e "${BLUE}   Look for the whale icon (🐳) in your menu bar${NC}"
    echo -e "${BLUE}   This may take 1-2 minutes${NC}"
    echo ""
    
    # Wait a bit and check
    echo -e "${BLUE}Waiting 10 seconds, then checking Docker status...${NC}"
    sleep 10
    
    # Try to check Docker status (may not be ready yet)
    if docker info &> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is running!${NC}"
    else
        echo -e "${YELLOW}⏳ Docker Desktop is starting...${NC}"
        echo -e "${BLUE}   Please wait a bit longer and then verify with:${NC}"
        echo -e "${YELLOW}   docker info${NC}"
    fi
else
    echo -e "${RED}❌ Docker Desktop installation may have failed${NC}"
    echo -e "${YELLOW}Please check for any error messages above${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "   1. Wait for Docker Desktop to fully start"
echo -e "   2. Verify with: ${YELLOW}./scripts/check-docker.sh${NC}"
echo -e "   3. Start LOS infrastructure: ${YELLOW}cd infra && docker compose up -d${NC}"

