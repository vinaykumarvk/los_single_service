#!/bin/bash

# Script to push code to GitHub
# Usage: ./push-to-github.sh [commit-message]

set -e  # Exit on error

echo "🚀 Pushing code to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
  echo "❌ Error: Not a git repository. Please initialize git first:"
  echo "   git init"
  echo "   git remote add origin <your-github-repo-url>"
  exit 1
fi

# Check if remote is configured
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "⚠️  Warning: No 'origin' remote configured."
  echo "   Please add your GitHub repository:"
  echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"
echo ""

# Check for uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ No changes to commit"
else
  echo "📝 Staged changes:"
  git status --short
  echo ""
  
  # Get commit message from argument or prompt
  if [ -n "$1" ]; then
    COMMIT_MSG="$1"
  else
    echo "Enter commit message (or press Enter for default):"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
      COMMIT_MSG="feat: Add remaining features and fixes

- Implemented Dynamic Rule Configuration Engine
- Added Video KYC Workflow  
- Implemented Saga Visualization/Monitoring
- Added Real-time UI Updates (SSE)
- Implemented Role-based UI Views
- Fixed CORS and database connection issues
- Added comprehensive error handling"
    fi
  fi
  
  # Stage all changes
  echo "📦 Staging all changes..."
  git add -A
  
  # Commit changes
  echo "💾 Committing changes..."
  git commit -m "$COMMIT_MSG"
  echo "✅ Committed successfully"
  echo ""
fi

# Check if branch exists on remote
if git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
  echo "🔄 Branch '$CURRENT_BRANCH' exists on remote"
  echo "   Pulling latest changes first..."
  git pull origin "$CURRENT_BRANCH" --rebase || {
    echo "⚠️  Could not pull/rebase. You may need to resolve conflicts manually."
    echo "   Continuing with push..."
  }
else
  echo "✨ Branch '$CURRENT_BRANCH' is new on remote"
fi

echo ""
echo "🚀 Pushing to GitHub..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "   Branch: $CURRENT_BRANCH"
echo "   Remote: $(git remote get-url origin)"

