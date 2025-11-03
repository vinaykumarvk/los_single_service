#!/bin/bash

# Script to push LoS code to GitHub
# Usage: ./scripts/push-to-github.sh [remote-name] [branch-name]

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REMOTE="${1:-origin}"
BRANCH="${2:-main}"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Push LoS Code to GitHub                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git repository not initialized${NC}"
    echo "   Run: git init"
    exit 1
fi

# Check if remote exists
if ! git remote get-url "$REMOTE" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Remote '$REMOTE' not found${NC}"
    echo ""
    echo "Available remotes:"
    git remote -v
    echo ""
    read -p "Enter GitHub repository URL (or press Enter to skip): " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git remote add "$REMOTE" "$REPO_URL"
        echo -e "${GREEN}✅ Added remote '$REMOTE'${NC}"
    else
        echo -e "${RED}❌ Cannot proceed without remote${NC}"
        exit 1
    fi
fi

REMOTE_URL=$(git remote get-url "$REMOTE")
echo -e "${BLUE}Remote:${NC} $REMOTE ($REMOTE_URL)"
echo -e "${BLUE}Branch:${NC} $BRANCH"
echo ""

# Check current status
echo -e "${BLUE}Checking git status...${NC}"
STATUS=$(git status --porcelain)
if [ -z "$STATUS" ]; then
    echo -e "${GREEN}✅ Working directory is clean${NC}"
else
    echo -e "${YELLOW}⚠️  Uncommitted changes detected:${NC}"
    echo "$STATUS" | head -10
    echo ""
    read -p "Do you want to commit these changes? (y/n): " COMMIT_CHANGES
    if [ "$COMMIT_CHANGES" = "y" ] || [ "$COMMIT_CHANGES" = "Y" ]; then
        read -p "Enter commit message: " COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        echo ""
        echo -e "${BLUE}Staging changes...${NC}"
        git add .
        echo -e "${BLUE}Committing changes...${NC}"
        git commit -m "$COMMIT_MSG"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping commit${NC}"
    fi
fi

# Check if branch exists
if ! git rev-parse --verify "$BRANCH" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Branch '$BRANCH' does not exist locally${NC}"
    read -p "Create branch '$BRANCH'? (y/n): " CREATE_BRANCH
    if [ "$CREATE_BRANCH" = "y" ] || [ "$CREATE_BRANCH" = "Y" ]; then
        git checkout -b "$BRANCH"
        echo -e "${GREEN}✅ Created and switched to branch '$BRANCH'${NC}"
    else
        echo -e "${RED}❌ Cannot proceed without branch${NC}"
        exit 1
    fi
else
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
        echo -e "${YELLOW}⚠️  Currently on branch '$CURRENT_BRANCH'${NC}"
        read -p "Switch to branch '$BRANCH'? (y/n): " SWITCH_BRANCH
        if [ "$SWITCH_BRANCH" = "y" ] || [ "$SWITCH_BRANCH" = "Y" ]; then
            git checkout "$BRANCH"
            echo -e "${GREEN}✅ Switched to branch '$BRANCH'${NC}"
        fi
    fi
fi

# Show what will be pushed
echo ""
echo -e "${BLUE}Changes to push:${NC}"
git log "$REMOTE/$BRANCH..HEAD" --oneline 2>/dev/null | head -10 || echo "  (No commits ahead of remote)"
echo ""

# Confirm push
read -p "Push to $REMOTE/$BRANCH? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${YELLOW}⚠️  Push cancelled${NC}"
    exit 0
fi

# Push to GitHub
echo ""
echo -e "${BLUE}Pushing to GitHub...${NC}"
if git push -u "$REMOTE" "$BRANCH"; then
    echo ""
    echo -e "${GREEN}✅ Successfully pushed to $REMOTE/$BRANCH${NC}"
    echo ""
    echo -e "${BLUE}Repository URL:${NC} $REMOTE_URL"
    echo -e "${GREEN}✅ Code is now on GitHub!${NC}"
else
    echo ""
    echo -e "${RED}❌ Push failed${NC}"
    echo ""
    echo "Common issues:"
    echo "  • Authentication required (use GitHub CLI or SSH keys)"
    echo "  • Branch conflict (try: git pull --rebase first)"
    echo "  • No write access to repository"
    echo ""
    exit 1
fi
