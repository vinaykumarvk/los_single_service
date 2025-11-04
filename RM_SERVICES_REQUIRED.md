# Services Required for Relationship Managers (RM)

Based on the **Svatantra - Mobile App.pdf** requirements and current RM frontend API usage.

## Core Services (Essential for RM Functionality)

### 1. **Gateway Service** (Port 3000)
- **Purpose**: API Gateway / BFF (Backend for Frontend)
- **Required For**: 
  - All API routing
  - Authentication middleware
  - Request/response transformation
- **Status**: ✅ **CRITICAL - Must be running first**

### 2. **Auth Service** (Port 3016)
- **Purpose**: Authentication and user management
- **Required For**:
  - Login (`POST /api/auth/login`)
  - Token refresh (`POST /api/auth/refresh`)
  - User authentication
- **API Endpoints Used**:
  - `/api/auth/login`
  - `/api/auth/refresh`
- **Status**: ✅ **CRITICAL - Required for login**

### 3. **Application Service** (Port 3001)
- **Purpose**: Loan application lifecycle management
- **Required For**:
  - Create applications (`POST /api/applications`)
  - View applications list (`GET /api/applications`)
  - Get application details (`GET /api/applications/:id`)
  - Update applications (`PUT /api/applications/:id`)
  - Submit applications (`POST /api/applications/:id/submit`)
  - RM Dashboard (`GET /api/applications/rm/dashboard`)
  - Application completeness check
  - Application timeline
- **API Endpoints Used**:
  - `/api/applications` (all CRUD operations)
  - `/api/applications/rm/dashboard`
  - `/api/applications/:id/completeness`
  - `/api/applications/:id/timeline`
- **Status**: ✅ **CRITICAL - Core RM functionality**

### 4. **Customer KYC Service** (Port 3003)
- **Purpose**: Customer/Applicant data management
- **Required For**:
  - Create/update applicant records (`PUT /api/applicants/:id`)
  - Get applicant details (`GET /api/applications/:id/applicant`)
  - Personal information capture
  - Employment details
  - Bank verification data
- **API Endpoints Used**:
  - `/api/applicants/:id` (PUT)
  - `/api/applications/:id/applicant` (GET/PUT)
- **Status**: ✅ **CRITICAL - Required for customer data**

### 5. **Masters Service** (Port 3005)
- **Purpose**: Reference data (products, branches, documents, etc.)
- **Required For**:
  - Loan products list (`GET /api/masters/products`)
  - Branches list (`GET /api/masters/branches`)
  - Document types (`GET /api/masters/documents`)
  - Cities and states (`GET /api/masters/cities-states`)
  - Roles (`GET /api/masters/roles`)
- **API Endpoints Used**:
  - `/api/masters/products`
  - `/api/masters/branches`
  - `/api/masters/documents`
  - `/api/masters/cities-states`
  - `/api/masters/roles`
- **Status**: ✅ **CRITICAL - Required for dropdowns and validation**

### 6. **Document Service** (Port 3004)
- **Purpose**: Document upload and management
- **Required For**:
  - Upload documents (`POST /api/applications/:id/documents`)
  - List documents (`GET /api/applications/:id/documents`)
  - Get document checklist (`GET /api/applications/:id/documents/checklist`)
  - Delete documents (`DELETE /api/documents/:id`)
- **API Endpoints Used**:
  - `/api/applications/:id/documents` (GET/POST)
  - `/api/applications/:id/documents/checklist`
  - `/api/documents/:id` (DELETE)
- **Status**: ✅ **CRITICAL - Required for document upload**

### 7. **Integration Hub Service** (Port 3020)
- **Purpose**: External integrations (PAN, Aadhaar, Bank, CIBIL)
- **Required For**:
  - PAN validation (`POST /api/integrations/pan/validate`)
  - Aadhaar eKYC (`POST /api/integrations/ekyc/start`)
  - Bank verification (`POST /api/integrations/bank/verify`)
  - CIBIL check (`POST /api/integrations/bureau/pull`)
- **API Endpoints Used**:
  - `/api/integrations/pan/validate`
  - `/api/integrations/ekyc/*`
  - `/api/integrations/bank/*`
  - `/api/integrations/bureau/*`
- **Status**: ⚠️ **OPTIONAL - For advanced features (can work without)**

## Services NOT Required for RM (Can be Deactivated)

### 8. **Underwriting Service** (Port 3006)
- **Status**: ❌ Not used by RM frontend
- **Reason**: RM only creates/submits applications, doesn't underwrite

### 9. **Sanction Offer Service** (Port 3007)
- **Status**: ❌ Not used by RM frontend
- **Reason**: RM doesn't create offers, only submits applications

### 10. **Payments Service** (Port 3008)
- **Status**: ❌ Not used by RM frontend
- **Reason**: RM doesn't process payments

### 11. **Disbursement Service** (Port 3009)
- **Status**: ❌ Not used by RM frontend
- **Reason**: RM doesn't handle disbursements

### 12. **Reporting Service** (Port 3015)
- **Status**: ❌ Not used by RM frontend
- **Reason**: RM has its own dashboard in Application Service

### 13. **Scoring Service** (Port 3018)
- **Status**: ❌ Not used by RM frontend
- **Reason**: Scoring happens in background, not initiated by RM

### 14. **Analytics Service** (Port 3019)
- **Status**: ❌ Not used by RM frontend
- **Reason**: Analytics is for admin/management, not RM

### 15. **Leads Service** (Port 3017)
- **Status**: ⚠️ **POTENTIALLY USED** - Check if RM captures leads
- **Reason**: May be needed if RM creates leads before applications

## Summary

### Minimum Services for RM (Core Functionality)
1. ✅ **Gateway** (3000) - API routing
2. ✅ **Auth** (3016) - Login/authentication
3. ✅ **Application** (3001) - Application management
4. ✅ **Customer KYC** (3003) - Customer data
5. ✅ **Masters** (3005) - Reference data
6. ✅ **Document** (3004) - Document upload

### Optional Services (For Full Feature Set)
7. ⚠️ **Integration Hub** (3020) - External integrations (PAN, Aadhaar, Bank, CIBIL)

### Total Services Needed: **6-7 services** (out of 15 total)

## Startup Order

1. **Gateway** (3000) - Must start first
2. **Auth** (3016) - Required for login
3. **Masters** (3005) - Required for dropdowns
4. **Customer KYC** (3003) - Required for applicant data
5. **Application** (3001) - Core functionality
6. **Document** (3004) - Document upload
7. **Integration Hub** (3020) - Optional, for advanced features

## Testing Strategy

Start with minimal services (6 services) and test:
1. ✅ Login flow
2. ✅ Dashboard loading
3. ✅ Create new application
4. ✅ Fill personal information
5. ✅ Upload documents
6. ✅ Submit application

Then add Integration Hub if needed for PAN/Aadhaar/Bank verification features.

