# Frontend + Backend Combined Deployment

## Summary
The frontend and backend are now **combined into a single deployment package**. This simplifies deployment significantly and eliminates many configuration issues.

## Benefits

### 1. **Single Deployment**
- One Docker image contains both frontend and backend
- One service to deploy instead of two
- No need to coordinate frontend and backend deployments

### 2. **No CORS Issues**
- Frontend and backend served from same origin
- No CORS configuration needed
- Simpler authentication flow

### 3. **Simplified Configuration**
- No need for separate frontend environment variables
- No proxy configuration needed
- Single port (3000) for everything

### 4. **Better Performance**
- No network hop between frontend and backend
- Static files served directly by Express
- Faster API calls (same origin)

### 5. **Easier Development**
- Single container to run
- No need to manage two separate services
- Consistent environment

## How It Works

### Architecture
```
┌─────────────────────────────────┐
│   Single Docker Container       │
│                                 │
│  ┌──────────────────────────┐   │
│  │   Express Server (3000)  │   │
│  │                           │   │
│  │  ┌────────────────────┐  │   │
│  │  │  API Routes        │  │   │
│  │  │  /api/*            │  │   │
│  │  └────────────────────┘  │   │
│  │                           │   │
│  │  ┌────────────────────┐  │   │
│  │  │  Static Files      │  │   │
│  │  │  / (React App)     │  │   │
│  │  │  /assets/*         │  │   │
│  │  └────────────────────┘  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Request Flow
1. **API Requests** (`/api/*`) → Handled by Express API routes
2. **Static Files** (`/assets/*`, `/favicon.ico`, etc.) → Served from `web-dist`
3. **SPA Routes** (`/`, `/rm`, `/admin`, etc.) → Served `index.html` (React Router handles routing)

### Build Process
1. Build shared libraries
2. Build monolith backend
3. Build frontend React app
4. Copy all built files to production image
5. Express serves both API and static files

## Changes Made

### 1. Dockerfiles Updated
- **`services/monolith/Dockerfile`**: Now builds frontend + backend
- **`Dockerfile`** (root): Now builds frontend + backend

### 2. Server Configuration
- Express already configured to serve static files from `web-dist`
- Catch-all route serves `index.html` for SPA routing
- API routes take precedence over static files

## Deployment

### Local Development
```bash
# Build and run combined container
docker-compose -f infra/docker-compose.monolith.yml up --build
```

### Production
```bash
# Build combined image
docker build -f services/monolith/Dockerfile -t los-monolith:latest .

# Run combined container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  los-monolith:latest
```

### GCP Cloud Run
The existing Cloud Build configuration will automatically build and deploy the combined frontend+backend package.

## Environment Variables

### Backend Variables (Required)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh secret

### Frontend Variables (Optional)
- `VITE_API_GATEWAY` - Not needed (same origin)
- `VITE_AUTH_SERVICE_URL` - Not needed (same origin)

The frontend will automatically use relative URLs (`/api/*`) since it's served from the same origin.

## Testing

### Verify Frontend is Served
```bash
curl http://localhost:3000/
# Should return HTML (not JSON)
```

### Verify API Works
```bash
curl http://localhost:3000/api/health
# Should return: OK
```

### Verify Static Assets
```bash
curl http://localhost:3000/assets/index-*.js
# Should return JavaScript bundle
```

## Migration Notes

### If You Previously Deployed Separately

1. **Remove separate frontend deployment**
   - No need for separate frontend container
   - No need for Nginx/separate web server

2. **Update environment variables**
   - Remove `VITE_API_GATEWAY` (not needed)
   - Frontend uses relative URLs automatically

3. **Update DNS/load balancer**
   - Point to single service (port 3000)
   - No need for separate frontend URL

## Troubleshooting

### Frontend Not Loading
- Check that `web-dist` directory exists in container
- Verify build step completed successfully
- Check server logs for static file serving errors

### API Routes Not Working
- Ensure API routes are defined before static file middleware
- Check that `/api/*` routes are working

### 404 on Refresh
- This is normal for SPA - catch-all route should serve `index.html`
- Verify catch-all route is last in Express route definitions
