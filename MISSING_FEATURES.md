# Missing Features - Prioritized List

**Generated**: Comprehensive BRD comparison  
**Total Missing**: 47 features  
**Partially Implemented**: 12 features

---

## 🔴 PRIORITY 1: Critical for Production (15 items)

### External Integrations (4)
1. ❌ **CIBIL Bureau Integration** - Real API integration (currently mock)
2. ❌ **eKYC Provider Integration** - NSDL/Aadhaar XML (currently mock)
3. ❌ **eSign Provider Integration** - DigiLocker/NSDL eSign (currently mock)
4. ❌ **Payment Gateway Integration** - Razorpay/PayU (currently mock)

### Testing (3)
5. ❌ **Unit Tests** - Test coverage > 80% (currently 0%)
6. ❌ **Integration Tests** - Service interaction tests
7. ❌ **E2E Tests** - End-to-end workflow tests (Playwright/Cypress)

### Observability (5)
8. ❌ **Distributed Tracing** - Full OpenTelemetry SDK integration
9. ❌ **Grafana Dashboards** - Pre-built dashboards per service
10. ❌ **Prometheus Alerting Rules** - Alertmanager configuration
11. ❌ **Log Aggregation** - ELK/Loki integration
12. ❌ **Error Tracking** - Sentry/DataDog integration

### Security (2)
13. ❌ **Encryption at Rest for All PII** - Encrypt email, mobile, etc. (currently only PAN/Aadhaar)
14. ❌ **Secrets Management** - Vault/AWS Secrets Manager integration

### Business Logic (1)
15. ❌ **Dynamic Rule Configuration Engine** - Configurable business rules (currently hardcoded)

---

## 🟡 PRIORITY 2: Important for Full Feature Set (20 items)

### Application Management (3)
16. ❌ **Application Withdrawal/Cancellation** - POST `/api/applications/:id/withdraw`
17. ❌ **Bulk Operations** - Bulk create/update/delete endpoints
18. ❌ **Application Reassignment** - PATCH `/api/applications/:id/assign` (assign to maker/checker)

### Business Rules (2)
19. ❌ **Product Amount Limits Enforcement** - Enforce min_amount, max_amount per product
20. ❌ **Tenure Limits Enforcement** - Enforce min_tenure, max_tenure per product

### Analytics & Reporting (1)
21. ❌ **Real Analytics Queries** - Replace mock data with actual SQL aggregations

### Payment Processing (1)
22. ❌ **Real Payment Gateway** - Razorpay/PayU integration with webhooks

### Sanction & Offer (1)
23. ❌ **Offer Expiry Enforcement** - Auto-expire offers, prevent acceptance after expiry

### Document Management (1)
24. ❌ **Document OCR/Metadata Extraction** - AWS Textract/Google Vision integration

### KYC Management (1)
25. ❌ **KYC Status Query Endpoints** - GET `/api/kyc/:applicationId/status`

### Bureau Integration (1)
26. ❌ **Full Bureau Report Parsing** - Parse complete CIR, extract account details

### Verification (1)
27. ❌ **Verification Queue Management** - Assign tasks to users, load balancing

### Notifications (1)
28. ❌ **Notification Template Engine** - Dynamic content with variable substitution

### Audit & Compliance (1)
29. ❌ **Audit Export/Archive** - Export audit logs (CSV, JSON)

### UI/Frontend (3)
30. ❌ **Real-time UI Updates** - WebSocket/SSE for live status changes
31. ❌ **Role-based UI Views** - Different UI per role (applicant, maker, checker)
32. ❌ **Advanced Search/Filters** - Multi-field search, saved filters
33. ❌ **Export Functionality** - Export applications to Excel/CSV

### Infrastructure (3)
34. ❌ **Kubernetes Manifests** - K8s deployment configs
35. ❌ **Helm Charts** - Helm chart for easy deployment
36. ❌ **CI/CD Deployment Pipelines** - Automated staging/production deployment

### Reliability (2)
37. ❌ **Circuit Breakers** - Real implementation (Hystrix, Resilience4j)
38. ❌ **Retry Policies with Backoff** - Configurable exponential backoff

---

## 🟢 PRIORITY 3: Enhancements (12 items)

### Sanction & Offer (3)
39. ❌ **Offer Regeneration** - Generate new offer if original expires
40. ❌ **Multiple Offer Variants** - Generate multiple offers with different terms
41. ❌ **Sanction Letter PDF Generation** - Template-based PDF generation

### Document Management (1)
42. ❌ **Document Versioning** - Track document versions when re-uploaded

### KYC Management (1)
43. ❌ **Video KYC Workflow** - Schedule/conduct video KYC sessions

### Payment Processing (1)
44. ❌ **Payment Scheduling** - Schedule future/recurring payments

### Disbursement (1)
45. ❌ **Disbursement Scheduling** - Schedule disbursement for future date

### Reporting (1)
46. ❌ **Custom Report Builder** - User-configurable reports with drag-drop UI

### Business Rules (3)
47. ❌ **Business Holiday Calendar** - No disbursements on holidays
48. ❌ **Geographic Restrictions** - Restrict products by state/city
49. ❌ **Blacklist/Whitelist Checks** - Check against fraud/defaulters list

### Orchestration (1)
50. ❌ **Saga Visualization/Monitoring** - Dashboard to view saga state

### Notifications (1)
51. ❌ **Notification Preferences Management** - User opt-in/opt-out, channel preferences

---

## 📊 SUMMARY BY MODULE

| Module | Missing Features |
|--------|------------------|
| Application Management | 3 |
| Customer & KYC | 1 |
| Document Management | 2 |
| Masters & Configuration | 8 |
| Underwriting | 8 (most are enhancements) |
| Sanction & Offer | 4 |
| Payment Processing | 2 |
| Disbursement | 1 |
| Bureau Integration | 5 |
| Verification | 1 |
| Integration Hub | 6 |
| Orchestrator | 4 |
| Notifications | 2 |
| Audit & Compliance | 1 |
| Reporting & Analytics | 7 |
| Security | 7 |
| Non-Functional (Performance/Scalability/Reliability/Observability) | 12 |
| UI/Frontend | 4 |
| Infrastructure & DevOps | 3 |
| Testing | 3 |

**Total**: 47 unique missing features (some counted in multiple categories)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1 (Weeks 1-2): Critical Production Readiness
- Unit tests (target 70%+ coverage for core services)
- Integration tests (key workflows)
- Encryption at rest for all PII
- Secrets management integration
- Basic observability (tracing + dashboards)

### Phase 2 (Weeks 3-4): Core Feature Completion
- Application withdrawal/cancellation
- Product amount/tenure enforcement
- Real analytics queries
- KYC status endpoints
- Role-based UI views

### Phase 3 (Weeks 5-6): External Integrations
- Payment gateway (Razorpay - start with one)
- Bureau integration (CIBIL - start with one)
- eKYC provider (NSDL - start with one)

### Phase 4 (Weeks 7-8): Enhancement & Polish
- Document OCR
- Notification templates
- Advanced search/filters
- Export functionality
- K8s manifests and Helm charts

---

## 📝 NOTES

- Features marked with ❌ are completely missing
- Features that are partially implemented are noted in the detailed comparison document
- Priority 1 items should be completed before production deployment
- Priority 2 items are important for a complete feature set
- Priority 3 items are nice-to-have enhancements

---

**Next Action**: Start with Priority 1, Item #1 (CIBIL Bureau Integration) or #5 (Unit Tests) depending on team preference.


