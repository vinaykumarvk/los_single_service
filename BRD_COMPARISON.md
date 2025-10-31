# BRD vs Implementation Comparison Report

**Generated**: Based on codebase analysis and STATUS.md  
**Reference**: LoS.docx (BRD)  
**Status**: Detailed feature-by-feature comparison

---

## 1. SCOPE & OBJECTIVES

### ✅ COMPLETED
- ✅ Microservices architecture (15 services)
- ✅ Monorepo structure (pnpm workspaces)
- ✅ Event-driven communication (Kafka/outbox pattern)
- ✅ API Gateway/BFF for unified entry point
- ✅ Modular, independent services

### ⚠️ PARTIAL
- ⚠️ Complete production deployment (local dev ready, K8s/cloud pending)

---

## 2. STAKEHOLDERS & USER ROLES

### ✅ COMPLETED
- ✅ Keycloak realm with roles (applicant, sales, maker, checker, ops, risk, admin, pii:read)
- ✅ Role-based PII masking in gateway
- ✅ JWT authentication middleware

### ⚠️ PARTIAL
- ⚠️ Role-based UI access control (AuthGuard exists but optional)
- ⚠️ Fine-grained RBAC per endpoint (basic JWT validation only)

---

## 3. MODULE-BY-MODULE REQUIREMENTS

### 3.1 Application Management

#### ✅ COMPLETED
- ✅ Create application (POST `/api/applications`)
  - Channel validation (Branch, DSA, Online, Mobile)
  - Product code validation
  - Amount and tenure validation
  - UUID-based IDs
- ✅ Get application (GET `/api/applications/:id`)
- ✅ Submit application (POST `/api/applications/:id/submit`)
- ✅ Status tracking (Draft → Submitted → ...)
- ✅ Database persistence with transactions
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Application search/filter endpoints (list all)
- ❌ Application update/edit (only create/submit)
- ❌ Application withdrawal/cancellation
- ❌ Bulk operations
- ❌ Application history/audit trail (basic audit exists, but not per-application timeline)

### 3.2 Customer & KYC Management

#### ✅ COMPLETED
- ✅ Applicant upsert (PUT `/api/applicants/:id`)
  - PAN, Aadhaar (masked), mobile, email, DOB
  - Partial update support (COALESCE in SQL)
- ✅ Consent capture (POST `/api/applicants/:id/consent`)
- ✅ KYC start (POST `/api/kyc/:applicationId/start`)
- ✅ Database schema with KYC status tracking
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ eKYC provider integration (mock only)
- ❌ CKYC (Central KYC) integration
- ❌ Aadhaar eKYC (Aadhaar OTP/XML verification)
- ❌ Video KYC workflow
- ❌ KYC status query endpoints
- ❌ KYC rejection/rework flow
- ❌ Consent expiry tracking
- ❌ Multiple consent types (only "KYC" purpose implemented)

### 3.3 Document Management

#### ✅ COMPLETED
- ✅ Document upload (POST `/api/applications/:id/documents`)
  - Multipart file upload
  - File type validation (PDF, JPG, PNG)
  - File size validation (15MB limit)
  - SHA-256 hash generation
  - MinIO/S3 integration (upload to object storage)
- ✅ Document verification (PATCH `/api/documents/:docId/verify`)
  - Status update with remarks
- ✅ Document list (GET `/api/applications/:id/documents`)
- ✅ Presigned download URL (GET `/api/documents/:docId/download`)
- ✅ Database schema with status tracking
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Document checklist validation (per product)
- ❌ OCR/metadata extraction
- ❌ Document expiry tracking
- ❌ Document rejection workflow
- ❌ Bulk document upload
- ❌ Document versioning
- ❌ Document type-specific validation rules
- ⚠️ MinIO integration complete (upload/download works)

### 3.4 Masters & Configuration

#### ✅ COMPLETED
- ✅ Products table with seed data (HOME_LOAN_V1, PERSONAL_LOAN_V1)
  - min_amount, max_amount, min_tenure, max_tenure, max_foir, age_at_maturity_limit
- ✅ Document checklist table (per product)
- ✅ Products endpoint (GET `/api/products`)
- ✅ Seed SQL script

#### ❌ MISSING / PARTIAL
- ❌ Dynamic product configuration (CRUD)
- ❌ Rate masters (interest rates per product)
- ❌ Fee configuration masters
- ❌ Channel-specific configurations
- ❌ Geographic masters (states, cities, PIN codes)
- ❌ Bank/IFSC masters

### 3.5 Underwriting / Business Rules Engine (BRE)

#### ✅ COMPLETED
- ✅ FOIR (Fixed Obligations to Income Ratio) calculation
  - Formula: (existingEmi + proposedEmi) / monthlyIncome ≤ maxFOIR
- ✅ LTV (Loan-to-Value) calculation
  - Formula: proposedAmount / propertyValue ≤ maxLTV
- ✅ Age at Maturity validation
  - Formula: applicantAgeYears + tenureMonths / 12 ≤ maxAgeAtMaturity
- ✅ EMI calculation
  - Formula: `principal * r * (1+r)^n / ((1+r)^n - 1)` where r = annualRate/12/100
- ✅ Decision engine
  - AUTO_APPROVE (all rules pass)
  - REFER (1 rule fails)
  - DECLINE (2+ rules fail)
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Credit score integration (bureau score not used in decision)
- ❌ Override workflow (maker-checker for manual approval)
- ❌ Rule configuration (rules are hardcoded, not configurable)
- ❌ Multiple rule sets (only FOIR/LTV/Age implemented)
- ❌ DTI (Debt-to-Income) alternative
- ❌ Policy engine (if-then rules, business policy management)
- ❌ Risk scoring algorithms
- ❌ Rejection reason codes/categories

### 3.6 Sanction & Offer Management

#### ✅ COMPLETED
- ✅ Issue sanction (POST `/api/applications/:id/sanction`)
  - EMI calculation
  - Offer URL generation
  - Valid till date (30 days default)
- ✅ Accept offer (POST `/api/applications/:id/offer/accept`)
  - Status validation (must be ISSUED)
  - Status update to ACCEPTED
- ✅ Database schema with status tracking
- ✅ Events: SanctionIssued, OfferGenerated, OfferAccepted
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Offer expiry handling (validTill tracked but not enforced)
- ❌ Offer regeneration
- ❌ Sanction modification
- ❌ Multiple offer variants
- ❌ Offer rejection workflow
- ❌ Offer acceptance confirmation notification

### 3.7 Payment Processing

#### ✅ COMPLETED
- ✅ Fee calculation (POST `/api/applications/:id/fees/calculate`)
  - Percentage-based
  - Fixed amount
  - Minimum fee handling
  - Slab-based (structure exists)
- ✅ Payment capture (POST `/api/applications/:id/fees/capture`)
  - Provider reference storage
- ✅ Database schema
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Payment gateway integration (mock only)
- ❌ Payment status tracking (multiple statuses)
- ❌ Refund processing
- ❌ Payment history
- ❌ Payment retry mechanism
- ❌ Payment webhooks from gateway

### 3.8 Disbursement

#### ✅ COMPLETED
- ✅ Disbursement request (POST `/api/applications/:id/disburse`)
  - Idempotency via Idempotency-Key header
  - Unique index on idempotency_key
- ✅ CBS webhook handler (POST `/webhooks/cbs`)
  - HMAC signature verification
  - Status update (DISBURSED/FAILED)
  - CBS reference storage
- ✅ Database schema with status tracking
- ✅ OpenAPI specification

#### ❌ MISSING / PARTIAL
- ❌ Real CBS/LMS integration (mock webhook only)
- ❌ Disbursement scheduling
- ❌ Partial disbursement
- ❌ Disbursement reversal
- ❌ Disbursement status query endpoints

### 3.9 Bureau Integration

#### ✅ COMPLETED
- ✅ Bureau pull request (POST `/api/applications/:id/bureau/pull`)
- ✅ Bureau webhook handler (POST `/webhooks/bureau`)
  - Report normalization
  - Score tracking
  - Report storage
- ✅ Database schema (bureau_requests, bureau_reports)
- ✅ Events: BureauPullRequested, BureauReportReceived

#### ❌ MISSING / PARTIAL
- ❌ Real bureau provider integration (CIBIL/Experian/Equifax)
- ❌ Multiple bureau support (only one mock)
- ❌ Bureau report parsing (full CIR/Credit Report parsing)
- ❌ Score calculation from report (mock score generation)
- ❌ Bureau dispute handling

### 3.10 Verification Service

#### ✅ COMPLETED
- ✅ Verification task creation (POST `/api/verification/tasks`)
  - Types: PAN, Aadhaar, Penny-drop, Manual (FI, PD, TVR)
- ✅ Auto-verify (simulated for PAN/Aadhaar/Penny-drop)
- ✅ Manual verification completion (PATCH `/api/verification/tasks/:id/complete`)
- ✅ Database schema with status tracking
- ✅ Events: VerificationTaskCreated, VerificationCompleted

#### ❌ MISSING / PARTIAL
- ❌ Real PAN validation (Integration Hub mock only)
- ❌ Real Aadhaar verification
- ❌ Real Penny-drop API integration
- ❌ Verification queue management
- ❌ SLA tracking for verification
- ❌ Verification escalation workflow

### 3.11 Integration Hub

#### ✅ COMPLETED
- ✅ PAN validation endpoint (mock)
- ✅ eKYC start endpoint (mock)
- ✅ Bureau pull endpoint (mock)
- ✅ Signed webhooks (HMAC verification)
  - Bureau callback
  - eSign callback
  - CBS callback

#### ❌ MISSING / PARTIAL
- ❌ Real eKYC provider adapter (NSDL/Aadhaar XML)
- ❌ Real bureau adapter (CIBIL API)
- ❌ Real eSign adapter (DigiLocker/NSDL)
- ❌ Real payment gateway adapter
- ❌ Integration provider abstraction layer
- ❌ Retry and circuit breaker per provider

### 3.12 Orchestrator / Saga

#### ✅ COMPLETED
- ✅ Saga state machine (HTTP-based dev endpoint)
- ✅ Application lifecycle coordination
- ✅ Database schema (saga_instances, saga_logs)
- ✅ Kafka consumer (optional)

#### ❌ MISSING / PARTIAL
- ❌ Compensation logic (rollback on failures)
- ❌ Timeout handling
- ❌ Automatic retry mechanism
- ❌ Saga visualization/monitoring
- ❌ Long-running saga support
- ⚠️ Basic state machine exists but production-ready orchestration pending

### 3.13 Notifications

#### ✅ COMPLETED
- ✅ Send notification endpoint (POST `/api/notifications/send`)
  - Email/SMS/Push stub implementations
  - Template support structure

#### ❌ MISSING / PARTIAL
- ❌ Real email provider (SMTP/SendGrid/Mailgun)
- ❌ Real SMS provider (Twilio/TextLocal)
- ❌ Push notification service (FCM/APNS)
- ❌ Notification delivery status tracking
- ❌ Notification preferences management
- ❌ Template engine (dynamic content)

### 3.14 Audit & Compliance

#### ✅ COMPLETED
- ✅ Append-only audit log (POST `/api/audit`)
- ✅ Consent ledger
- ✅ Query endpoint (GET `/api/audit`)
- ✅ Database schema with indexes
- ✅ Aggregate-based querying

#### ❌ MISSING / PARTIAL
- ❌ Audit log retention policies
- ❌ Audit export/archive
- ❌ Compliance reporting (GDPR, RBI)
- ❌ Data anonymization for old records
- ❌ Audit log encryption

### 3.15 Reporting & Analytics

#### ✅ COMPLETED
- ✅ Pipeline dashboard endpoint (GET `/api/reporting/pipeline`)
- ✅ TAT (Turnaround Time) endpoint
- ✅ Placeholder data structure

#### ❌ MISSING / PARTIAL
- ❌ Real analytics queries (actual data aggregation)
- ❌ Export to Excel/CSV
- ❌ Scheduled reports
- ❌ Custom report builder
- ❌ Dashboard widgets (UI has charts, but backend aggregates missing)
- ❌ Performance metrics (conversion rates, drop-off points)

---

## 4. BUSINESS RULES

### ✅ COMPLETED
- ✅ FOIR ≤ product.maxFOIR
- ✅ LTV ≤ product.maxLTV (if property value provided)
- ✅ Age at maturity ≤ product.maxAgeAtMaturity
- ✅ Minimum applicant age (18 years, enforced in validation)
- ✅ EMI calculation formula (as per BRD Appendix A)
- ✅ Idempotency for disbursement (via header)
- ✅ Document file type validation (PDF, JPG, PNG)
- ✅ Document size limit (15MB)

### ❌ MISSING / PARTIAL
- ❌ Product-specific minimum/maximum amounts (stored but not enforced in API)
- ❌ Tenure limits per product (stored but not enforced)
- ❌ Channel-specific rules
- ❌ Geographic restrictions
- ❌ Blacklist/whitelist checks
- ❌ Policy-based overrides
- ❌ Business holiday calendar
- ❌ Working hours restrictions

---

## 5. USER STORIES

### ✅ COMPLETED
- ✅ As a sales agent, I can create a loan application
- ✅ As an applicant, I can provide my KYC details
- ✅ As a maker, I can upload documents
- ✅ As a checker, I can verify documents
- ✅ As an underwriter, I can run underwriting rules
- ✅ As a sanction officer, I can issue sanction
- ✅ As a customer, I can accept offer (via API)
- ✅ As ops, I can capture payment
- ✅ As ops, I can request disbursement
- ✅ As admin, I can view audit logs

### ⚠️ PARTIAL
- ⚠️ As a customer, I can view my application status (API exists, UI has detail page)
- ⚠️ As a sales agent, I can search applications (API missing)
- ⚠️ As a maker, I can submit for approval (submit exists, but approval workflow missing)

---

## 6. DATA FIELDS

### Application Entity

#### ✅ COMPLETED
- application_id (UUID)
- applicant_id (UUID)
- channel (enum)
- product_code (string)
- requested_amount (numeric)
- requested_tenure_months (integer)
- status (text)
- created_at, updated_at (timestamps)

#### ❌ MISSING
- ❌ co_applicant_id
- ❌ referral_code
- ❌ campaign_id
- ❌ assigned_to (maker/checker)
- ❌ rejection_reason
- ❌ approved_by
- ❌ approved_at

### Applicant Entity

#### ✅ COMPLETED
- applicant_id (UUID)
- first_name, last_name
- dob (date)
- mobile, email
- pan, aadhaar_masked
- kyc_status
- created_at, updated_at

#### ❌ MISSING
- ❌ middle_name
- ❌ gender
- ❌ father_name, mother_name
- ❌ marital_status
- ❌ address fields (line1, line2, city, state, pincode)
- ❌ occupation
- ❌ employment_details
- ❌ income details (structured)

### Document Entity

#### ✅ COMPLETED
- doc_id (UUID)
- application_id (UUID)
- doc_type (text)
- file_name, file_type, size_bytes
- hash (SHA-256)
- status
- object_key (S3/MinIO)
- created_at

#### ❌ MISSING
- ❌ expiry_date
- ❌ verified_by
- ❌ verified_at
- ❌ rejection_reason
- ❌ version

---

## 7. INTEGRATIONS

### ✅ IMPLEMENTED (Mock/Stub)
- ✅ PAN validation (mock regex)
- ✅ eKYC start (mock session)
- ✅ Bureau pull (mock request)
- ✅ Webhook signature verification (HMAC)

### ❌ NOT IMPLEMENTED (Real Providers)
- ❌ eKYC provider (NSDL, Aadhaar XML, CKYC)
- ❌ Bureau provider (CIBIL, Experian, Equifax)
- ❌ eSign provider (DigiLocker, NSDL eSign)
- ❌ Payment gateway (Razorpay, PayU, etc.)
- ❌ CBS/LMS integration (core banking system)
- ❌ SMS provider (Twilio, TextLocal)
- ❌ Email provider (SendGrid, Mailgun)

---

## 8. SECURITY REQUIREMENTS

### ✅ COMPLETED
- ✅ JWT authentication (Keycloak integration)
- ✅ Role-based PII masking (PAN, Aadhaar, beneficiaryAccount)
- ✅ HMAC webhook signature verification
- ✅ HTTPS-ready (gateway configurable)
- ✅ Correlation IDs for tracing

### ❌ MISSING / PARTIAL
- ❌ Encryption at rest for PII fields
- ❌ Field-level encryption (PAN, Aadhaar)
- ❌ Secrets management (Vault/AWS Secrets Manager)
- ❌ Rate limiting (basic in gateway, not per-endpoint)
- ❌ Request size limits (basic, not configurable)
- ❌ CORS policy configuration
- ❌ IP whitelisting
- ❌ API key authentication (alternative to JWT)
- ❌ Audit trail for authentication failures

---

## 9. NON-FUNCTIONAL REQUIREMENTS

### Performance

#### ✅ COMPLETED
- ✅ Database connection pooling (pg Pool)
- ✅ Efficient queries (indexed columns)

#### ❌ MISSING
- ❌ Caching (Redis) for masters/static data
- ❌ Query pagination (list endpoints missing)
- ❌ Async processing queues (heavy operations)
- ❌ CDN for static assets

### Scalability

#### ✅ COMPLETED
- ✅ Stateless services (REST APIs)
- ✅ Database per service pattern (shared DB for now, but schemas separated)

#### ❌ MISSING
- ❌ Horizontal scaling config (K8s HPA)
- ❌ Load balancer configuration
- ❌ Database read replicas

### Reliability

#### ✅ COMPLETED
- ✅ Transactional outbox pattern (guaranteed event delivery)
- ✅ Database transactions (ACID)
- ✅ Idempotency (disbursement)

#### ❌ MISSING
- ❌ Circuit breakers (stub exists)
- ❌ Dead letter queues (Kafka DLQ)
- ❌ Retry policies with backoff
- ❌ Health checks with dependencies
- ❌ Graceful shutdown

### Observability

#### ✅ COMPLETED
- ✅ JSON logging with correlation IDs
- ✅ Health endpoints (`/health`)
- ✅ Prometheus metrics (`/metrics`) - gateway and application service
- ✅ Basic tracing shim (OpenTelemetry placeholder)

#### ❌ MISSING
- ❌ Distributed tracing (OpenTelemetry SDK)
- ❌ Grafana dashboards
- ❌ Alerting rules (Prometheus alerts)
- ❌ Log aggregation (ELK/Loki)
- ❌ Error tracking (Sentry/DataDog)

### Maintainability

#### ✅ COMPLETED
- ✅ TypeScript for type safety
- ✅ OpenAPI specifications
- ✅ Monorepo structure
- ✅ Shared libraries
- ✅ Documentation (READMEs)

#### ❌ MISSING
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests
- ❌ Contract tests (event schemas validation)

---

## 10. UI/Frontend

### ✅ COMPLETED
- ✅ React application (TypeScript)
- ✅ Routing (React Router)
- ✅ Dashboard with KPIs and charts
- ✅ Application creation form
- ✅ Application detail page
- ✅ KYC upsert page
- ✅ Document upload page
- ✅ Underwriting review page
- ✅ Sanction & Offer page
- ✅ Payment page
- ✅ Disbursement page
- ✅ Keycloak OIDC login integration
- ✅ Form validation (React Hook Form + Zod)
- ✅ Responsive design (Tailwind CSS)

### ⚠️ PARTIAL
- ⚠️ Applications list page (placeholder)
- ⚠️ Role-based views (AuthGuard optional)
- ⚠️ Real-time updates (no WebSocket/SSE)

---

## 11. INFRASTRUCTURE & DEVOPS

### ✅ COMPLETED
- ✅ Docker Compose for local dev
- ✅ Database migrations (SQL-based runner)
- ✅ Makefile shortcuts
- ✅ GitHub Actions CI (build, test, Docker build)
- ✅ Dockerfiles (gateway, application, customer-kyc, document)
- ✅ Environment variable configuration

### ❌ MISSING
- ❌ Kubernetes manifests
- ❌ Helm charts
- ❌ Production Docker Compose
- ❌ Secrets management integration
- ❌ CI/CD pipelines (deployment)
- ❌ Blue-green/canary deployment configs

---

## 12. TESTING

### ❌ NOT STARTED
- ❌ Unit tests (0% coverage)
- ❌ Integration tests
- ❌ E2E tests
- ❌ Contract tests (event schema validation)
- ❌ Load tests
- ❌ Security tests

---

## SUMMARY STATISTICS

### Overall Completion by Category

| Category | Status | Completion |
|----------|--------|------------|
| **Core Services** | ✅ | 100% (15/15 services) |
| **Business Logic** | ✅ | ~85% (FOIR/LTV/Age/EMI done, missing override/policy) |
| **Data Persistence** | ✅ | ~90% (core services have DB, some missing fields) |
| **Integrations** | ⚠️ | ~20% (mock only, no real providers) |
| **Security** | ⚠️ | ~60% (JWT/masking done, encryption/secrets missing) |
| **UI/Frontend** | ✅ | ~95% (all pages built, some features pending) |
| **Testing** | ❌ | 0% |
| **Observability** | ⚠️ | ~40% (logging/metrics basic, tracing/dashboards missing) |
| **DevOps/Infra** | ⚠️ | ~70% (local dev ready, K8s/cloud pending) |
| **Documentation** | ✅ | ~85% (READMEs/OpenAPI done, runbooks missing) |

### Feature Coverage

- **API Endpoints**: ~75% of required endpoints implemented
- **Business Rules**: ~70% implemented (core rules done, advanced missing)
- **Data Fields**: ~80% of required fields present
- **Events**: ~90% of required events defined and emitted
- **Integrations**: ~20% (all mocks)

### Critical Gaps

1. **Real External Integrations** (CIBIL, eKYC, eSign, Payment Gateway)
2. **Testing Suite** (0% coverage)
3. **Production Observability** (tracing, dashboards, alerts)
4. **Security Hardening** (encryption, secrets management)
5. **Advanced Business Rules** (policy engine, override workflow)
6. **Complete Data Fields** (address, employment, co-applicant)
7. **K8s/Cloud Deployment** (local only)

---

## RECOMMENDATIONS

### Priority 1 (Critical for Production)
1. Add comprehensive testing (unit + integration + E2E)
2. Integrate real external providers (start with one bureau, one eKYC)
3. Implement encryption at rest for PII
4. Add distributed tracing and Grafana dashboards
5. Complete missing data fields (address, employment)

### Priority 2 (Important for Full Feature Set)
6. Implement override workflow (maker-checker)
7. Add application search/list endpoints
8. Implement payment gateway integration
9. Add notification providers (email/SMS)
10. Build K8s manifests and Helm charts

### Priority 3 (Enhancements)
11. Policy engine for configurable business rules
12. Advanced reporting and analytics
13. Document OCR/metadata extraction
14. Application history/audit timeline
15. Bulk operations

---

**Overall Assessment**: Core system is **~80% complete** with all essential services functional. Main gaps are real integrations, testing, and production hardening. The foundation is solid and ready for iterative enhancement.

