# RM Frontend - Required API Contract

This document defines the API contract that any LOS backend (ours or third-party) must implement for the RM frontend to function correctly.

## Base Requirements

- All endpoints should return JSON
- All endpoints require authentication (JWT Bearer token in Authorization header)
- Error responses should follow: `{ error: string, message?: string, details?: any }`
- All timestamps should be ISO 8601 format

---

## Authentication Endpoints

### `POST /api/auth/login`
Login with username/password.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "roles": ["rm", "applicant"]
  }
}
```

### `POST /api/auth/refresh`
Refresh access token.

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### `POST /api/auth/logout`
Logout and invalidate tokens.

**Response:** `200 OK`

---

## Application Endpoints

### `GET /api/applications`
List applications with filters.

**Query Parameters:**
- `status` (optional, array): Filter by status
- `assignedTo` (optional, string): Filter by assigned RM user ID
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `search` (optional, string): Search by name, mobile, or application ID

**Response:**
```json
{
  "data": [
    {
      "application_id": "uuid",
      "applicant_id": "uuid",
      "channel": "Branch",
      "product_code": "HOME_LOAN_V1",
      "requested_amount": 5000000,
      "requested_tenure_months": 240,
      "status": "Draft",
      "assigned_to": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### `POST /api/applications`
Create new application.

**Request:**
```json
{
  "productCode": "HOME_LOAN_V1",
  "requestedAmount": 5000000,
  "requestedTenureMonths": 240,
  "channel": "Branch"
}
```

**Response:**
```json
{
  "application_id": "uuid",
  "applicant_id": "uuid",
  "status": "Draft",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### `GET /api/applications/:id`
Get application details.

**Response:**
```json
{
  "application_id": "uuid",
  "applicant_id": "uuid",
  "channel": "Branch",
  "product_code": "HOME_LOAN_V1",
  "requested_amount": 5000000,
  "requested_tenure_months": 240,
  "status": "Draft",
  "assigned_to": "uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### `PUT /api/applications/:id`
Update application (only if status is Draft).

**Request:**
```json
{
  "productCode": "HOME_LOAN_V1",
  "requestedAmount": 6000000,
  "requestedTenureMonths": 300
}
```

### `POST /api/applications/:id/submit`
Submit application for processing.

**Response:**
```json
{
  "applicationId": "uuid",
  "status": "Submitted",
  "submitted": true
}
```

### `GET /api/applications/:id/completeness`
Check application completeness.

**Response:**
```json
{
  "completeness": 85,
  "sections": {
    "personalInfo": 100,
    "employment": 100,
    "loanDetails": 100,
    "propertyDetails": 0,
    "documents": 80,
    "bankVerification": 0,
    "cibilCheck": 100
  },
  "missingFields": ["propertyDetails", "bankVerification"]
}
```

### `GET /api/applications/:id/timeline`
Get application status timeline.

**Response:**
```json
{
  "events": [
    {
      "eventType": "ApplicationCreated",
      "status": "Draft",
      "occurredAt": "2024-01-01T00:00:00Z",
      "actorId": "uuid"
    },
    {
      "eventType": "ApplicationSubmitted",
      "status": "Submitted",
      "occurredAt": "2024-01-02T00:00:00Z",
      "actorId": "uuid"
    }
  ]
}
```

### `PATCH /api/applications/:id/assign`
Assign application to RM.

**Request:**
```json
{
  "assignedTo": "uuid"
}
```

### `GET /api/applications/rm/dashboard`
Get RM dashboard statistics.

**Response:**
```json
{
  "stats": {
    "total": 100,
    "draft": 20,
    "submitted": 50,
    "inProgress": 30
  },
  "recentApplications": [
    {
      "application_id": "uuid",
      "applicant_name": "John Doe",
      "status": "Submitted",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Applicant Endpoints

### `PUT /api/applications/:id/applicant`
Update applicant information.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "maritalStatus": "Married",
  "mobile": "9876543210",
  "email": "john@example.com",
  "pan": "ABCDE1234F",
  "addressLine1": "123 Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "employmentType": "Salaried",
  "monthlyIncome": 50000,
  "employerName": "ABC Corp",
  "otherIncomeSources": "Rental income",
  "yearsInJob": 5
}
```

### `GET /api/applications/:id/applicant`
Get applicant information.

**Response:**
```json
{
  "applicant_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-01",
  "gender": "Male",
  "marital_status": "Married",
  "mobile": "9876543210",
  "email": "john@example.com",
  "pan": "ABCDE1234F",
  "address_line1": "123 Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "employment_type": "Salaried",
  "monthly_income": 50000,
  "employer_name": "ABC Corp"
}
```

---

## Property Details Endpoints

### `POST /api/applications/:id/property`
Create or update property details.

**Request:**
```json
{
  "propertyType": "Flat",
  "builderName": "ABC Builders",
  "projectName": "ABC Heights",
  "propertyValue": 10000000,
  "propertyAddress": "123 Property Street",
  "propertyPincode": "400001",
  "propertyCity": "Mumbai",
  "propertyState": "Maharashtra"
}
```

### `GET /api/applications/:id/property`
Get property details.

**Response:**
```json
{
  "property_id": "uuid",
  "application_id": "uuid",
  "property_type": "Flat",
  "builder_name": "ABC Builders",
  "project_name": "ABC Heights",
  "property_value": 10000000,
  "property_address": "123 Property Street",
  "property_city": "Mumbai",
  "property_state": "Maharashtra"
}
```

---

## Document Endpoints

### `GET /api/applications/:id/documents`
List documents for an application.

**Response:**
```json
{
  "documents": [
    {
      "document_id": "uuid",
      "application_id": "uuid",
      "document_code": "PAN_CARD",
      "document_name": "PAN Card",
      "file_url": "https://...",
      "verification_status": "Verified",
      "uploaded_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/applications/:id/documents`
Upload a document.

**Request:** Multipart form data
- `file`: File
- `documentCode`: string

**Response:**
```json
{
  "document_id": "uuid",
  "file_url": "https://...",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

### `DELETE /api/documents/:id`
Delete a document.

**Response:** `200 OK`

### `GET /api/applications/:id/documents/checklist`
Get document checklist for application.

**Response:**
```json
{
  "checklist": [
    {
      "document_code": "PAN_CARD",
      "document_name": "PAN Card",
      "is_mandatory": true,
      "uploaded": true,
      "verified": true
    },
    {
      "document_code": "AADHAAR",
      "document_name": "Aadhaar Card",
      "is_mandatory": true,
      "uploaded": true,
      "verified": false
    }
  ],
  "completion": 80
}
```

---

## Integration Endpoints

### `POST /api/integrations/pan/validate`
Validate PAN number.

**Request:**
```json
{
  "pan": "ABCDE1234F",
  "applicantName": "John Doe"
}
```

**Response:**
```json
{
  "valid": true,
  "holderName": "JOHN DOE",
  "status": "Active"
}
```

### `POST /api/integrations/ekyc/start`
Start Aadhaar eKYC verification.

**Request:**
```json
{
  "applicationId": "uuid",
  "applicantId": "uuid",
  "aadhaar": "encrypted_aadhaar",
  "mobile": "9876543210",
  "consent": true,
  "purpose": "KYC"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "otpSent": true,
  "expiresAt": "2024-01-01T00:05:00Z"
}
```

### `POST /api/integrations/ekyc/:sessionId/submit-otp`
Submit OTP for eKYC verification.

**Request:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "verified": true,
  "kycData": {
    "name": "John Doe",
    "dob": "1990-01-01",
    "address": "..."
  }
}
```

### `GET /api/integrations/ekyc/:sessionId/status`
Get eKYC verification status.

**Response:**
```json
{
  "status": "Verified",
  "verifiedAt": "2024-01-01T00:05:00Z"
}
```

### `POST /api/integrations/bank/verify-name`
Verify bank account name.

**Request:**
```json
{
  "accountNumber": "1234567890",
  "ifsc": "ABCD0123456",
  "accountHolderName": "John Doe"
}
```

**Response:**
```json
{
  "verified": true,
  "accountName": "JOHN DOE",
  "matched": true
}
```

### `POST /api/integrations/bank/penny-drop`
Initiate penny drop verification.

**Request:**
```json
{
  "accountNumber": "1234567890",
  "ifsc": "ABCD0123456",
  "amount": 1
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "status": "Initiated",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### `GET /api/integrations/bank/penny-drop/:requestId/status`
Get penny drop status.

**Response:**
```json
{
  "status": "Completed",
  "verified": true,
  "verifiedAt": "2024-01-01T00:02:00Z"
}
```

### `POST /api/integrations/bureau/pull`
Pull credit report from CIBIL/Equifax.

**Request:**
```json
{
  "pan": "ABCDE1234F",
  "dateOfBirth": "1990-01-01",
  "mobile": "9876543210"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "status": "Processing",
  "estimatedCompletion": "2024-01-01T00:05:00Z"
}
```

### `GET /api/integrations/bureau/:requestId/report`
Get credit report.

**Response:**
```json
{
  "creditScore": 750,
  "grade": "Excellent",
  "remarks": "Good credit history",
  "requestId": "uuid",
  "generatedAt": "2024-01-01T00:05:00Z"
}
```

---

## Masters Endpoints

### `GET /api/masters/branches`
Get branches (for dropdowns).

**Query Parameters:**
- `city` (optional)
- `state` (optional)

**Response:**
```json
{
  "branches": [
    {
      "branch_id": "uuid",
      "branch_code": "BR_MUM_001",
      "branch_name": "Mumbai - Andheri Branch",
      "city": "Mumbai",
      "state": "Maharashtra"
    }
  ]
}
```

### `GET /api/masters/documents`
Get document master (for checklists).

**Query Parameters:**
- `productCode` (optional)

**Response:**
```json
{
  "documents": [
    {
      "document_code": "PAN_CARD",
      "document_name": "PAN Card",
      "is_mandatory": true,
      "applicable_products": ["HOME_LOAN_V1"]
    }
  ]
}
```

---

## Error Responses

All endpoints should return errors in this format:

**Status 400 (Bad Request):**
```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "field": "mobile",
    "reason": "Mobile number must be 10 digits"
  }
}
```

**Status 401 (Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Status 404 (Not Found):**
```json
{
  "error": "NotFound",
  "message": "Application not found"
}
```

**Status 500 (Internal Server Error):**
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

---

## Notes for Third-Party LOS Integration

If your LOS backend uses different endpoint paths or data structures, you can:

1. **Use an API adapter** in the frontend to map your endpoints to this contract
2. **Configure runtime mapping** via `window.__LOS_CONFIG__.endpoints`
3. **Implement a BFF (Backend for Frontend)** layer that adapts your APIs to this contract

The RM frontend will work as long as your backend implements the functionality described in this contract, even if the exact paths differ (with proper configuration).

