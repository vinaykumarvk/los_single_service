# Port 3000 vs Port 3001 - Key Differences

## Port 3000: Monolith Service (Consolidated)

### Purpose
A **consolidated monolithic service** that combines multiple microservices into a single deployable unit for simplified deployment and easier management.

### What It Includes
The monolith consolidates these services:
- ✅ **Application Service** - Loan application management
- ✅ **Auth Service** - Authentication and user management  
- ✅ **Customer KYC Service** - Customer data and KYC workflows
- ✅ **Document Service** - Document upload and management
- ✅ **Masters Service** - Product catalog and master data

### Use Case
- **Simplified deployment** - One service instead of many
- **Easier local development** - Start one service instead of multiple
- **Production deployment** - Single container/service to manage
- **API Gateway** - The frontend (port 5173) proxies to this by default

### Endpoints Available
All endpoints are available at `http://localhost:3000`:
- `/api/auth/*` - Authentication endpoints
- `/api/applications/*` - Application management
- `/api/applicants/*` - Applicant/KYC data
- `/api/documents/*` - Document management
- `/api/masters/*` - Product and master data
- `/api/dashboard/*` - Dashboard endpoints
- `/health` - Health check
- `/metrics` - Prometheus metrics

---

## Port 3001: Application Service (Standalone Microservice)

### Purpose
A **standalone microservice** focused specifically on loan application management. Part of a microservices architecture where each service has a specific responsibility.

### What It Includes
- ✅ **Application Management** - Create, read, update applications
- ✅ **RM Dashboards** - Relationship Manager dashboards
- ✅ **Hierarchical Dashboards** - SRM and Regional Head dashboards
- ✅ **Property Endpoints** - Property-related functionality
- ✅ **Document Management** - Document upload/management for applications
- ✅ **Authentication** - User login/refresh tokens

### Use Case
- **Microservices architecture** - When you want separate services
- **Independent scaling** - Scale application service separately
- **Service isolation** - Each service can be deployed independently
- **Development** - Work on application service in isolation

### Endpoints Available
All endpoints are available at `http://localhost:3001`:
- `/api/applications/*` - Application management
- `/api/applicants/*` - Applicant data
- `/api/auth/*` - Authentication
- `/api/documents/*` - Document management
- `/api/dashboard/*` - Dashboard endpoints
- `/health` - Health check
- `/metrics` - Prometheus metrics

---

## Key Differences Summary

| Aspect | Port 3000 (Monolith) | Port 3001 (Application Service) |
|--------|---------------------|--------------------------------|
| **Architecture** | Monolithic (all-in-one) | Microservice (focused) |
| **Services Included** | Application + Auth + KYC + Document + Masters | Application only |
| **Deployment** | Single service | Part of service mesh |
| **Complexity** | Simpler (one service) | More complex (multiple services) |
| **Scaling** | Scale entire monolith | Scale individual service |
| **Default Frontend Target** | ✅ Yes (port 5173 proxies here) | ❌ No (standalone) |
| **Use When** | Development, simple deployments | Production microservices, independent scaling |

---

## Which One Should You Use?

### Use Port 3000 (Monolith) When:
- ✅ **Local development** - Easier to start and manage
- ✅ **Simple deployments** - One service to deploy
- ✅ **Frontend development** - Frontend is configured to use this by default
- ✅ **Quick setup** - Get everything running quickly

### Use Port 3001 (Application Service) When:
- ✅ **Microservices architecture** - You want separate services
- ✅ **Independent scaling** - Need to scale application service separately
- ✅ **Service isolation** - Working on application service features only
- ✅ **Production microservices** - Full microservices deployment

---

## Current Setup

In your current setup:
- **Port 3000 (Monolith)**: Running and serving as the main API
- **Port 3001 (Application Service)**: Running but not used by frontend
- **Port 5173 (Frontend)**: Configured to proxy to port 3000

The frontend (Vite) is configured in `web/vite.config.ts` to proxy `/api` requests to `http://localhost:3000`, so it uses the **Monolith service** by default.

---

## Recommendation

For most use cases, **use Port 3000 (Monolith)** because:
1. It's what the frontend is configured to use
2. Simpler to manage (one service)
3. Includes all functionality you need
4. Easier for local development

Port 3001 is useful if you're specifically working on the application service in isolation or deploying a full microservices architecture.




