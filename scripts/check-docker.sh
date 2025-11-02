#!/bin/bash

# Check Docker Desktop Installation Status

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Docker Desktop Installation Checker       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker command exists
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>&1)
    echo -e "${GREEN}✅ Docker CLI found: ${DOCKER_VERSION}${NC}"
else
    echo -e "${RED}❌ Docker CLI not found${NC}"
    echo -e "${YELLOW}   Docker Desktop is not installed${NC}"
    echo ""
    echo -e "${BLUE}📥 To install:${NC}"
    echo -e "   1. Visit: https://www.docker.com/products/docker-desktop"
    echo -e "   2. Download for macOS"
    echo -e "   3. Install and open Docker Desktop"
    echo ""
    exit 1
fi

# Check if Docker is running
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    # Check Docker Compose
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version 2>&1 | head -1)
        echo -e "${GREEN}✅ Docker Compose: ${COMPOSE_VERSION}${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker Compose not found${NC}"
    fi
    
    # Check Docker Desktop specifically
    if [ -d "/Applications/Docker.app" ]; then
        echo -e "${GREEN}✅ Docker Desktop installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker Desktop not found in Applications${NC}"
        echo -e "   Docker CLI is available, but Desktop GUI may not be installed"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Docker is ready to use!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "   1. Start LOS infrastructure: ${YELLOW}cd infra && docker compose up -d${NC}"
    echo -e "   2. Check status: ${YELLOW}docker compose ps${NC}"
    
else
    echo -e "${RED}❌ Docker is not running${NC}"
    echo ""
    echo -e "${YELLOW}📋 To start Docker Desktop:${NC}"
    echo -e "   1. Open Docker Desktop from Applications"
    echo -e "   2. Wait for Docker to start (whale icon in menu bar)"
    echo -e "   3. Run this script again to verify"
    echo ""
    
    # Try to open Docker Desktop
    if [ -d "/Applications/Docker.app" ]; then
        echo -e "${BLUE}Attempting to open Docker Desktop...${NC}"
        open -a Docker
        echo -e "${YELLOW}Please wait for Docker Desktop to start, then run this script again${NC}"
    fi
fi

