# Endpoint Comparison: Monolith (3000) vs Application Service (3001)

## ✅ Confirmation: Monolith Includes ALL Application Service Features

After comparing both services, **YES - the Monolith service (port 3000) includes ALL features available in the Application service (port 3001)**.

## Endpoint Comparison

### Authentication Endpoints
Both services have:
- ✅ `POST /api/auth/login` - User login
- ✅ `POST /api/auth/refresh` - Refresh access token

### Applicant/KYC Endpoints
Both services have:
- ✅ `GET /api/applicants/:id` - Get applicant details
- ✅ `PUT /api/applicants/:id` - Update applicant data

### Application Endpoints
Both services have:
- ✅ `POST /api/applications` - Create application
- ✅ `GET /api/applications` - List applications (with filters & pagination)
- ✅ `GET /api/applications/:id` - Get application details
- ✅ `PUT /api/applications/:id` - Update application
- ✅ `POST /api/applications/:id/submit` - Submit application
- ✅ `GET /api/applications/:id/applicant` - Get applicant data for application
- ✅ `PUT /api/applications/:id/applicant` - Update applicant via application ID
- ✅ `GET /api/applications/:id/completeness` - Get application completeness percentage
- ✅ `GET /api/applications/:id/events` - SSE stream for real-time updates

### Document Endpoints
Both services have:
- ✅ `POST /api/applications/:id/documents` - Upload document
- ✅ `GET /api/applications/:id/documents` - List documents
- ✅ `GET /api/applications/:id/documents/checklist` - Get document checklist
- ✅ `GET /api/applications/:id/checklist` - Legacy checklist endpoint
- ✅ `PATCH /api/documents/:docId/verify` - Verify document
- ✅ `GET /api/documents/:docId/download` - Get presigned download URL

### Dashboard Endpoints
Both services have:
- ✅ `GET /api/applications/rm/dashboard` - RM dashboard (from setupRMDashboardEndpoint)
- ✅ `GET /api/dashboard/rm/:userId` - RM's own dashboard (from setupHierarchicalDashboards)
- ✅ `GET /api/dashboard/srm/:srmId` - SRM's aggregated dashboard (from setupHierarchicalDashboards)
- ✅ `GET /api/dashboard/regional-head/:headId` - Regional Head's dashboard (from setupHierarchicalDashboards)

### Property Endpoints
Both services have:
- ✅ Property-related endpoints (from setupPropertyEndpoints)

### Health & Metrics
Both services have:
- ✅ `GET /health` - Health check
- ✅ `GET /metrics` - Prometheus metrics

## Additional Features in Monolith (Port 3000)

The Monolith service has **EXTRA** features that the Application service doesn't have:

### Masters Service Endpoints (Only in Monolith)
- ✅ `GET /api/masters/products` - List all products
- ✅ `GET /api/masters/products/:productCode` - Get product details
- ✅ `GET /api/masters/calendar/is-business-day` - Check if date is business day
- ✅ `GET /api/masters/calendar/holidays` - List holidays
- ✅ `POST /api/masters/calendar/holidays` - Create holiday

### Frontend Serving (Only in Monolith)
- ✅ `GET /` - Serves frontend static files (if available)
- ✅ Static file serving from `web-dist` directory

## Summary

| Feature Category | Application Service (3001) | Monolith (3000) | Status |
|-----------------|---------------------------|-----------------|--------|
| Authentication | ✅ | ✅ | **Same** |
| Applicants/KYC | ✅ | ✅ | **Same** |
| Applications | ✅ | ✅ | **Same** |
| Documents | ✅ | ✅ | **Same** |
| Dashboards | ✅ | ✅ | **Same** |
| Property | ✅ | ✅ | **Same** |
| Masters | ❌ | ✅ | **Monolith has more** |
| Frontend Serving | ❌ | ✅ | **Monolith has more** |

## Conclusion

✅ **YES - The Monolith service (port 3000) includes ALL features from the Application service (port 3001)**

**Plus**, the Monolith has additional features:
- Masters Service endpoints (products, calendar)
- Frontend static file serving

**Therefore, you can safely use port 3000 (Monolith) instead of port 3001 (Application Service) and you won't lose any functionality. In fact, you'll gain additional features!**

## Recommendation

Use **Port 3000 (Monolith)** because:
1. ✅ Has everything from Application Service
2. ✅ Has additional Masters Service features
3. ✅ Can serve frontend files
4. ✅ Frontend is already configured to use it
5. ✅ Simpler deployment (one service)

Port 3001 is redundant if you're using the Monolith.




