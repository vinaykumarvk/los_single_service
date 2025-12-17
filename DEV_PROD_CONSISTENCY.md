# Development vs Production Consistency

## Summary

The application now works **the same way in development and production** when using Docker for local development. This ensures issues are caught early and deployment is predictable.

## Key Changes for Consistency

### 1. Frontend API Configuration

**Updated:** `web/src/shared/lib/config.ts`

```typescript
// Automatically detects production mode
const isProduction = import.meta.env.PROD;
baseURL: isProduction ? '' : 'http://localhost:3000'
// Empty string = relative URL (same origin in production)
```

**How it works:**
- **Development (Vite)**: Uses `http://localhost:3000` or Vite proxy
- **Production (Docker)**: Uses relative URLs (`/api/*`) - same origin, no CORS needed

### 2. Combined Frontend + Backend

**Both Dockerfiles now:**
- Build frontend React app
- Build backend monolith
- Serve both from single Express server
- Same structure in dev and production

### 3. Docker for Local Development

**Benefits:**
- ✅ Same Node.js version
- ✅ Same file paths
- ✅ Same build process
- ✅ Same static file serving
- ✅ Catches production issues early

## Dev vs Production Comparison

| Aspect | Development (Vite) | Production (Docker) | Status |
|--------|-------------------|---------------------|--------|
| **Frontend Serving** | Vite dev server | Express static files | ✅ Different (expected) |
| **API URLs** | `http://localhost:3000/api/*` | `/api/*` (relative) | ✅ Consistent behavior |
| **CORS** | Needed (different ports) | Not needed (same origin) | ✅ Handled automatically |
| **Build Process** | On-the-fly | Pre-built | ✅ Same Dockerfile |
| **Environment** | Local machine | Docker container | ✅ Can match with Docker |
| **File Paths** | Local paths | Container paths | ✅ Same in Docker |

## Ensuring Consistency

### Use Docker for Local Testing

```bash
# Test production build locally
docker-compose -f infra/docker-compose.monolith.yml up --build

# This matches production exactly:
# - Same build process
# - Same file structure
# - Same static file serving
# - Same API routing
```

### Development Workflow

1. **Active Development**: Use Vite dev server (fast iteration)
2. **Before Committing**: Test with Docker (catch production issues)
3. **Before Deploying**: Full Docker test (final verification)

## Potential Issues Caught by Docker

### 1. File Path Issues
- ✅ Wrong paths in production
- ✅ Missing files in build
- ✅ Incorrect static file serving

### 2. Environment Variable Issues
- ✅ Missing required variables
- ✅ Wrong variable names
- ✅ Incorrect defaults

### 3. Build Process Issues
- ✅ Build failures
- ✅ Missing dependencies
- ✅ TypeScript errors

### 4. API Routing Issues
- ✅ CORS problems
- ✅ Wrong API URLs
- ✅ Authentication flow

### 5. Static File Issues
- ✅ Missing assets
- ✅ Wrong base paths
- ✅ 404 errors on refresh

## Testing Checklist

Before deploying to production, test with Docker:

- [ ] Frontend loads correctly
- [ ] API calls work (no CORS errors)
- [ ] Authentication works
- [ ] Static assets load (images, CSS, JS)
- [ ] SPA routing works (no 404 on refresh)
- [ ] File uploads/downloads work
- [ ] Database connections work
- [ ] All personas work (RM, Admin, Operations)

## Quick Test Commands

```bash
# Test frontend
curl http://localhost:3000/ | head -20

# Test API
curl http://localhost:3000/api/health

# Test static assets
curl http://localhost:3000/assets/index-*.js | head -5

# Check container logs
docker logs los-monolith
```

## Conclusion

By using Docker for local development, you get:
- ✅ Production parity
- ✅ Early issue detection
- ✅ Consistent environment
- ✅ Predictable deployments

The frontend automatically adapts to production mode, using relative URLs when served from the same origin, eliminating CORS issues and ensuring consistent behavior.
