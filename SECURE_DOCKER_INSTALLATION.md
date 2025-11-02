# Secure Docker Desktop Installation

## Important Security Note

**We do NOT store passwords** in environment variables or files. This is a security best practice.

## Installation Options

### Option 1: Interactive Installation (Recommended)

Run the interactive script which will prompt for your password when needed:

```bash
./scripts/install-docker-with-password.sh
```

The script will:
- Prompt for your password interactively (not stored)
- Install Docker Desktop via Homebrew
- Open Docker Desktop automatically
- Verify the installation

**Your password is only used temporarily during installation and is never saved.**

---

### Option 2: Manual Installation (Safest)

If you prefer to install manually (no password needed in scripts):

1. **Download Docker Desktop:**
   ```bash
   # Open download page
   open "https://www.docker.com/products/docker-desktop"
   ```

2. **Install:**
   - Open the downloaded `.dmg`
   - Drag to Applications
   - Open Docker Desktop
   - Enter password when prompted (one-time setup)

---

### Option 3: Homebrew with Interactive Password

If you want to use Homebrew directly:

```bash
brew install --cask docker
# You'll be prompted for password interactively
# Password is NOT stored

# After installation
open -a Docker
```

---

## Why We Don't Store Passwords

1. **Security Risk**: Passwords in files can be:
   - Accidentally committed to git
   - Read by other processes
   - Exposed in logs
   - Accessed by anyone with file permissions

2. **Best Practice**: Passwords should:
   - Only exist in memory during use
   - Be entered interactively
   - Never be stored in plain text

3. **Compliance**: Many security standards prohibit storing passwords in files

---

## After Installation

Once Docker Desktop is installed and running:

```bash
# Verify installation
./scripts/check-docker.sh

# Start LOS infrastructure
cd infra
docker compose up -d

# Check status
docker compose ps
```

---

## Alternative: Non-Sudo Installation

If you want to avoid password prompts entirely, you can:

1. Install Docker Desktop manually (download DMG)
2. Use Docker without sudo (Docker Desktop handles this)

---

**Recommended**: Use `./scripts/install-docker-with-password.sh` - it's secure and will prompt you interactively for your password only when needed.

