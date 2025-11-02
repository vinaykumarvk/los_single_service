# Installing Docker Desktop for macOS

## Option 1: Download and Install (Recommended)

### For Apple Silicon (M1/M2/M3) or Intel Mac

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Or direct download:
     - Apple Silicon: https://desktop.docker.com/mac/main/arm64/Docker.dmg
     - Intel: https://desktop.docker.com/mac/main/amd64/Docker.dmg

2. **Install:**
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications folder
   - Open Docker from Applications
   - Follow the setup wizard
   - Enter your password when prompted (for privileged access)

3. **Verify Installation:**
   ```bash
   docker --version
   docker compose version
   docker info
   ```

---

## Option 2: Install via Homebrew (Easier)

If you have Homebrew installed:

```bash
# Install Docker Desktop via Homebrew
brew install --cask docker

# After installation, open Docker Desktop
open /Applications/Docker.app

# Or start it from command line
open -a Docker
```

**Note**: Homebrew installation still requires you to manually open Docker Desktop the first time to complete setup.

---

## Option 3: Install via Homebrew (Command Line Only - Not Recommended)

```bash
# Install Docker CLI tools (but not Desktop GUI)
brew install docker docker-compose

# This gives you docker commands but not the full Desktop experience
# You'll need to install Docker Desktop separately for full functionality
```

---

## After Installation

### 1. Start Docker Desktop
- Open Docker Desktop from Applications
- Wait for Docker to start (whale icon in menu bar)
- You'll see "Docker Desktop is running" when ready

### 2. Verify Docker is Running

```bash
# Check Docker is running
docker info

# Check Docker Compose
docker compose version

# Test with a simple container
docker run hello-world
```

### 3. Configure Docker (Optional)

- **Resources**: Docker Desktop → Settings → Resources
  - Allocate enough memory (recommended: 4GB+)
  - Allocate CPU cores

### 4. Start LOS Infrastructure

Once Docker is running:

```bash
cd /Users/n15318/LoS/infra
docker compose up -d

# Check status
docker compose ps
```

---

## Troubleshooting

### Docker Desktop won't start

1. **Check System Requirements:**
   - macOS 10.15 or later
   - At least 4GB RAM
   - VirtualBox prior to version 4.3.30 must NOT be installed (it's incompatible)

2. **If Docker Desktop crashes:**
   ```bash
   # Reset Docker Desktop
   rm ~/Library/Group\ Containers/group.com.docker/settings.json
   # Restart Docker Desktop
   ```

3. **Permission Issues:**
   - Make sure you're not running Docker as root
   - Check System Preferences → Security & Privacy

### Docker commands not found

If `docker` command is not found after installation:

```bash
# Add Docker to PATH (usually automatic, but check)
echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or use full path
/Applications/Docker.app/Contents/Resources/bin/docker --version
```

---

## Quick Installation Script

I can create a script to help verify and guide installation, but the actual installation must be done manually or via Homebrew.

---

**After installing Docker Desktop, run:**
```bash
cd /Users/n15318/LoS/infra
docker compose up -d
```

This will start PostgreSQL, Kafka, MinIO, and Keycloak for the full application stack.

