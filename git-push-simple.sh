#!/bin/bash

# Simple script to push to GitHub
# Usage: ./git-push-simple.sh

set -e

BRANCH=$(git branch --show-current)
REMOTE=$(git remote get-url origin 2>/dev/null || echo "not-configured")

echo "🚀 Git Push Script"
echo "Branch: $BRANCH"
echo "Remote: $REMOTE"
echo ""

# Stage and commit
if [ -n "$(git status --porcelain)" ]; then
  echo "📝 Staging changes..."
  git add -A
  
  echo "💾 Committing..."
  git commit -m "feat: Complete feature implementation

- Dynamic Rule Configuration Engine
- Video KYC Workflow
- Saga Visualization/Monitoring  
- Real-time UI Updates (SSE)
- Role-based UI Views
- CORS and database fixes
- Error handling improvements" || echo "Nothing to commit"
fi

# Push
echo "🚀 Pushing to origin/$BRANCH..."
git push origin "$BRANCH" || git push -u origin "$BRANCH"

echo "✅ Done!"

