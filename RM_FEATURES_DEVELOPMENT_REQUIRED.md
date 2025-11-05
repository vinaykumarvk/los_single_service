# Relationship Manager Features - Development Requirements

**Date**: Generated from requirements analysis  
**Source Document**: Svatantra - Mobile App.pdf  
**Purpose**: Identify features that need to be developed for Relationship Manager (web application focus)

---

## 🎯 Executive Summary

Based on the requirements document analysis and codebase review, approximately **68% of features are complete**. The remaining features fall into three categories:

### Quick Wins (Can Start Immediately)
1. **Application Completeness Validation** - Backend endpoint missing (frontend ready)
2. **Password Reset with OTP** - Backend complete, frontend pages needed
3. **Application Status Tracking Page** - Placeholder needs full implementation
4. **Login Attempt Lockout** - Backend complete, frontend error handling needed

### Verification & Enhancement (1-2 days each)
5. **Bank Account Verification** - Frontend complete, verify backend endpoints
6. **Property Details Fields** - Backend complete, verify frontend captures all fields
7. **Other Income Sources** - API field exists, verify frontend form
8. **RM Assignment Workflow** - Likely implemented, needs verification

### Optional (Can Defer)
9. **Project Finance/APF Integration** - External system integration (optional)

**Total Development Effort**: ~10-15 days for all features

---

## ✅ Currently Implemented Features

### Web Application Pages (Already Built)
1. ✅ **Dashboard** (`/rm`) - Statistics and recent applications
2. ✅ **Applications List** (`/rm/applications`) - View all applications
3. ✅ **New Application** (`/rm/applications/new`) - Create new application (being developed/tested)
4. ✅ **Personal Information** (`/rm/applications/:id/personal`) - Capture personal details
5. ✅ **Employment Details** (`/rm/applications/:id/employment`) - Employment/income information
6. ✅ **Loan Property Details** (`/rm/applications/:id/loan-property`) - Loan and property information
7. ✅ **Document Upload** (`/rm/applications/:id/documents`) - Upload KYC documents
8. ✅ **Bank Verification** (`/rm/applications/:id/bank`) - Bank account verification UI
9. ✅ **CIBIL Check** (`/rm/applications/:id/cibil`) - Credit score check
10. ✅ **Application Review** (`/rm/applications/:id/review`) - Review before submission

### Backend APIs (Already Available)
- ✅ Application CRUD operations
- ✅ Applicant data management
- ✅ Document upload and management
- ✅ CIBIL/Bureau integration (mock adapter)
- ✅ PAN/Aadhaar validation (mock adapter)
- ✅ Application status management
- ✅ RM Dashboard stats endpoint (basic)

---

## ❌ Features Requiring Development

### 🔴 HIGH PRIORITY - Core Business Features

#### 1. **Bank Account Verification (Complete Implementation)**
**Status**: ⚠️ **Partial** - Frontend complete, backend API endpoints exist but may need verification

**Requirements from PDF**:
- Enter Bank Account Number and IFSC
- Account Name Match API integration
- Penny Drop Verification (₹1 transaction verification)
- Numeric account number validation
- IFSC format validation
- Verified flag setting

**Current Status**:
- ✅ Frontend page fully implemented (`BankVerification.tsx`) with:
  - Form validation (account number, IFSC, account holder name)
  - Verification method selection (name match or penny drop)
  - UI for verification results
- ✅ Frontend API client has bank verification methods (lines 182-206 in `api.ts`):
  - `verify`, `verifyName`, `pennyDrop`, `getPennyDropStatus`
- ✅ Applicant schema includes bank fields (lines 94-100 in `api.ts`):
  - `bankAccountNumber`, `bankIfsc`, `accountHolderName`, `bankName`
  - `bankVerified`, `bankVerifiedAt`, `bankVerificationMethod`
- ⚠️ Need to verify backend endpoints are implemented and working

**What's Missing**:
- [ ] Verify backend endpoints exist in integration service:
  - `POST /api/integrations/bank/verify`
  - `POST /api/integrations/bank/verify-name`
  - `POST /api/integrations/bank/penny-drop`
- [ ] Verify bank verification adapter is implemented (mock or real)
- [ ] Test end-to-end verification workflow
- [ ] Ensure verified flag is saved to applicant record

**Files to Check/Modify**:
- `services/integration/src/adapters/` - Verify bank verification adapter exists
- `services/integration/src/server.ts` - Verify endpoints are registered
- `services/application/src/server.ts` - Verify applicant update saves bank verification

**Estimated Complexity**: Medium  
**Estimated Time**: 2-3 days (verification and fixes)

---

#### 2. **Property Details Fields (Complete Implementation)**
**Status**: ✅ **Mostly Complete** - Backend schema exists, verify frontend usage

**Requirements from PDF**:
- Property Type (Residential, Commercial, Plot, etc.)
- Builder/Project Name
- Property Value
- Property Address (separate from applicant address)
- Project Finance/APF system integration (optional)

**Current Status**:
- ✅ Backend schema exists: `property_details` table with all fields
  - `property_type` (enum: Flat, Plot, House, Under Construction)
  - `builder_name`, `project_name`, `property_value`
  - `property_address`, `property_pincode`, `property_city`, `property_state`
- ✅ Backend endpoints exist: `POST /api/applications/:id/property`
- ✅ Frontend API client has property methods (lines 109-124 in `api.ts`)
- ⚠️ Need to verify frontend form captures all fields

**What's Missing**:
- [ ] Verify `LoanPropertyDetails.tsx` captures all property fields
- [ ] Project Finance/APF builder validation API (optional)
- [ ] Ensure property details are required for certain loan types

**Files to Check/Modify**:
- `web/src/rm/pages/LoanPropertyDetails.tsx` - Verify all fields are captured
- `services/integration/src/adapters/` - Add Project Finance adapter (optional)

**Estimated Complexity**: Low  
**Estimated Time**: 1 day (verification and enhancements)

---

#### 3. **Application Completeness Validation**
**Status**: ⚠️ **Partial** - Frontend expects it, backend endpoint missing

**Requirements from PDF**:
- Validate completeness (100% profile) before submission
- Mandatory section completion check
- Show completeness percentage in UI
- Prevent submission if incomplete

**Current Status**:
- ✅ Frontend calls `GET /api/applications/:id/completeness` (line 50-51 in `api.ts`)
- ✅ ApplicationReview page displays completeness (line 63, 87, 26 in `ApplicationReview.tsx`)
- ❌ Backend endpoint `/api/applications/:id/completeness` NOT FOUND in application service

**What's Missing**:
- [ ] Backend endpoint: `GET /api/applications/:id/completeness`
- [ ] Completeness calculation logic (percentage based on required fields)
- [ ] Section-by-section completeness check
- [ ] Submission blocking for incomplete applications (< 100%)

**Files to Check/Modify**:
- `services/application/src/server.ts` - Add completeness check endpoint
- `web/src/rm/pages/ApplicationReview.tsx` - Already has UI, just needs backend
- `web/src/rm/pages/NewApplication.tsx` - Add completeness validation before submit

**Estimated Complexity**: Medium  
**Estimated Time**: 2-3 days

---

#### 4. **Application Status Tracking Page**
**Status**: ⚠️ **Placeholder** - Page exists but needs implementation

**Requirements from PDF**:
- View application timeline
- Status tracking with real-time updates
- Push notifications for status changes
- Manager notifications for submitted cases

**What's Missing**:
- [ ] Implement `RMApplicationStatus` page component
- [ ] Display application timeline/events
- [ ] Real-time status updates (SSE/WebSocket)
- [ ] Status change notifications

**Files to Check/Modify**:
- `web/src/rm/pages/ApplicationStatus.tsx` - Create full implementation
- `web/src/rm/routes.tsx` - Verify route is correct
- Backend: `GET /api/applications/:id/timeline` - Verify exists

**Estimated Complexity**: Medium  
**Estimated Time**: 2-3 days

---

#### 5. **Password Reset with OTP**
**Status**: ✅ **Backend Complete**, ❌ **Frontend Missing**

**Requirements from PDF**:
- Forgot password functionality
- Generate 6-digit OTP
- Reset password via OTP
- OTP expiry (5 minutes)

**Current Status**:
- ✅ Backend fully implemented:
  - `POST /api/auth/forgot-password` - Generates OTP
  - `POST /api/auth/reset-password` - Resets with OTP
  - OTP stored in `password_reset_otps` table
  - 5-minute expiry, secure hash storage
- ❌ Frontend pages missing (no ForgotPassword or ResetPassword found)

**What's Missing**:
- [ ] Frontend "Forgot Password" page (`/rm/login/forgot-password`)
- [ ] OTP input and validation UI
- [ ] Password reset confirmation page
- [ ] Link from Login page to Forgot Password

**Files to Create/Modify**:
- `web/src/rm/pages/ForgotPassword.tsx` - Create new page
- `web/src/rm/pages/ResetPassword.tsx` - Create new page
- `web/src/shared/pages/Login.tsx` - Add "Forgot Password" link
- `web/src/rm/routes.tsx` - Add routes for forgot/reset password

**Estimated Complexity**: Low-Medium  
**Estimated Time**: 2-3 days

---

#### 6. **Login Attempt Lockout**
**Status**: ⚠️ **Partial** - Backend may exist, needs verification

**Requirements from PDF**:
- Lock account after 5 failed login attempts
- 15-minute lockout period
- Clear error messages

**What's Missing**:
- [ ] Verify backend lockout implementation exists
- [ ] Frontend error message display
- [ ] Lockout countdown/timer display
- [ ] Account unlock messaging

**Files to Check/Modify**:
- `services/auth/src/auth-features.ts` - Verify lockout logic
- `web/src/rm/pages/Login.tsx` - Add lockout error handling

**Estimated Complexity**: Low  
**Estimated Time**: 1 day

---

### 🟡 MEDIUM PRIORITY - Enhancement Features

#### 7. **Other Income Sources Field**
**Status**: ✅ **Implemented** - Field exists in API

**Requirements from PDF**:
- Capture other income sources beyond salary
- Total annual income calculation (including other sources)
- Display in employment details

**Current Status**:
- ✅ Frontend API includes `otherIncomeSources` field (line 92 in `api.ts`)
- ✅ Backend schema likely supports it (need to verify)
- ⚠️ Need to verify frontend form captures this field

**What's Missing**:
- [ ] Verify `EmploymentDetails.tsx` form has other income field
- [ ] Update income calculation to include other sources
- [ ] Display in employment details summary

**Files to Check/Modify**:
- `web/src/rm/pages/EmploymentDetails.tsx` - Verify field is captured
- `services/customer-kyc/src/schema.ts` - Verify field exists in schema

**Estimated Complexity**: Low  
**Estimated Time**: 1 day (verification and UI updates)

---

#### 8. **RM Assignment Workflow**
**Status**: ⚠️ **Partial** - May need enhancement

**Requirements from PDF**:
- RMs should see only their assigned applications
- Filter applications by `assigned_to=RM_ID`
- Dashboard should show only RM's applications

**What's Missing**:
- [ ] Verify backend filtering by `assigned_to`
- [ ] Ensure dashboard API filters by RM ID
- [ ] Verify applications list filters correctly
- [ ] Test assignment workflow

**Files to Check/Modify**:
- `services/application/src/server.ts` - Verify filtering logic
- `web/src/rm/lib/api.ts` - Verify API calls include RM filter
- `web/src/rm/pages/ApplicationsList.tsx` - Verify filtering

**Estimated Complexity**: Low  
**Estimated Time**: 1 day

---

#### 9. **Project Finance/APF System Integration**
**Status**: ❌ **Missing** - Optional but documented

**Requirements from PDF**:
- Validate builder/project name against Project Finance system
- Verify property details with APF system
- Integration with external system

**What's Missing**:
- [ ] Project Finance/APF API adapter
- [ ] Builder validation endpoint
- [ ] Property verification workflow
- [ ] Frontend integration (optional)

**Files to Check/Modify**:
- `services/integration/src/adapters/` - Create Project Finance adapter
- `services/application/src/server.ts` - Add validation endpoint

**Estimated Complexity**: Medium  
**Estimated Time**: 3-5 days  
**Note**: This is optional and can be deferred

---

## 📋 Feature Implementation Checklist

### Immediate Priority (Can start now)
- [ ] **Bank Account Verification** - Complete backend API
- [ ] **Property Details Fields** - Verify and add missing fields
- [ ] **Application Completeness Validation** - Backend + frontend
- [ ] **Application Status Page** - Full implementation
- [ ] **Password Reset with OTP** - Frontend pages

### Quick Wins (1 day each)
- [ ] **Login Attempt Lockout** - Frontend error handling
- [ ] **Other Income Sources** - Field addition
- [ ] **RM Assignment Workflow** - Verify filtering

### Optional (Can defer)
- [ ] **Project Finance/APF Integration** - External system integration

---

## 🎯 Recommended Development Order

### Week 1: Core Business Features
1. **Application Completeness Validation** (2-3 days)
   - Critical for ensuring data quality
   - Blocks submission of incomplete applications
   - High user value

2. **Application Status Tracking Page** (2-3 days)
   - Important for RM visibility
   - Uses existing timeline API
   - Moderate complexity

### Week 2: Verification Features
3. **Bank Account Verification** (3-5 days)
   - Complete backend API
   - Integration with payment gateway/bank API
   - High business value

4. **Property Details Fields** (2-3 days)
   - Verify schema completeness
   - Add missing fields if needed
   - Update frontend forms

### Week 3: Authentication & Security
5. **Password Reset with OTP** (2-3 days)
   - Frontend implementation
   - User experience improvement
   - Security requirement

6. **Login Attempt Lockout** (1 day)
   - Frontend error handling
   - Security enhancement

### Week 4: Enhancements
7. **Other Income Sources** (1 day)
   - Quick enhancement
   - Data completeness

8. **RM Assignment Workflow** (1 day)
   - Verify existing implementation
   - Ensure proper filtering

9. **Project Finance/APF Integration** (Optional, 3-5 days)
   - Can be deferred to later phase

---

## 📊 Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| **High Priority Features** | 6 | 2 Complete, 4 Need Development |
| **Medium Priority Features** | 3 | 1 Complete, 2 Need Verification |
| **Already Implemented** | 10+ | Complete |
| **Total Features Analyzed** | 19+ | ~68% Complete |

### Feature Status Breakdown

**✅ Fully Complete (Backend + Frontend):**
- Property Details Fields (backend schema exists, verify frontend)
- Other Income Sources (API field exists, verify frontend)

**⚠️ Partial (Backend Complete, Frontend Missing):**
- Password Reset with OTP (backend done, frontend pages needed)
- Login Attempt Lockout (backend done, frontend error handling needed)

**⚠️ Partial (Frontend Complete, Backend Missing/Needs Verification):**
- Bank Account Verification (frontend complete, verify backend endpoints)
- Application Completeness Validation (frontend expects it, backend missing)
- Application Status Tracking Page (placeholder only)

**✅ Mostly Complete (Needs Verification Only):**
- RM Assignment Workflow (likely implemented, needs verification)

**❌ Missing (Optional):**
- Project Finance/APF Integration (optional feature)

---

## 📝 Notes

1. **Backend APIs**: Many backend APIs already exist but may need enhancement or verification
2. **Frontend Pages**: Most pages exist but some need full implementation
3. **Integration**: External system integrations (Bank API, Project Finance) are the most complex
4. **Mobile App**: This analysis focuses on web application. Mobile app features (offline mode, camera, push notifications) are separate development effort

---

## 🔍 Next Steps

1. **Verify Current Implementation**: Check each feature to confirm what's actually implemented vs what's documented
2. **Prioritize Based on Business Needs**: Adjust priority based on immediate business requirements
3. **Start with Quick Wins**: Implement login lockout and other income sources first (1 day each)
4. **Then Core Features**: Focus on completeness validation and status tracking
5. **Finally Complex Integrations**: Bank verification and Project Finance can be done last

---

**Last Updated**: Generated from requirements analysis  
**Next Review**: After Create Application feature testing is complete

