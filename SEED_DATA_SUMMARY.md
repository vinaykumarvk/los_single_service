# Seed Data Summary

## Overview
Seed data has been populated for all new services to enable comprehensive testing.

## Masters Service Data

### Rate Matrices (5 entries)
- **HOME_LOAN_V1**: Floating (8.50%), Fixed (8.75%), Hybrid (8.60%)
- **PERSONAL_LOAN_V1**: Floating (12.50%), Fixed (13.00%)
- All with effective dating from 2024-01-01
- Various channel and state restrictions

### Charges (5 entries)
- **PROC_FEE_HOME**: 0.50% processing fee (min ₹5,000, max ₹50,000)
- **PROC_FEE_PERSONAL**: Fixed ₹2,500 processing fee
- **DOC_FEE_HOME**: Fixed ₹10,000 documentation fee
- **STAMP_DUTY**: 0.10% stamp duty
- **LEGAL_FEE**: Fixed ₹15,000 legal fee

### Document Master (12 entries)
**Identity Documents:**
- PAN Card (mandatory)
- Aadhaar Card (mandatory)
- Driving License (optional)
- Voter ID (optional)

**Address Documents:**
- Aadhaar Address Proof (mandatory for home loans)
- Utility Bill (optional, 90-day validity)

**Income Documents:**
- Salary Slip - Last 3 months (mandatory)
- Bank Statement - Last 6 months (mandatory)
- ITR - Last 2 years (optional)
- Form 16 (optional)

**Property Documents:**
- Property Documents/Title Deed (mandatory for home loans)
- Property Plan/Approval (optional)

### Branches (6 entries)
1. **HO_MUM**: Head Office - Mumbai (Nariman Point)
2. **BR_MUM_001**: Mumbai - Andheri Branch
3. **BR_DEL_001**: Delhi - Connaught Place Branch
4. **RO_BLR**: Regional Office - Bangalore
5. **BR_BLR_001**: Bangalore - Whitefield Branch
6. **BR_CHN_001**: Chennai - T Nagar Branch

### Roles Master (8 entries)
1. **SALES_EXEC**: Sales Executive
2. **SALES_MANAGER**: Sales Manager
3. **UNDERWRITER**: Underwriter
4. **SENIOR_UNDERWRITER**: Senior Underwriter (with override permissions)
5. **VERIFIER**: Verification Officer
6. **RISK_ANALYST**: Risk Analyst
7. **BRANCH_MANAGER**: Branch Manager
8. **OPS_ADMIN**: Operations Admin

### Rule Store (4 entries - all in Draft status)
1. **MIN_INCOME_HOME**: Minimum Income for Home Loan (0.05% of loan amount)
2. **MAX_FOIR**: Maximum FOIR Limit (40% of monthly income)
3. **MIN_CREDIT_SCORE**: Minimum Credit Score Requirement (650)
4. **AGE_AT_MATURITY**: Age at Maturity Check (max 70 years)

## Leads Service Data

### Agencies (3 entries)
1. **DSA_001**: Prime Financial Services (Mumbai) - Approved
2. **DSA_002**: FastTrack Loans (Bangalore) - Approved
3. **DSA_003**: Credit Connect (Delhi) - Pending approval

### Agents (6 entries)
- 6 agents created, linked to approved agencies
- Mix of Approved and Pending validation status
- Sample agents: Vikram Kumar, Priya Sharma, Raj Singh, etc.

### Leads (75 entries)
- **Channels**: Website, MobileApp, DSA, Branch, CallCenter
- **Products**: HOME_LOAN_V1, PERSONAL_LOAN_V1
- **Status Distribution**:
  - New: ~12 leads
  - Contacted: ~12 leads
  - Qualified: ~12 leads
  - Converted: ~12 leads
  - Rejected: ~12 leads
  - Lost: ~15 leads
- **Assignment**: ~25 leads assigned to agents/agencies
- Requested amounts range from ₹5,00,000 to ₹50,00,000

## Auth Service

### Default Users
The auth service automatically creates a default admin user on startup:
- **Username**: `admin`
- **Password**: `admin123`
- **Roles**: `['admin', 'maker', 'checker']`

Note: Test users with different roles can be created through the API or by updating the seed script with proper bcrypt hashes.

## Testing Scenarios Enabled

### 1. Rate & Charge Calculation
- Test rate selection based on product, channel, state
- Test charge calculation (fixed vs percentage)
- Test effective dating (rates active from 2024-01-01)

### 2. Document Workflow
- Test document checklist per product
- Test mandatory vs optional documents
- Test document validity periods

### 3. Branch Management
- Test branch lookup by city/state
- Test branch assignment
- Test branch hierarchy (HO → RO → Branch)

### 4. Role-Based Access
- Test different role permissions
- Test role-based UI visibility

### 5. Rule Engine
- Test rule creation (Draft status)
- Test rule submission for approval
- Test rule approval/rejection workflow
- Test rule activation

### 6. Lead Management
- Test multi-channel lead capture
- Test lead assignment to agents
- Test lead conversion to applications
- Test agency/agent validation workflow

### 7. Maker-Checker
- Test rule approval workflow
- Test agency approval workflow
- Test agent approval workflow

## Data Verification Queries

```sql
-- Check rate matrices
SELECT product_code, rate_type, interest_rate, effective_from FROM rate_matrices;

-- Check charges
SELECT charge_code, charge_name, charge_type, calculation_method FROM charges;

-- Check branches
SELECT branch_code, branch_name, city, state FROM branches;

-- Check leads by status
SELECT lead_status, COUNT(*) FROM leads GROUP BY lead_status;

-- Check approved agencies
SELECT agency_code, agency_name, validation_status FROM agencies WHERE validation_status = 'Approved';
```

## Next Steps for Testing

1. **Start all services**: All new services should start successfully
2. **Test API endpoints**: Use seed data to test all CRUD operations
3. **Test workflows**: Use leads, agencies, agents for end-to-end testing
4. **Test maker-checker**: Submit rules/agencies for approval
5. **Test integrations**: Use fallback mode for external integrations

