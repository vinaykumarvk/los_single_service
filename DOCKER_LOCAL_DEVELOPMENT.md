# Docker-Based Local Development

## Why Use Docker for Local Development?

Using Docker for local development provides **production parity** - your local environment matches production exactly. This helps identify issues early before they reach production.

### Benefits

1. **Catch Production Issues Early**
   - Same Node.js version
   - Same file paths and structure
   - Same environment variables
   - Same build process
   - Same static file serving

2. **Consistent Environment**
   - Works the same on all machines
   - No "works on my machine" issues
   - Same dependencies and versions

3. **Easier Onboarding**
   - New developers can start with one command
   - No need to install Node.js, PostgreSQL, etc.
   - Everything is containerized

4. **Test Production Build**
   - Test the actual production build locally
   - Verify static file serving works
   - Check API routing in production mode

## Quick Start

### Start Everything (Infrastructure + Monolith)
```bash
# Start all services (postgres, redpanda, minio, keycloak, monolith)
docker-compose -f infra/docker-compose.monolith.yml up --build

# Access the app at http://localhost:3000
```

### Start Only Infrastructure
```bash
# Start only infrastructure services
docker-compose -f infra/docker-compose.monolith.yml up postgres redpanda minio keycloak

# Then run monolith locally for development
cd services/monolith
pnpm dev
```

## Development Workflow

### Option 1: Full Docker (Production-Like)
```bash
# Build and run everything in Docker
docker-compose -f infra/docker-compose.monolith.yml up --build

# Make code changes
# Rebuild to see changes
docker-compose -f infra/docker-compose.monolith.yml up --build
```

**Pros:**
- Matches production exactly
- Catches production issues early
- No local Node.js needed

**Cons:**
- Slower iteration (need to rebuild)
- No hot reload

### Option 2: Hybrid (Infrastructure in Docker, Code Local)
```bash
# Start infrastructure in Docker
docker-compose -f infra/docker-compose.monolith.yml up postgres redpanda minio keycloak

# Run monolith locally with hot reload
cd services/monolith
DATABASE_URL="postgres://los:los@localhost:5432/los" pnpm dev

# Run frontend locally with hot reload
cd web
pnpm dev
```

**Pros:**
- Fast iteration with hot reload
- Still uses Docker for infrastructure
- Good for active development

**Cons:**
- Doesn't test production build
- May miss production-specific issues

### Option 3: Test Production Build Periodically
```bash
# During development, use Option 2
# Before committing, test production build:

# Build production image
docker build -f services/monolith/Dockerfile -t los-monolith:test .

# Run production build
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://los:los@host.docker.internal:5432/los" \
  --network host \
  los-monolith:test

# Test at http://localhost:3000
```

## Dev vs Production Consistency

### Frontend API Configuration

The frontend automatically uses:
- **Production (Docker)**: Relative URLs (`/api/*`) - same origin
- **Development (Vite)**: Proxy to `http://localhost:3000` or explicit URLs

This is handled in `web/src/shared/lib/config.ts`:
```typescript
baseURL: isProduction ? '' : 'http://localhost:3000'
// Empty string = relative URL (same origin in production)
```

### Environment Variables

| Variable | Dev (Vite) | Production (Docker) |
|----------|-----------|---------------------|
| `VITE_API_GATEWAY` | Optional (uses proxy) | Not needed (same origin) |
| `DATABASE_URL` | `postgres://los:los@localhost:5432/los` | `postgres://los:los@postgres:5432/los` |
| `NODE_ENV` | `development` | `production` |

### Static File Serving

- **Dev**: Vite dev server serves files with HMR
- **Production**: Express serves static files from `web-dist`
- **Docker**: Same as production - Express serves static files

## Troubleshooting

### Frontend Not Loading in Docker
```bash
# Check if web-dist exists in container
docker exec los-monolith ls -la /app/services/web-dist

# Check server logs
docker logs los-monolith
```

### API Calls Failing
```bash
# Check if API routes are working
curl http://localhost:3000/api/health

# Check CORS (shouldn't be needed in production)
curl -H "Origin: http://localhost:3000" http://localhost:3000/api/health
```

### Database Connection Issues
```bash
# Check if postgres is running
docker ps | grep postgres

# Check connection from monolith
docker exec los-monolith ping postgres
```

## Best Practices

1. **Use Docker for Final Testing**
   - Before committing, test with Docker
   - Ensures production build works

2. **Use Hybrid for Active Development**
   - Infrastructure in Docker
   - Code runs locally with hot reload
   - Faster iteration

3. **Test Production Build Regularly**
   - At least once per feature
   - Before major releases
   - When changing build configuration

4. **Keep Docker Compose Updated**
   - Match production environment
   - Same versions, same config

## Comparison: Dev vs Production

| Aspect | Development (Vite) | Production (Docker) |
|--------|-------------------|---------------------|
| **Frontend** | Vite dev server (port 5173) | Express static files |
| **Backend** | Node.js directly (port 3000) | Node.js in container |
| **API Calls** | Via Vite proxy | Direct (same origin) |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Build** | On-the-fly | Pre-built |
| **Environment** | Local machine | Docker container |
| **File Paths** | Local paths | Container paths |

## Migration Checklist

When moving from dev to production:

- [ ] Test with Docker locally first
- [ ] Verify static files are served correctly
- [ ] Check API routes work (no CORS issues)
- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Check file uploads/downloads
- [ ] Verify database connections
- [ ] Test all personas (RM, Admin, Operations)
