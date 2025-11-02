# RM Mobile App Requirements - React Web App Implementation Plan

**Document**: Svatantra - Mobile App.pdf  
**Technology**: React Web App (existing stack)  
**Target**: Relationship Managers (RMs)  
**Date**: 2024-11-01

---

## Executive Summary

This plan outlines the step-by-step implementation of all RM Mobile App requirements in the existing React web application. The plan is organized by modules, with clear dependencies and priorities.

**Total Modules**: 11  
**Estimated Total Effort**: 8-10 weeks (with 1-2 developers)

---

## Module 1: RM Login & Authentication

### Current Status
✅ **Backend Available**: `POST /api/auth/login`, `POST /api/auth/refresh`  
⚠️ **Missing**: Password reset, OTP-based MFA, Login lockout

### Implementation Steps

#### Step 1.1: Backend Enhancements (Auth Service)
**Priority**: High  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Add password reset endpoint
   - `POST /api/auth/forgot-password` - Send OTP to email/mobile
   - `POST /api/auth/reset-password` - Verify OTP and reset password
   - Store OTP in database with expiry (5 minutes)

2. ✅ Add login attempt tracking
   - Track failed attempts per username/IP
   - Lock account after 5 failed attempts (15-minute lockout)
   - Reset attempts on successful login

3. ✅ Add OTP-based MFA (optional, can be phase 2)
   - `POST /api/auth/mfa/send-otp` - Send OTP after login
   - `POST /api/auth/mfa/verify-otp` - Verify and complete login

**Database Changes**:
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;

-- New table for OTPs
CREATE TABLE password_reset_otps (
  otp_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'password_reset', 'mfa_login'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Step 1.2: Frontend - Login Page Enhancements
**Priority**: High  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Create/update `web/src/pages/Login.tsx`
   - Username/password form
   - "Forgot Password?" link
   - Show lockout message if account locked
   - Handle password policy errors
   - Remember me checkbox

2. ✅ Create `web/src/pages/ForgotPassword.tsx`
   - Email/mobile input
   - OTP input form
   - New password form
   - Success/error handling

3. ✅ Update `web/src/lib/api.ts`
   - Add auth API methods:
     - `auth.forgotPassword(email)`
     - `auth.resetPassword(otp, newPassword)`
     - `auth.sendMFAOTP()`
     - `auth.verifyMFAOTP(otp)`

4. ✅ Add role-based routing
   - Check user roles after login
   - Redirect RMs to RM dashboard
   - Redirect Managers to manager view
   - Redirect Admins to admin view

**Files to Create/Modify**:
- `web/src/pages/Login.tsx` (enhance existing or create)
- `web/src/pages/ForgotPassword.tsx` (new)
- `web/src/lib/api.ts` (add auth methods)
- `web/src/lib/auth.ts` (role checking utilities)

---

## Module 2: Dashboard & Customer List

### Current Status
✅ **Backend Available**: `GET /api/applications` with filters, pagination, search  
⚠️ **Missing**: RM-specific filtering, RM dashboard stats

### Implementation Steps

#### Step 2.1: Backend - RM Dashboard API
**Priority**: High  
**Effort**: 2 days

**Tasks**:
1. ✅ Add `GET /api/applications/rm/dashboard` endpoint
   - Total applications (by RM)
   - Active applications count
   - In-progress applications count
   - Submitted applications count
   - Recent applications (last 10)
   - Conversion rate (leads → applications)

2. ✅ Enhance `GET /api/applications` to filter by `assigned_to`
   - Add `assignedTo` query parameter
   - Filter by RM user ID when role is 'rm'

**Database Query Example**:
```sql
-- RM Dashboard Stats
SELECT 
  COUNT(*) FILTER (WHERE status = 'Draft') as draft_count,
  COUNT(*) FILTER (WHERE status = 'Submitted') as submitted_count,
  COUNT(*) FILTER (WHERE status IN ('PendingVerification', 'UnderReview')) as in_progress_count
FROM applications
WHERE assigned_to = $1;
```

#### Step 2.2: Backend - Application Assignment
**Priority**: High  
**Effort**: 1 day

**Tasks**:
1. ✅ Add `assigned_to` field to applications (if not exists)
   - Migration: `ALTER TABLE applications ADD COLUMN assigned_to UUID REFERENCES users(user_id)`

2. ✅ Add endpoint `PATCH /api/applications/:id/assign`
   - Assign application to RM
   - Update `assigned_to` field
   - Record in application history

#### Step 2.3: Frontend - RM Dashboard Page
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/Dashboard.tsx`
   - Stats cards (Active, In-progress, Submitted counts)
   - Recent applications list
   - Quick actions (Create New, View All)
   - Chart/visualization (optional)

2. ✅ Create `web/src/components/rm/StatsCard.tsx`
   - Reusable stat card component
   - Loading state
   - Error state

3. ✅ Create `web/src/components/rm/RecentApplications.tsx`
   - List of recent applications
   - Status badges
   - Click to navigate to application detail

**Files to Create**:
- `web/src/pages/rm/Dashboard.tsx`
- `web/src/components/rm/StatsCard.tsx`
- `web/src/components/rm/RecentApplications.tsx`
- `web/src/lib/api.ts` (add `api.applications.getRMDashboard()`)

#### Step 2.4: Frontend - Customer List Page
**Priority**: High  
**Effort**: 4-5 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/ApplicationsList.tsx`
   - Table/list view of applications
   - Filters: Status, Date Range, Search (Name/Mobile/ID)
   - Pagination
   - Sorting (by date, status, amount)

2. ✅ Create `web/src/components/rm/ApplicationFilters.tsx`
   - Status dropdown
   - Date range picker
   - Search input
   - Clear filters button

3. ✅ Create `web/src/components/rm/ApplicationTable.tsx`
   - Table component with columns:
     - Application ID
     - Customer Name
     - Mobile Number
     - Product
     - Amount
     - Status
     - Created Date
     - Actions (View, Edit if Draft)

4. ✅ Create "Create New Customer" button
   - Navigate to application creation wizard

**Files to Create**:
- `web/src/pages/rm/ApplicationsList.tsx`
- `web/src/components/rm/ApplicationFilters.tsx`
- `web/src/components/rm/ApplicationTable.tsx`
- `web/src/components/rm/ApplicationRow.tsx`

---

## Module 3: Personal Information Capture

### Current Status
✅ **Backend Available**: `PUT /api/applications/:id/applicant`  
⚠️ **Missing**: Comprehensive form validation, auto-fill from documents

### Implementation Steps

#### Step 3.1: Frontend - Personal Information Form
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/PersonalInformation.tsx`
   - Multi-step form or single form
   - All required fields:
     - Full Name (text, alphabets only)
     - DOB (date picker, age > 18 validation)
     - Gender (dropdown: Male, Female, Other)
     - Marital Status (dropdown: Single, Married, Divorced, Widowed)
     - Mobile Number (10 digits, format validation)
     - Email ID (email format validation)
     - Address (text area)
     - PIN Code (6 digits, numeric)
     - City (dropdown - populate from masters)
     - State (dropdown - populate from masters)

2. ✅ Create `web/src/components/rm/PersonalInfoForm.tsx`
   - Form component with validation
   - Real-time validation feedback
   - Save as draft functionality

3. ✅ Integrate with masters service
   - Fetch cities/states from `GET /api/masters/branches`
   - Populate dropdowns dynamically

4. ✅ Add auto-fill from document OCR (if document uploaded)
   - After PAN/Aadhaar upload, parse and auto-fill:
     - Name from PAN
     - DOB from Aadhaar (if available)
     - Address from Aadhaar

**Files to Create**:
- `web/src/pages/rm/PersonalInformation.tsx`
- `web/src/components/rm/PersonalInfoForm.tsx`
- `web/src/lib/validation.ts` (add validation schemas)

**Validation Rules**:
```typescript
const personalInfoSchema = {
  fullName: z.string().min(1).regex(/^[A-Za-z\s]+$/),
  dob: z.date().refine((date) => {
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 18;
  }),
  gender: z.enum(['Male', 'Female', 'Other']),
  mobile: z.string().regex(/^[0-9]{10}$/),
  email: z.string().email().optional(),
  address: z.string().min(1),
  pincode: z.string().regex(/^[0-9]{6}$/),
  city: z.string().min(1),
  state: z.string().min(1)
};
```

---

## Module 4: Employment / Income Details

### Current Status
✅ **Backend Available**: Applicant schema supports employment fields  
⚠️ **Missing**: Income document OCR parsing, "Other Income Sources" field

### Implementation Steps

#### Step 4.1: Backend - Income Document OCR Enhancement
**Priority**: Medium  
**Effort**: 2 days

**Tasks**:
1. ✅ Enhance document OCR service
   - Parse salary slips
   - Extract: Monthly Income, Employer Name, Employee ID
   - Parse ITR documents
   - Extract: Annual Income, Assessment Year

2. ✅ Add endpoint `POST /api/documents/:id/parse-income`
   - Trigger OCR on income documents
   - Return parsed income data
   - Auto-populate employment fields

#### Step 4.2: Frontend - Employment/Income Form
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/EmploymentDetails.tsx`
   - Employment Type dropdown (Salaried/Self-employed)
   - Conditional fields based on type:
     - **Salaried**: Organization Name (mandatory), Monthly Income (mandatory)
     - **Self-employed**: Business Name, Monthly Income (mandatory)
   - Years in Job/Business (numeric, optional)
   - Other Income Sources (text, optional)
   - Total Annual Income (auto-calculated, readonly)

2. ✅ Create `web/src/components/rm/EmploymentForm.tsx`
   - Form with conditional rendering
   - Auto-calculation: Annual Income = Monthly Income × 12 + Other Income
   - Integration with document OCR:
     - If salary slip uploaded, parse and auto-fill
     - Show "Parse from Document" button

3. ✅ Add income document upload section
   - Upload payslips (last 3 months)
   - Upload ITR (last 2 years)
   - Upload Form 16
   - After upload, trigger OCR parsing

**Files to Create**:
- `web/src/pages/rm/EmploymentDetails.tsx`
- `web/src/components/rm/EmploymentForm.tsx`
- `web/src/components/rm/IncomeDocumentUpload.tsx`

**Backend Schema Addition** (if needed):
```sql
ALTER TABLE applicants ADD COLUMN other_income_sources TEXT;
ALTER TABLE applicants ADD COLUMN years_in_job NUMERIC;
```

---

## Module 5: Loan & Property Details

### Current Status
⚠️ **Partial**: Loan fields exist, Property fields missing

### Implementation Steps

#### Step 5.1: Backend - Property Details Schema
**Priority**: High  
**Effort**: 1-2 days

**Tasks**:
1. ✅ Create property details table or add to applications
   ```sql
   CREATE TABLE property_details (
     property_id UUID PRIMARY KEY,
     application_id UUID REFERENCES applications(application_id),
     property_type TEXT NOT NULL CHECK (property_type IN ('Flat', 'Plot', 'House', 'Under Construction')),
     builder_name TEXT,
     project_name TEXT,
     property_value NUMERIC,
     property_address TEXT,
     property_pincode TEXT,
     property_city TEXT,
     property_state TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   
   CREATE INDEX idx_property_application ON property_details(application_id);
   ```

2. ✅ Add endpoints:
   - `POST /api/applications/:id/property` - Create/update property details
   - `GET /api/applications/:id/property` - Get property details

3. ✅ Add Project Finance/APF integration (Phase 2)
   - `POST /api/integrations/project-finance/validate`
   - Validate builder/project against APF system

#### Step 5.2: Frontend - Loan & Property Form
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/LoanPropertyDetails.tsx`
   - Loan Type dropdown (Home Loan, Balance Transfer, Top-up)
   - Loan Amount Required (numeric, mandatory)
   - Tenure in Years (numeric, range 1-30, convert to months for backend)
   - Property Type dropdown (Flat, Plot, House, Under Construction)
   - Builder/Project Name (text, optional)
   - Property Value (numeric, optional)
   - Property Address (text area, optional)
   - Property PIN Code (6 digits)
   - Property City/State (dropdowns)

2. ✅ Create `web/src/components/rm/LoanPropertyForm.tsx`
   - Form with validation
   - Loan eligibility calculator (optional):
     - Show max loan amount based on income
     - Show EMI estimate

3. ✅ Add builder/project validation (if APF integration ready)
   - Auto-complete builder names
   - Validate project against APF system
   - Show validation status

**Files to Create**:
- `web/src/pages/rm/LoanPropertyDetails.tsx`
- `web/src/components/rm/LoanPropertyForm.tsx`
- `web/src/lib/api.ts` (add property endpoints)

---

## Module 6: Document Upload & KYC Verification

### Current Status
✅ **Backend Available**: Document upload, OCR, PAN/Aadhaar validation  
⚠️ **Missing**: Real-time validation UI, Document checklist per product

### Implementation Steps

#### Step 6.1: Backend - Document Checklist API
**Priority**: High  
**Effort**: 1 day

**Tasks**:
1. ✅ Add endpoint `GET /api/applications/:id/documents/checklist`
   - Get required documents for application's product
   - Show which documents are uploaded
   - Show which documents are verified
   - Calculate completion percentage

**Query**:
```sql
SELECT 
  dm.document_code,
  dm.document_name,
  dm.is_mandatory,
  CASE WHEN d.document_id IS NOT NULL THEN true ELSE false END as uploaded,
  CASE WHEN d.verification_status = 'Verified' THEN true ELSE false END as verified
FROM document_master dm
LEFT JOIN documents d ON d.document_code = dm.document_code 
  AND d.application_id = $1
WHERE dm.applicable_products @> ARRAY[$2] OR dm.applicable_products IS NULL
ORDER BY dm.is_mandatory DESC, dm.document_name;
```

#### Step 6.2: Frontend - Document Upload Interface
**Priority**: High  
**Effort**: 4-5 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/DocumentUpload.tsx`
   - Document checklist view (required vs optional)
   - Upload section for each document type
   - Drag & drop file upload
   - File preview after upload
   - Upload progress indicator

2. ✅ Create `web/src/components/rm/DocumentChecklist.tsx`
   - Show all required documents
   - Checkmark for uploaded documents
   - Warning for missing mandatory documents
   - Completion percentage indicator

3. ✅ Create `web/src/components/rm/DocumentUploadCard.tsx`
   - Card for each document type
   - Upload button
   - File preview
   - Verification status badge
   - Remove/replace option

4. ✅ Add real-time PAN validation
   - After PAN upload, automatically call validation API
   - Show validation result (Valid/Invalid)
   - If valid, auto-fill name from response
   - Show error message if invalid

5. ✅ Add Aadhaar eKYC flow
   - After Aadhaar upload, show "Verify Aadhaar" button
   - Initiate eKYC: `POST /api/integrations/ekyc/start`
   - Show OTP input modal
   - Submit OTP: `POST /api/integrations/ekyc/submit-otp`
   - Show verification status (Pending, Verified, Failed)

**Files to Create**:
- `web/src/pages/rm/DocumentUpload.tsx`
- `web/src/components/rm/DocumentChecklist.tsx`
- `web/src/components/rm/DocumentUploadCard.tsx`
- `web/src/components/rm/PANValidation.tsx`
- `web/src/components/rm/AadhaarKYCModal.tsx`

**Integration Points**:
- `POST /api/applications/:id/documents` - Upload document
- `POST /api/integrations/pan/validate` - Validate PAN
- `POST /api/integrations/ekyc/start` - Start Aadhaar eKYC
- `POST /api/integrations/ekyc/:sessionId/submit-otp` - Submit OTP

---

## Module 7: Bank Account Verification

### Current Status
❌ **Missing**: Bank verification API, Penny drop integration

### Implementation Steps

#### Step 7.1: Backend - Bank Account Schema
**Priority**: High  
**Effort**: 1 day

**Tasks**:
1. ✅ Add bank account fields to applicants table
   ```sql
   ALTER TABLE applicants ADD COLUMN bank_account_number TEXT;
   ALTER TABLE applicants ADD COLUMN bank_ifsc TEXT;
   ALTER TABLE applicants ADD COLUMN bank_account_holder_name TEXT;
   ALTER TABLE applicants ADD COLUMN bank_verified BOOLEAN DEFAULT false;
   ALTER TABLE applicants ADD COLUMN bank_verification_method TEXT; -- 'name_match', 'penny_drop'
   ALTER TABLE applicants ADD COLUMN bank_verification_date TIMESTAMPTZ;
   ```

#### Step 7.2: Backend - Bank Verification Adapter
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `services/integration-hub/src/adapters/bank/`
   - `types.ts` - Bank verification interfaces
   - `mock.ts` - Mock adapter for development
   - `razorpay.ts` or `cashfree.ts` - Real adapter (if API available)

2. ✅ Add endpoints:
   - `POST /api/integrations/bank/verify-name` - Account name match
   - `POST /api/integrations/bank/penny-drop` - Initiate penny drop
   - `GET /api/integrations/bank/penny-drop/:requestId/status` - Check penny drop status

3. ✅ Integrate with applicant update
   - Update `PUT /api/applications/:id/applicant` to include bank fields
   - Auto-verify bank account after IFSC validation

**Bank Verification Flow**:
```
1. User enters Account Number + IFSC
2. Validate IFSC format (regex)
3. Call Account Name Match API
4. Compare returned name with applicant name
5. If match, set bank_verified = true
6. If mismatch, show error and allow manual override
7. (Optional) Initiate penny drop for additional verification
```

#### Step 7.3: Frontend - Bank Account Form
**Priority**: High  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/BankAccountVerification.tsx`
   - Bank Account Number input (numeric, validation)
   - IFSC Code input (format validation: ^[A-Z]{4}0[A-Z0-9]{6}$)
   - Account Holder Name input (for comparison)
   - "Verify Account" button

2. ✅ Create `web/src/components/rm/BankVerificationForm.tsx`
   - Form with real-time validation
   - IFSC lookup (optional - fetch bank name from IFSC)
   - Verification status display
   - Success/error messages

3. ✅ Add verification flow:
   - After form submit, call verification API
   - Show loading state
   - Display verification result:
     - ✅ Verified - Name matches
     - ❌ Mismatch - Name doesn't match (allow override)
     - ⏳ Pending - Penny drop initiated
   - Store verification status

**Files to Create**:
- `web/src/pages/rm/BankAccountVerification.tsx`
- `web/src/components/rm/BankVerificationForm.tsx`
- `web/src/lib/api.ts` (add bank verification methods)

---

## Module 8: CIBIL Check

### Current Status
✅ **Backend Available**: Bureau service with CIBIL adapter

### Implementation Steps

#### Step 8.1: Frontend - CIBIL Check Interface
**Priority**: High  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/CIBILCheck.tsx`
   - Show requirements (PAN, DOB, Mobile must be filled)
   - "Pull Credit Report" button
   - Loading state during API call
   - Display results:
     - Credit Score (large number)
     - Score Grade (Excellent, Good, Fair, Poor)
     - Remarks/Summary
     - Credit Report ID (reference number)

2. ✅ Create `web/src/components/rm/CIBILResults.tsx`
   - Score card component
   - Grade badge (color-coded)
   - Detailed breakdown (optional):
     - Active accounts
     - Overdue accounts
     - Credit utilization
   - Download report button (if available)

3. ✅ Add validation:
   - Check if PAN, DOB, Mobile are filled
   - Disable button if missing
   - Show error message with missing fields

**Files to Create**:
- `web/src/pages/rm/CIBILCheck.tsx`
- `web/src/components/rm/CIBILResults.tsx`
- `web/src/lib/api.ts` (add `api.integrations.bureau.pullReport()`)

**Integration**:
- `POST /api/integrations/bureau/pull` - Pull credit report
- `GET /api/integrations/bureau/:requestId/report` - Get detailed report

---

## Module 9: Application Review & Submission

### Current Status
✅ **Backend Available**: `GET /api/applications/:id`, `POST /api/applications/:id/submit`  
⚠️ **Missing**: Completeness validation, Summary view

### Implementation Steps

#### Step 9.1: Backend - Completeness Check
**Priority**: High  
**Effort**: 2 days

**Tasks**:
1. ✅ Add endpoint `GET /api/applications/:id/completeness`
   - Check all mandatory sections:
     - Personal Information (100%)
     - Employment/Income (100%)
     - Loan Details (100%)
     - Property Details (if applicable)
     - Documents (all mandatory uploaded)
     - Bank Account (verified)
     - CIBIL Check (pulled)
   - Return completeness percentage
   - Return missing fields/sections

**Logic**:
```typescript
const completenessCheck = {
  personalInfo: checkPersonalInfo(applicant), // 100% or 0%
  employment: checkEmployment(applicant), // 100% or 0%
  loanDetails: checkLoanDetails(application), // 100% or 0%
  propertyDetails: checkProperty(application), // 100% or 0% (if required)
  documents: checkDocuments(application), // percentage based on mandatory docs
  bankVerification: applicant.bank_verified ? 100 : 0,
  cibilCheck: application.cibil_score ? 100 : 0
};

const overallCompleteness = Object.values(completenessCheck).reduce((a, b) => a + b, 0) / Object.keys(completenessCheck).length;
```

2. ✅ Enhance `POST /api/applications/:id/submit`
   - Check completeness before submission
   - Return error if < 100%
   - List missing sections

#### Step 9.2: Frontend - Application Review Page
**Priority**: High  
**Effort**: 4-5 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/ApplicationReview.tsx`
   - Summary view of all captured data
   - Section-by-section review:
     - Personal Information (readonly)
     - Employment Details (readonly)
     - Loan & Property Details (readonly)
     - Documents (list uploaded documents)
     - Bank Verification Status
     - CIBIL Score

2. ✅ Create `web/src/components/rm/ReviewSection.tsx`
   - Collapsible section component
   - Edit button (if status is Draft)
   - Completion indicator

3. ✅ Create `web/src/components/rm/CompletenessIndicator.tsx`
   - Progress bar showing completion %
   - Breakdown by section
   - Warning for incomplete sections
   - "Complete Profile" button (if < 100%)

4. ✅ Add submission flow:
   - "Submit Application" button
   - Confirmation modal:
     - "Are you sure you want to submit? This action cannot be undone."
     - List of what will happen after submission
   - On confirm, call submit API
   - Show success message with Application ID
   - Redirect to dashboard or application detail

**Files to Create**:
- `web/src/pages/rm/ApplicationReview.tsx`
- `web/src/components/rm/ReviewSection.tsx`
- `web/src/components/rm/CompletenessIndicator.tsx`
- `web/src/components/rm/SubmissionModal.tsx`

---

## Module 10: Notifications & Status Tracking

### Current Status
✅ **Backend Available**: Notification service, SSE real-time updates, Timeline API

### Implementation Steps

#### Step 10.1: Frontend - Status Tracking Page
**Priority**: High  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/rm/ApplicationStatus.tsx`
   - Application ID header
   - Current status badge
   - Status timeline (visual)
   - Status history (list of status changes)
   - Next steps/actions required

2. ✅ Create `web/src/components/rm/StatusTimeline.tsx`
   - Vertical timeline component
   - Status milestones:
     - Draft → Submitted → Pending Verification → Under Review → Approved/Rejected
   - Highlight current status
   - Show dates for each status

3. ✅ Create `web/src/components/rm/StatusHistory.tsx`
   - Table/list of status changes
   - Show: Date, Status, Changed By, Notes
   - Expandable rows for details

4. ✅ Integrate SSE for real-time updates
   - Connect to `GET /api/applications/:id/events` (SSE)
   - Update status automatically when changed
   - Show toast notification for status changes

**Files to Create**:
- `web/src/pages/rm/ApplicationStatus.tsx`
- `web/src/components/rm/StatusTimeline.tsx`
- `web/src/components/rm/StatusHistory.tsx`
- `web/src/lib/sse.ts` (SSE client utility)

#### Step 10.2: Frontend - Push Notifications (Browser)
**Priority**: Medium  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Add browser push notification support
   - Request permission
   - Register service worker
   - Subscribe to push notifications
   - Show notifications for:
     - Status changes
     - Document verification
     - Approval/rejection

2. ✅ Create notification settings
   - Allow user to enable/disable notifications
   - Select notification types

**Note**: Full mobile push notifications (FCM/APNS) will be implemented when React Native app is built.

**Files to Create**:
- `web/src/lib/push-notifications.ts`
- `web/public/sw.js` (service worker)

---

## Module 11: Admin & Configuration

### Current Status
✅ **Backend Available**: Masters service, Auth service for user management  
⚠️ **Missing**: RM user management UI, Configuration UI

### Implementation Steps

#### Step 11.1: Frontend - RM User Management (Admin)
**Priority**: Medium  
**Effort**: 3-4 days

**Tasks**:
1. ✅ Create `web/src/pages/admin/RMUsers.tsx` (Admin only)
   - List of RM users
   - Create new RM user
   - Edit RM user
   - Activate/Deactivate RM user
   - Reset password

2. ✅ Create `web/src/components/admin/RMUserForm.tsx`
   - Form for creating/editing RM
   - Fields: Username, Email, Mobile, Branch, Role
   - Password generation/assignment

3. ✅ Create `web/src/components/admin/RMUserTable.tsx`
   - Table of RM users
   - Filters: Branch, Status, Role
   - Actions: Edit, Deactivate, Reset Password

**Files to Create**:
- `web/src/pages/admin/RMUsers.tsx`
- `web/src/components/admin/RMUserForm.tsx`
- `web/src/components/admin/RMUserTable.tsx`

#### Step 11.2: Frontend - Master Data Management (Optional)
**Priority**: Low  
**Effort**: 2-3 days

**Tasks**:
1. ✅ Create master data management UI (if needed)
   - Cities/States management
   - Loan types management
   - Document types management
   - Branches management

**Note**: Master data can also be managed via API/database directly.

---

## Implementation Sequence & Dependencies

### Phase 1: Foundation (Week 1-2)
**Goal**: Core authentication and navigation

1. ✅ Module 1: RM Login & Authentication (Step 1.1, 1.2)
2. ✅ Module 2: Dashboard & Customer List (Step 2.1, 2.2, 2.3)
3. ✅ Set up routing and navigation
4. ✅ Role-based access control

**Deliverable**: RM can login, see dashboard, view application list

### Phase 2: Data Capture (Week 3-4)
**Goal**: All data capture forms

4. ✅ Module 3: Personal Information (Step 3.1)
5. ✅ Module 4: Employment/Income (Step 4.2)
6. ✅ Module 5: Loan & Property (Step 5.1, 5.2)
7. ✅ Module 6: Document Upload (Step 6.1, 6.2)

**Deliverable**: RM can capture all customer data and upload documents

### Phase 3: Verification & Integration (Week 5-6)
**Goal**: External integrations and verifications

8. ✅ Module 7: Bank Account Verification (Step 7.1, 7.2, 7.3)
9. ✅ Module 8: CIBIL Check (Step 8.1)
10. ✅ Enhance Module 6: Real-time PAN/Aadhaar validation

**Deliverable**: All verification features working

### Phase 4: Submission & Tracking (Week 7-8)
**Goal**: Application submission and status tracking

11. ✅ Module 9: Application Review & Submission (Step 9.1, 9.2)
12. ✅ Module 10: Notifications & Status Tracking (Step 10.1)

**Deliverable**: RM can review, submit, and track applications

### Phase 5: Admin & Polish (Week 9-10)
**Goal**: Admin features and UX improvements

13. ✅ Module 11: Admin & Configuration (Step 11.1, 11.2)
14. ✅ UI/UX polish
15. ✅ Testing and bug fixes

**Deliverable**: Complete RM application ready for production

---

## Technical Considerations

### State Management
- Use React Context or Zustand for global state (auth, current application)
- Use React Query for server state management
- Local state for forms (use controlled components)

### Routing
- React Router for navigation
- Protected routes based on roles
- Route structure:
  ```
  /rm/login
  /rm/dashboard
  /rm/applications
  /rm/applications/:id/personal
  /rm/applications/:id/employment
  /rm/applications/:id/loan-property
  /rm/applications/:id/documents
  /rm/applications/:id/bank
  /rm/applications/:id/cibil
  /rm/applications/:id/review
  /rm/applications/:id/status
  ```

### Form Management
- React Hook Form for form validation
- Zod for schema validation
- Multi-step forms for application creation

### File Upload
- Use `fetch` with FormData for file uploads
- Show upload progress
- Handle large files (chunked upload if needed)

### Real-time Updates
- Server-Sent Events (SSE) for status updates
- WebSocket (optional, if needed for more complex real-time features)

### Responsive Design
- Mobile-first approach (since it's for RM mobile use case)
- Tailwind CSS (already in use)
- Ensure forms work well on mobile screens

### Error Handling
- Consistent error messages
- Retry mechanisms for API calls
- Offline mode detection (inform user if offline)

---

## Testing Strategy

### Unit Tests
- Component tests (React Testing Library)
- Utility function tests
- Validation logic tests

### Integration Tests
- API integration tests
- Form submission flow tests
- Multi-step workflow tests

### E2E Tests
- Complete application creation flow
- Document upload and verification
- Application submission

---

## Deployment Considerations

### Environment Variables
- API endpoints
- Feature flags (enable/disable features)
- Integration API keys (use fallback mode in dev)

### Performance
- Lazy loading for routes
- Code splitting
- Image optimization
- Bundle size optimization

---

## Success Metrics

1. ✅ RM can login and access dashboard
2. ✅ RM can create new application
3. ✅ RM can capture all required customer data
4. ✅ RM can upload and verify documents
5. ✅ RM can verify bank account
6. ✅ RM can pull CIBIL report
7. ✅ RM can review and submit application
8. ✅ RM can track application status
9. ✅ Application completeness check works
10. ✅ All integrations work (with fallback mode)

---

## Risk Mitigation

### Risk 1: Backend APIs not ready
**Mitigation**: Use mock data/API fallback mode, develop frontend with mocks

### Risk 2: Integration APIs not available
**Mitigation**: All integrations have fallback mode, use mock responses

### Risk 3: Complex form validation
**Mitigation**: Use proven libraries (React Hook Form + Zod), start simple

### Risk 4: File upload performance
**Mitigation**: Implement chunked uploads, show progress, handle errors gracefully

---

## Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Set up development environment** - Ensure all services running
3. **Start Phase 1** - Implement authentication and dashboard
4. **Iterate** - Weekly sprints, demo after each phase
5. **Test** - Continuous testing throughout development
6. **Deploy** - Staging environment for testing before production

---

## Appendix: File Structure

```
web/src/
├── pages/
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   └── rm/
│       ├── Dashboard.tsx
│       ├── ApplicationsList.tsx
│       ├── PersonalInformation.tsx
│       ├── EmploymentDetails.tsx
│       ├── LoanPropertyDetails.tsx
│       ├── DocumentUpload.tsx
│       ├── BankAccountVerification.tsx
│       ├── CIBILCheck.tsx
│       ├── ApplicationReview.tsx
│       └── ApplicationStatus.tsx
├── components/
│   └── rm/
│       ├── StatsCard.tsx
│       ├── ApplicationTable.tsx
│       ├── PersonalInfoForm.tsx
│       ├── EmploymentForm.tsx
│       ├── LoanPropertyForm.tsx
│       ├── DocumentChecklist.tsx
│       ├── DocumentUploadCard.tsx
│       ├── BankVerificationForm.tsx
│       ├── CIBILResults.tsx
│       ├── CompletenessIndicator.tsx
│       └── StatusTimeline.tsx
├── lib/
│   ├── api.ts (enhanced)
│   ├── auth.ts
│   ├── validation.ts
│   ├── sse.ts
│   └── push-notifications.ts
└── hooks/
    ├── useAuth.ts
    ├── useApplication.ts
    └── useNotifications.ts
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-01  
**Status**: Ready for Review

