# GitHub Push Guide

## Quick Start

### Option 1: Using the Automated Script (Recommended)

```bash
# Push to existing repository
./scripts/push-to-github.sh

# Push to new repository
./scripts/push-to-github.sh https://github.com/username/los.git main
```

### Option 2: Manual Push

```bash
# 1. Clean up codebase
./CLEANUP_SCRIPT.sh

# 2. Initialize git (if not already done)
git init

# 3. Add remote repository
git remote add origin https://github.com/username/los.git

# 4. Stage all files
git add .

# 5. Commit
git commit -m "feat: Production-ready LoS application"

# 6. Push to GitHub
git push -u origin main
```

## Authentication Methods

### Method 1: SSH Keys (Recommended)

1. Generate SSH key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add SSH key to GitHub:
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Add to GitHub: Settings → SSH and GPG keys → New SSH key

3. Update remote URL:
   ```bash
   git remote set-url origin git@github.com:username/los.git
   ```

### Method 2: GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or: https://cli.github.com/

# Authenticate
gh auth login

# Push (CLI will handle authentication)
./scripts/push-to-github.sh
```

### Method 3: Personal Access Token

1. Create token: GitHub → Settings → Developer settings → Personal access tokens
2. Use token as password when pushing:
   ```bash
   git push origin main
   # Username: your_username
   # Password: your_token
   ```

## Pre-Push Checklist

- [x] Code cleanup completed (`./CLEANUP_SCRIPT.sh`)
- [x] All tests passing (`pnpm test`)
- [x] No sensitive data committed (passwords, API keys)
- [x] .gitignore properly configured
- [x] README.md updated
- [x] No backup files included
- [x] Environment variables in .env (not committed)

## Repository Structure

```
Los/
├── services/          # Microservices
├── gateway/          # API Gateway
├── web/             # Frontend
├── shared/          # Shared libraries
├── scripts/         # Utility scripts
├── infra/           # Infrastructure configs
├── README.md        # Main documentation
└── .gitignore       # Git ignore rules
```

## Branch Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches

## Troubleshooting

### "Repository not found"
- Check repository URL is correct
- Verify you have access to the repository
- Ensure repository exists on GitHub

### "Authentication failed"
- Use SSH keys or GitHub CLI
- Check SSH key is added to GitHub
- Verify git remote URL

### "Large file" errors
- Check for large binary files
- Add to .gitignore if not needed
- Use Git LFS for large files if required

## After Pushing

1. Verify files on GitHub
2. Set repository visibility (Public/Private)
3. Add repository description
4. Enable GitHub Actions (if using CI/CD)
5. Add collaborators (if needed)

## Security Notes

- ✅ No passwords or secrets committed
- ✅ .env files excluded via .gitignore
- ✅ API keys should use environment variables
- ✅ Review .gitignore before pushing

