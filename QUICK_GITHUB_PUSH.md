# Quick Guide: Push to GitHub

## 🚀 Quick Push Script

```bash
./scripts/push-to-github.sh
```

This script will:
1. ✅ Check git status
2. ✅ Ask to commit changes (if any)
3. ✅ Push to GitHub
4. ✅ Handle remote setup if needed

## 📋 Manual Steps (Alternative)

If you prefer to push manually:

```bash
# 1. Check status
git status

# 2. Stage changes (if any)
git add .

# 3. Commit changes (if any)
git commit -m "Your commit message"

# 4. Push to GitHub
git push origin main
```

## 🔧 Setup (First Time Only)

### Option 1: Using GitHub CLI (Recommended)

```bash
# Install GitHub CLI if not installed
brew install gh

# Login to GitHub
gh auth login

# Create repository (if new)
gh repo create los-app --public --source=. --remote=origin --push
```

### Option 2: Using SSH Keys

```bash
# 1. Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. Add to GitHub
# Copy public key: cat ~/.ssh/id_ed25519.pub
# Add to GitHub: Settings > SSH and GPG keys > New SSH key

# 3. Add remote
git remote add origin git@github.com:username/los-app.git
```

### Option 3: Using Personal Access Token

```bash
# 1. Create token on GitHub:
# Settings > Developer settings > Personal access tokens > Generate new token
# Permissions: repo (all)

# 2. Add remote (use token as password)
git remote add origin https://github.com/username/los-app.git

# When pushing, use token as password
git push origin main
```

## 🔍 Troubleshooting

### Authentication Issues

```bash
# Check remote URL
git remote -v

# Update remote URL
git remote set-url origin https://github.com/username/repo.git
# or
git remote set-url origin git@github.com:username/repo.git
```

### Branch Issues

```bash
# Check current branch
git branch

# Create and switch to main branch
git checkout -b main

# Or rename current branch
git branch -M main
```

### Push Conflicts

```bash
# Pull latest changes first
git pull origin main --rebase

# Then push
git push origin main
```

## ✅ Verification

After pushing, verify on GitHub:

```bash
# Check remote status
git remote show origin

# View commits
git log --oneline -5
```

## 📝 Commit Message Examples

```bash
git commit -m "Fix: Authentication guard redirect issue"
git commit -m "Feature: Mobile usability improvements"
git commit -m "Update: Testing and deployment readiness"
```

