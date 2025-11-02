# Relationship Manager Mobile App - Requirements Analysis

**Document**: Svatantra - Mobile App.pdf  
**Analysis Date**: 2024-11-01  
**Purpose**: Identify which requirements are already implemented vs need fresh development

---

## Executive Summary

The RM Mobile App requirements focus on a mobile application for Relationship Managers to capture leads, perform KYC verification, and submit loan applications. The current LOS system has **most backend APIs already implemented**, but needs:

1. **Mobile-specific features** (offline mode, camera integration, push notifications)
2. **RM-specific workflows** (RM-assigned leads, RM dashboard)
3. **Enhanced integrations** (Bank verification API, Project Finance/APF system)
4. **Mobile UI/UX** (React Native/Flutter app)

---

## 1. Requirements Already Available (Need Access Control Only)

### ✅ Module 1: RM Login & Authentication

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Login using RM ID and password | ✅ **Available** | `POST /api/auth/login` in auth service | Add RM role/permission |
| SSO integration | ✅ **Available** | Keycloak OIDC already configured | Configure RM realm |
| Forgot password / reset via OTP | ⚠️ **Partial** | Basic auth service exists | Add password reset endpoint |
| Role-based access control | ✅ **Available** | JWT with roles, `requireAuth` middleware | Map RM roles correctly |
| Lockout after 5 failed attempts | ❌ **Missing** | Not implemented | **Need to develop** |

**Action**: Add RM-specific roles and permissions in auth service.

---

### ✅ Module 2: Dashboard & Customer List

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| View Active/In-progress/Submitted Applications | ✅ **Available** | `GET /api/applications?status=...` | Filter by `assigned_to=RM_ID` |
| Create New Customer Entry | ✅ **Available** | `POST /api/applications` | RM role permission |
| Search by Name/Mobile/Application ID | ✅ **Available** | Advanced search filters in application service | Already accessible |
| Filter by status or creation date | ✅ **Available** | `GET /api/applications?status=...&createdAt=...` | Already accessible |
| Pagination and sorting | ✅ **Available** | `GET /api/applications?page=1&limit=20` | Already accessible |

**Action**: Add `assigned_to` field filtering to show only RM's assigned applications.

---

### ✅ Module 3: Personal Information Capture

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Full Name, DOB, Gender, Marital Status | ✅ **Available** | `PUT /api/applicants/:id` - all fields supported | RM permission to create/update |
| Mobile Number, Email ID | ✅ **Available** | Encrypted storage in applicants table | RM permission |
| Address, PIN Code, City/State | ✅ **Available** | Full address fields in applicants table | RM permission |
| Age > 18 validation | ✅ **Available** | DOB validation in schema | Already enforced |
| Format validations | ✅ **Available** | Zod schemas with regex validation | Already enforced |

**Action**: No development needed - just RM role access.

---

### ✅ Module 4: Employment / Income Details

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Employment Type (Salaried/Self-employed) | ✅ **Available** | `employment_type` enum field | RM permission |
| Organization Name | ✅ **Available** | `employer_name` field | RM permission |
| Monthly Income | ✅ **Available** | `monthly_income` numeric field | RM permission |
| Years in Job/Business | ⚠️ **Partial** | Not explicitly stored | Could derive from employment start date |
| Other Income Sources | ⚠️ **Partial** | `existingEmi` tracked, but not other sources | **Minor enhancement needed** |
| Total Annual Income (auto-calculated) | ✅ **Available** | `monthly_income * 12` can be calculated | RM permission |
| Income document OCR (optional) | ✅ **Available** | Document service has OCR capability | RM permission |

**Action**: Minor enhancement - add "other income sources" field if needed.

---

### ✅ Module 5: Loan & Property Details

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Loan Type (Home Loan, Balance Transfer, Top-up) | ✅ **Available** | Product codes in applications | RM permission |
| Loan Amount Required | ✅ **Available** | `requested_amount` field | RM permission |
| Tenure (Years) | ✅ **Available** | `requested_tenure_months` (can convert to years) | RM permission |
| Property Type | ⚠️ **Partial** | Not explicitly stored in applications table | **Need to add property fields** |
| Builder/Project Name | ⚠️ **Partial** | Not stored | **Need to add property fields** |
| Property Value | ⚠️ **Partial** | Not stored | **Need to add property fields** |
| Property Address | ⚠️ **Partial** | Only applicant address stored | **Need to add property address** |
| Project Finance/APF system integration | ❌ **Missing** | No integration exists | **Need to develop** |

**Action**: Add property-related fields to applications or create separate property entity.

---

### ✅ Module 6: Document Upload & KYC Verification

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Upload via camera/gallery | ⚠️ **Mobile-specific** | `POST /api/applications/:id/documents` accepts files | Mobile app needs camera API |
| PAN Card upload | ✅ **Available** | Document upload supports all types | RM permission |
| Aadhaar Card upload | ✅ **Available** | Document upload with verification | RM permission |
| Address Proof upload | ✅ **Available** | Document service supports all types | RM permission |
| Income Proof upload | ✅ **Available** | Document service supports Payslip, ITR | RM permission |
| Property Papers upload | ✅ **Available** | Document service supports all types | RM permission |
| OCR and auto-fill (optional) | ✅ **Available** | `services/document/src/ocr.ts` has OCR capability | RM permission |
| Real-time PAN validation via NSDL API | ✅ **Available** | `POST /api/integrations/pan/validate` | RM permission |
| Real-time Aadhaar eKYC via OTP | ✅ **Available** | `POST /api/integrations/ekyc/start` | RM permission |
| File type validation (JPEG/PNG/PDF) | ✅ **Available** | Document service validates file types | Already enforced |
| Max size 5MB per file | ⚠️ **Different** | Current limit is 15MB | Need to adjust or make configurable |

**Action**: Mostly available - mobile app needs camera integration; reduce file size limit if needed.

---

### ✅ Module 7: Bank Account Verification

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Enter Bank Account Number, IFSC | ⚠️ **Partial** | Not stored in applicants table | **Need to add bank account fields** |
| Account Name Match API integration | ❌ **Missing** | No bank verification API | **Need to develop** |
| Penny Drop Verification | ❌ **Missing** | No penny drop integration | **Need to develop** |
| Numeric account number check | ✅ **Available** | Can validate via schema | RM permission |
| IFSC format validation | ✅ **Available** | Can validate via regex | RM permission |
| Verified flag setting | ❌ **Missing** | No bank verification workflow | **Need to develop** |

**Action**: Need to develop bank verification service/adapter.

---

### ✅ Module 8: CIBIL Check

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Initiate credit score fetch using PAN+DOB+Mobile | ✅ **Available** | `POST /api/integrations/bureau/pull` | RM permission |
| Display score, grade, remarks | ✅ **Available** | Bureau service returns credit score and details | RM permission |
| Store CIBIL reference number | ✅ **Available** | Bureau service stores request IDs | RM permission |
| CIBIL/Equifax API integration | ✅ **Available** | CIBIL adapter with fallback mode | RM permission |
| Handle "No record found" gracefully | ✅ **Available** | Adapter returns null, service handles it | Already implemented |
| PAN and DOB mandatory validation | ✅ **Available** | Schema validation enforced | Already implemented |

**Action**: Fully available - just need RM permission.

---

### ✅ Module 9: Application Review & Submission

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Show all captured data in summary format | ✅ **Available** | `GET /api/applications/:id` returns full data | RM permission |
| Validate completeness (100% profile) | ⚠️ **Partial** | Basic validation exists | **Need completeness check logic** |
| Submit to central LOS system | ✅ **Available** | `POST /api/applications/:id/submit` | RM permission |
| Generate unique Application ID | ✅ **Available** | UUID-based application_id | Already generated |
| Status updates (Draft → Submitted → In Verification → Approved/Rejected) | ✅ **Available** | Status state machine implemented | RM permission |
| Mandatory section completion check | ⚠️ **Partial** | Per-field validation, but no completeness check | **Need completeness validation** |
| Confirmation pop-up before submission | ⚠️ **Mobile-specific** | Backend doesn't need pop-up | Mobile app implementation |

**Action**: Add completeness validation logic.

---

### ✅ Module 10: Notifications & Status Tracking

| Requirement | Status | Current Implementation | Access Control Needed |
|------------|--------|------------------------|----------------------|
| Push notification for status changes | ✅ **Available** | Notification service supports push | RM mobile device registration |
| View application timeline | ✅ **Available** | `GET /api/applications/:id/timeline` | RM permission |
| Manager notifications for submitted cases | ✅ **Available** | Notification service can send to managers | Configure manager recipients |
| Status tracking | ✅ **Available** | SSE real-time updates: `GET /api/applications/:id/events` | RM permission |

**Action**: Fully available - need push notification device registration for mobile.

---

## 2. Requirements Needing Fresh Development

### ❌ Module 11: Admin & Configuration (Mobile-specific features)

| Requirement | Development Needed | Complexity |
|------------|-------------------|------------|
| Mobile app user management UI | ✅ **Mobile App** | Medium - Mobile UI screens |
| Master data setup (Cities, Loan types) | ✅ **Partially Available** | Low - Masters service has APIs, need mobile UI |
| Access logs and audit trails | ✅ **Available** | Low - Audit service exists, need mobile view |

---

### ❌ Mobile-Specific Features

| Requirement | Development Needed | Complexity |
|------------|-------------------|------------|
| **React Native/Flutter Mobile App** | ✅ **Complete Mobile App** | High - Full mobile application development |
| **Offline Mode** (SQLite local storage) | ✅ **Mobile App** | Medium - Local data sync logic |
| **Camera Integration** | ✅ **Mobile App** | Low - React Native/Flutter camera APIs |
| **Gallery Integration** | ✅ **Mobile App** | Low - React Native/Flutter image picker |
| **Push Notifications** (Mobile device tokens) | ✅ **Backend + Mobile** | Medium - Device registration + FCM/APNS |
| **Mobile-optimized UI/UX** | ✅ **Mobile App** | High - Complete mobile UI design |

---

### ❌ Missing Backend Features

| Requirement | Development Needed | Complexity | Priority |
|------------|-------------------|------------|----------|
| **Password Reset with OTP** | ✅ **Auth Service** | Medium | High |
| **Login Attempt Lockout** (5 failed attempts) | ✅ **Auth Service** | Low | Medium |
| **Bank Account Verification API** | ✅ **Integration Hub** | Medium | High |
| **Penny Drop Integration** | ✅ **Integration Hub** | Medium | High |
| **Property Details Fields** | ✅ **Application Schema** | Low | High |
| **Project Finance/APF System Integration** | ✅ **Integration Hub** | Medium | Medium |
| **Application Completeness Check** | ✅ **Application Service** | Low | High |
| **RM Assignment Workflow** | ✅ **Application Service** | Low | High |
| **RM Dashboard API** (aggregated stats) | ✅ **Reporting Service** | Medium | High |
| **Other Income Sources Field** | ✅ **Applicant Schema** | Low | Low |

---

### ❌ Integration Enhancements

| Requirement | Development Needed | Complexity |
|------------|-------------------|------------|
| **Bank Account Name Match API** | ✅ **New Adapter** | Medium - Need bank API integration |
| **Penny Drop Service** | ✅ **New Adapter** | Medium - Need payment gateway or bank API |
| **Project Finance/APF Builder Validation** | ✅ **New Adapter** | Medium - External system integration |

---

## Summary Tables

### ✅ Available with Access Control Only (60% of requirements)

**Modules Fully Available:**
1. ✅ RM Login (partial - needs password reset)
2. ✅ Dashboard & Customer List (needs RM-specific filtering)
3. ✅ Personal Information Capture
4. ✅ Employment/Income Details (minor enhancement)
5. ✅ Document Upload (mobile camera needs app)
6. ✅ CIBIL Check
7. ✅ Application Review & Submission (needs completeness check)
8. ✅ Notifications & Status Tracking (needs push device registration)

**What's Needed:**
- Add RM role to auth service
- Filter applications by `assigned_to=RM_ID`
- Configure push notification device registration
- RM-specific dashboard endpoint

---

### ❌ Needs Fresh Development (40% of requirements)

**High Priority Backend:**
1. ❌ **Bank Account Verification** (penny drop + name match)
2. ❌ **Property Details Fields** (add to application schema)
3. ❌ **Password Reset with OTP**
4. ❌ **Application Completeness Validation**
5. ❌ **RM Assignment Workflow**
6. ❌ **RM Dashboard API** (stats, metrics)

**Medium Priority Backend:**
7. ❌ **Login Attempt Lockout**
8. ❌ **Project Finance/APF Integration**
9. ❌ **Other Income Sources Field**

**Mobile App Development:**
10. ❌ **Complete React Native/Flutter App**
11. ❌ **Offline Mode (SQLite + Sync)**
12. ❌ **Camera/Gallery Integration**
13. ❌ **Push Notification Setup (FCM/APNS)**
14. ❌ **Mobile-Optimized UI/UX**

---

## Recommended Development Phases

### Phase 1: Backend Enhancements (2-3 weeks)
1. Add property details fields to applications
2. Implement bank account verification (penny drop)
3. Add password reset with OTP
4. Implement application completeness validation
5. Add RM assignment workflow
6. Create RM dashboard API

### Phase 2: Mobile App MVP (4-6 weeks)
1. React Native/Flutter setup
2. Authentication screens (login, OTP)
3. Dashboard with application list
4. Lead capture forms (personal, employment, loan details)
5. Document upload with camera
6. KYC verification integration
7. Application submission

### Phase 3: Mobile App Advanced (2-3 weeks)
1. Offline mode with SQLite
2. Push notifications
3. Status tracking timeline
4. Enhanced UI/UX

### Phase 4: Integrations (1-2 weeks)
1. Project Finance/APF integration
2. Enhanced bank verification
3. Additional income sources

---

## Detailed Requirement Mapping

### Page-by-Page Analysis

**Page 1-2: Objective & Scope** ✅
- Lead data collection → **Leads service available**
- KYC integration → **Integration hub available**
- Banking verification → **Need to develop**
- Credit verification → **CIBIL adapter available**
- Submit to LOS → **Application service available**

**Page 3: Target Users** ✅
- RM access → **Need RM role**
- Sales Manager monitoring → **Reporting service available**
- System Admin → **Auth service available**

**Page 4-5: Modules Overview** ✅
- Most modules have backend support
- Mobile app needs to be built

**Page 6-9: Detailed Specifications** (See tables above)

---

## Conclusion

**Good News**: ~60% of backend functionality is already implemented!
- Most APIs exist and work
- Integration adapters are ready
- Data models support the requirements

**What's Needed**:
1. **Backend Enhancements** (2-3 weeks): Bank verification, property fields, completeness checks
2. **Mobile App** (6-9 weeks): Complete React Native/Flutter application
3. **Access Control** (1 week): RM roles and permissions configuration

**Estimated Total Development Time**: 9-13 weeks for complete RM Mobile App

