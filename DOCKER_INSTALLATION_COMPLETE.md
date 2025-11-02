# Docker Desktop Installation

## Installation Status

Docker Desktop installation has been initiated via Homebrew.

## Next Steps

### 1. Wait for Installation to Complete
Homebrew is downloading and installing Docker Desktop. This may take a few minutes depending on your internet connection.

### 2. Open Docker Desktop
After installation:
- Docker Desktop should automatically open
- Or manually open from Applications → Docker
- Or run: `open -a Docker`

### 3. Complete Setup
- Follow the Docker Desktop setup wizard
- You may be asked for your password (for privileged access)
- Wait for Docker to fully start (whale icon in menu bar should appear)

### 4. Verify Installation
Run the check script:
```bash
./scripts/check-docker.sh
```

Expected output:
```
✅ Docker CLI found: Docker version x.x.x
✅ Docker is running
✅ Docker Compose: Docker Compose version x.x.x
✅ Docker Desktop installed
```

## If Installation Fails

### Manual Installation

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Download for macOS (Apple Silicon or Intel based on your Mac)

2. **Install:**
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications
   - Open Docker from Applications
   - Complete setup wizard

3. **Verify:**
   ```bash
   docker --version
   docker info
   ```

## After Docker is Running

Once Docker Desktop is running, start the LOS infrastructure:

```bash
cd /Users/n15318/LoS/infra
docker compose up -d

# Verify infrastructure is running
docker compose ps
```

This will start:
- PostgreSQL (database)
- Redpanda/Kafka (event streaming)
- MinIO (document storage)
- Keycloak (authentication)

## Troubleshooting

### Docker Desktop won't start
- Check System Preferences → Security & Privacy
- Make sure you have admin privileges
- Restart your Mac if needed

### Installation takes too long
- Check your internet connection
- Homebrew may be downloading a large file (~500MB)
- Be patient, it will complete

### Command not found after installation
```bash
# Add to PATH (if needed)
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

---

**Once Docker is running, you'll have full infrastructure support for the LOS application!**

