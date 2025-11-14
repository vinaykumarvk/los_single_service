# Deployment Guide for LOS Application

## Overview

This guide covers deployment strategies for the Loan Origination System, with special focus on the RM frontend module which can be deployed independently.

## Architecture Models

### Model 1: Full Stack Deployment
Deploy the entire LOS application (backend + all frontend personas)

### Model 2: RM Frontend Only (Over Third-Party LOS)
Deploy only the RM frontend to work with an existing LOS backend via API

## Prerequisites

- Node.js 20+ and pnpm 9+
- PostgreSQL 14+
- Docker & Docker Compose (optional, for infrastructure)
- Nginx or similar (for production frontend serving)

## Deployment Options

### Option A: Full Stack (Our LOS Backend + Frontend)

#### 1. Backend Deployment

```bash
# Build all services
pnpm -w run build

# Or build individually
cd gateway && pnpm build
cd services/application && pnpm build
# ... repeat for all services

# Set environment variables
export DATABASE_URL=postgres://user:pass@db-host:5432/los
export JWT_SECRET=your-secret-key
export REDIS_URL=redis://redis-host:6379
# ... other env vars

# Run migrations
# (Connect to DB and run migrations from each service)

# Sanity-check required microservices
./scripts/verify-service-artifacts.sh
```

#### 2. Frontend Deployment (All Personas)

```bash
cd web

# Build all personas
pnpm build

# Or build specific persona
VITE_PERSONA=rm pnpm build
VITE_PERSONA=admin pnpm build
VITE_PERSONA=operations pnpm build

# Output will be in dist/ directory
```

#### 3. Serve with Nginx

```nginx
server {
    listen 80;
    server_name los.example.com;

    # RM Frontend
    location /rm {
        alias /path/to/dist/rm;
        try_files $uri $uri/ /rm/index.html;
    }

    # Admin Frontend
    location /admin {
        alias /path/to/dist/admin;
        try_files $uri $uri/ /admin/index.html;
    }

    # Operations Frontend
    location /operations {
        alias /path/to/dist/operations;
        try_files $uri $uri/ /operations/index.html;
    }

    # Full App (all personas)
    location / {
        alias /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Gateway Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: RM Frontend Only (Third-Party LOS)

#### 1. Build RM Frontend

```bash
cd web
VITE_PERSONA=rm pnpm build
```

#### 2. Configure for Third-Party LOS

Create a configuration file `config.js`:

```javascript
// config.js - Runtime configuration for third-party LOS
window.__LOS_CONFIG__ = {
  api: {
    baseURL: 'https://third-party-los.example.com/api', // Your third-party LOS API
  },
  auth: {
    provider: 'jwt', // or 'oauth2', 'keycloak'
    jwt: {
      loginEndpoint: 'https://third-party-los.example.com/api/auth/login',
      refreshEndpoint: 'https://third-party-los.example.com/api/auth/refresh',
    },
  },
  persona: {
    persona: 'rm',
    allowedRoles: ['rm', 'sales_exec'],
  },
};
```

#### 3. Inject Configuration in HTML

Modify `index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Inject config before React loads -->
    <script src="/config.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/rm/main.tsx"></script>
  </body>
</html>
```

#### 4. Serve RM Frontend

```nginx
server {
    listen 80;
    server_name rm-app.example.com;

    root /path/to/dist/rm;
    index index.html;

    # All routes handled by React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Serve config
    location /config.js {
        add_header Content-Type application/javascript;
    }
}
```

## Environment Variables

### Backend Services

Create `.env` files in each service directory or use centralized config:

```bash
# services/.env
DATABASE_URL=postgres://user:pass@host:5432/los
JWT_SECRET=your-secret-key
REDIS_URL=redis://host:6379

# Integration API Keys (optional - will use fallback if missing)
NSDL_PAN_API_KEY=your-key
CIBIL_API_KEY=your-key
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
```

### Frontend

Create `web/.env.production`:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.los.example.com/api
VITE_API_GATEWAY=https://gateway.los.example.com

# Auth Configuration
VITE_AUTH_PROVIDER=jwt
VITE_KEYCLOAK_ISSUER_URL=https://auth.example.com/realms/los
VITE_KEYCLOAK_CLIENT_ID=los-ui

# Persona (for build-time persona selection)
VITE_PERSONA=rm
```

## Docker Deployment

### Dockerfile for Backend Services

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Dockerfile for Frontend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN VITE_PERSONA=rm pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist/rm /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: los
      POSTGRES_USER: los
      POSTGRES_PASSWORD: los
    ports:
      - "5432:5432"

  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://los:los@postgres:5432/los
    depends_on:
      - postgres

  rm-frontend:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        VITE_PERSONA: rm
    ports:
      - "80:80"
```

## API Contract Compliance

The RM frontend expects the following API endpoints:

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Applications
- `GET /api/applications` - List applications (with filters)
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id/applicant` - Update applicant info
- `POST /api/applications/:id/submit-for-verification` - Submit application

### Documents
- `GET /api/applications/:id/documents` - List documents
- `POST /api/applications/:id/documents` - Upload document
- `GET /api/applications/:id/documents/checklist` - Get document checklist

### Integrations
- `POST /api/integrations/pan/validate` - Validate PAN
- `POST /api/integrations/ekyc/start` - Start Aadhaar eKYC
- `POST /api/integrations/ekyc/submit-otp` - Submit Aadhaar OTP
- `POST /api/integrations/bank/verify` - Verify bank account
- `POST /api/integrations/bureau/pull` - Pull CIBIL report

See `RM_API_CONTRACT.md` for complete API specification.

## Security Considerations

1. **CORS**: Configure backend to allow frontend origin
2. **HTTPS**: Always use HTTPS in production
3. **Tokens**: Store tokens securely (httpOnly cookies preferred over localStorage)
4. **API Keys**: Never expose API keys in frontend code
5. **Environment Variables**: Use secure secret management

## Monitoring & Logging

- Set up application monitoring (e.g., Datadog, New Relic)
- Configure error tracking (e.g., Sentry)
- Enable access logs
- Monitor API response times

## Rollback Strategy

1. Keep previous build artifacts
2. Use feature flags for gradual rollouts
3. Database migrations should be reversible
4. Test rollback procedures

## Post-Deployment Verification

1. Health check endpoints respond
2. Frontend loads correctly
3. Login functionality works
4. API calls succeed
5. Integration fallbacks work when API keys are missing

## Troubleshooting

### Frontend can't connect to backend
- Check CORS configuration
- Verify API base URL
- Check network connectivity

### Authentication fails
- Verify auth provider configuration
- Check token endpoints
- Validate JWT secret

### Integration calls fail
- Check API keys are set (or fallback is enabled)
- Verify integration service endpoints
- Check firewall rules
