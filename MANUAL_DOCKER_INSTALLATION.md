# Manual Docker Desktop Installation

## Status
Homebrew installation requires your password, so please complete installation manually.

## Quick Installation Steps

### Method 1: Download and Install (Recommended)

1. **Download Docker Desktop:**
   - Open: https://www.docker.com/products/docker-desktop
   - Click "Download for Mac"
   - Select version for Apple Silicon (M1/M2/M3) - your Mac uses ARM64

2. **Install:**
   - Open the downloaded `Docker.dmg` file
   - Drag `Docker.app` to the Applications folder
   - Open Docker from Applications (or Spotlight search "Docker")
   - Enter your password when prompted
   - Follow the setup wizard

3. **Wait for Docker to Start:**
   - Look for whale icon in your menu bar (top right)
   - Wait for "Docker Desktop is running" message
   - This takes 1-2 minutes the first time

4. **Verify:**
   ```bash
   docker --version
   docker info
   ```

### Method 2: Try Homebrew with Password (If Preferred)

If you want to try Homebrew installation, you'll need to provide your password:

```bash
brew install --cask docker
# You'll be prompted for your password
# After installation completes:
open -a Docker
```

---

## After Docker Desktop is Running

Once Docker Desktop is running (whale icon visible), start the LOS infrastructure:

```bash
cd /Users/n15318/LoS
./scripts/check-docker.sh

# If Docker is running, start infrastructure:
cd infra
docker compose up -d

# Check status
docker compose ps
```

---

## Direct Download Links

### For Apple Silicon (M1/M2/M3) - Your Mac Type:
https://desktop.docker.com/mac/main/arm64/Docker.dmg

### For Intel Mac:
https://desktop.docker.com/mac/main/amd64/Docker.dmg

---

## Verification

After installation, run:
```bash
./scripts/check-docker.sh
```

You should see:
```
✅ Docker CLI found
✅ Docker is running
✅ Docker Desktop installed
```

---

**Please install Docker Desktop manually, then we can start the full infrastructure!**

