# Test Data Quick Reference

Quick reference for testing the application with seed data.

## 🔐 Authentication

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Roles**: `admin`, `maker`, `checker`
- **Endpoint**: `POST /api/auth/login`

## 📊 Masters Service Test Data

### Rate Matrices
```
Product: HOME_LOAN_V1
- Floating: 8.50% (Branch, Online, MobileApp)
- Fixed: 8.75% (Branch only)
- Hybrid: 8.60% (Branch, Online)

Product: PERSONAL_LOAN_V1
- Floating: 12.50% (All channels)
- Fixed: 13.00% (Branch, Online)
```

### Charges
- **PROC_FEE_HOME**: 0.50% (min ₹5,000, max ₹50,000)
- **PROC_FEE_PERSONAL**: Fixed ₹2,500
- **DOC_FEE_HOME**: Fixed ₹10,000
- **STAMP_DUTY**: 0.10%
- **LEGAL_FEE**: Fixed ₹15,000

### Sample Branches
- **HO_MUM**: Head Office - Mumbai
- **BR_MUM_001**: Mumbai - Andheri
- **BR_DEL_001**: Delhi - Connaught Place
- **RO_BLR**: Regional Office - Bangalore
- **BR_BLR_001**: Bangalore - Whitefield
- **BR_CHN_001**: Chennai - T Nagar

### Sample Roles
- **SALES_EXEC**: Sales Executive
- **UNDERWRITER**: Underwriter
- **VERIFIER**: Verification Officer
- **BRANCH_MANAGER**: Branch Manager
- And 4 more...

## 📋 Leads Service Test Data

### Agencies
- **DSA_001**: Prime Financial Services (Mumbai) - ✅ Approved
- **DSA_002**: FastTrack Loans (Bangalore) - ✅ Approved
- **DSA_003**: Credit Connect (Delhi) - ⏳ Pending

### Leads Distribution
- **New**: ~12 leads
- **Contacted**: ~12 leads
- **Qualified**: ~12 leads
- **Converted**: ~12 leads (can test conversion workflow)
- **Rejected**: ~12 leads
- **Lost**: ~15 leads

### Sample Lead Channels
- Website, MobileApp, DSA, Branch, CallCenter

## 🧪 Testing Scenarios

### 1. Rate & Charge Calculation
```bash
# Get rates for HOME_LOAN_V1
GET /api/masters/rates?productCode=HOME_LOAN_V1

# Get charges for HOME_LOAN_V1
GET /api/masters/charges?productCode=HOME_LOAN_V1
```

### 2. Document Checklist
```bash
# Get required documents for HOME_LOAN_V1
GET /api/masters/documents?productCode=HOME_LOAN_V1
```

### 3. Lead Conversion
```bash
# Get a qualified lead
GET /api/leads?status=Qualified

# Convert lead to application
POST /api/leads/{leadId}/convert
Body: { "applicationId": "new-application-uuid" }
```

### 4. Agency/Agent Approval (Maker-Checker)
```bash
# Get pending agencies
GET /api/leads/agencies?validationStatus=Pending

# Approve agency (requires checker role)
PATCH /api/leads/agencies/{agencyId}/validate
Body: { "validationStatus": "Approved" }
```

### 5. Rule Approval Workflow
```bash
# Get draft rules
GET /api/masters/rules?approvalStatus=Draft

# Submit rule for approval (maker)
PATCH /api/masters/rules/{ruleId}/submit

# Approve rule (checker)
PATCH /api/masters/rules/{ruleId}/approve
```

### 6. Application Workflow
```bash
# Update applicant info
PUT /api/applications/{id}/applicant
Body: { "firstName": "John", "lastName": "Doe", ... }

# Submit for verification
POST /api/applications/{id}/submit-for-verification
```

## 📝 Sample API Requests

### Login
```bash
curl -X POST http://localhost:3000/auth/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Create Lead
```bash
curl -X POST http://localhost:3000/leads/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "sourceChannel": "Website",
    "firstName": "Test",
    "lastName": "User",
    "mobile": "9876543210",
    "email": "test@example.com",
    "requestedProductCode": "HOME_LOAN_V1",
    "requestedAmount": 5000000
  }'
```

### Get Rates
```bash
curl http://localhost:3000/api/masters/rates?productCode=HOME_LOAN_V1 \
  -H "Authorization: Bearer <token>"
```

### Get Branches
```bash
curl http://localhost:3000/api/masters/branches?city=Mumbai \
  -H "Authorization: Bearer <token>"
```

## 🎯 Key Test Cases

1. ✅ **Rate Selection**: Test rate selection based on product, channel, state
2. ✅ **Charge Calculation**: Test fixed vs percentage charge calculation
3. ✅ **Lead Conversion**: Convert a qualified lead to application
4. ✅ **Maker-Checker**: Submit and approve rules/agencies
5. ✅ **Document Checklist**: Verify required documents per product
6. ✅ **Agent Assignment**: Assign leads to approved agents
7. ✅ **Branch Lookup**: Find branches by city/state
8. ✅ **Rule Engine**: Create, submit, and approve rules

## 💡 Tips

- Use **approved agencies** (DSA_001, DSA_002) for agent-related tests
- Use **qualified leads** for conversion workflow tests
- Use **draft rules** for maker-checker workflow tests
- All **charges** are active from 2024-01-01
- All **rates** are active from 2024-01-01

## 🚀 Ready to Test!

All seed data is in place. Start your services and begin testing!

```bash
pnpm -w --parallel run dev
```

