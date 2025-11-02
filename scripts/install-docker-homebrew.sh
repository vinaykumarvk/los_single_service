#!/bin/bash

# Attempt to install Docker Desktop via Homebrew
# Note: This still requires manual setup of Docker Desktop

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing Docker Desktop via Homebrew...${NC}"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found${NC}"
    echo ""
    echo -e "${YELLOW}Please install Homebrew first:${NC}"
    echo -e '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo -e "${BLUE}Or download Docker Desktop manually:${NC}"
    echo -e "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo -e "${GREEN}✅ Homebrew found${NC}"
echo ""

# Install Docker Desktop
echo -e "${BLUE}📦 Installing Docker Desktop...${NC}"
brew install --cask docker

echo ""
echo -e "${GREEN}✅ Docker Desktop installation initiated${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo -e "   1. Docker Desktop will be downloaded"
echo -e "   2. You may need to manually open /Applications/Docker.app"
echo -e "   3. Complete the Docker Desktop setup wizard"
echo -e "   4. Wait for Docker to fully start"
echo ""
echo -e "${BLUE}After installation, verify with:${NC}"
echo -e "   ${YELLOW}./scripts/check-docker.sh${NC}"
echo ""

# Try to open Docker Desktop if installed
if [ -d "/Applications/Docker.app" ]; then
    echo -e "${BLUE}Opening Docker Desktop...${NC}"
    open -a Docker
    echo ""
    echo -e "${YELLOW}Please complete the Docker Desktop setup and wait for it to start${NC}"
fi

