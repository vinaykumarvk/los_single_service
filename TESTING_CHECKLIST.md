# Testing Checklist for RM Module

## Pre-Testing Setup

### 1. Environment Variables
- [ ] Check if `.env` files exist for services
- [ ] Verify `DATABASE_URL` is set correctly
- [ ] Ensure frontend environment variables are configured

### 2. Infrastructure
- [ ] PostgreSQL database is running
- [ ] Docker services (if using): Postgres, Redpanda, MinIO, Keycloak
- [ ] All backend services can start

### 3. Database
- [ ] Migrations are run
- [ ] Seed data is populated (optional, for testing)

## Frontend Testing

### RM Module Routes
- [ ] `/rm` - Dashboard loads
- [ ] `/rm/applications` - Applications list loads
- [ ] `/rm/applications/:id/personal` - Personal Information form
- [ ] `/rm/applications/:id/employment` - Employment form
- [ ] `/rm/applications/:id/loan-property` - Loan & Property form
- [ ] `/rm/applications/:id/documents` - Document upload
- [ ] `/rm/applications/:id/bank` - Bank verification
- [ ] `/rm/applications/:id/cibil` - CIBIL check
- [ ] `/rm/applications/:id/review` - Application review

### Form Validation
- [ ] Personal Information form validation works
- [ ] Employment form validation works
- [ ] Loan & Property form validation works
- [ ] Error messages display correctly

### API Integration
- [ ] Create new application
- [ ] Update applicant information
- [ ] Upload documents
- [ ] PAN validation (with fallback)
- [ ] Aadhaar eKYC flow (with fallback)
- [ ] Bank verification (name + penny drop with fallback)
- [ ] CIBIL check (with fallback)
- [ ] Submit application for verification

### Navigation Flow
- [ ] Can navigate between steps
- [ ] Back buttons work correctly
- [ ] Save as draft functionality
- [ ] Continue/Skip buttons work

## Backend Testing

### Service Health
- [ ] API Gateway responds
- [ ] Application service responds
- [ ] Auth service responds
- [ ] Integration Hub responds
- [ ] Masters service responds

### API Endpoints
- [ ] `POST /api/auth/login` - Login works
- [ ] `GET /api/applications`` - List applications
- [ ] `POST /api/applications` - Create application
- [ ] `PUT /api/applications/:id/applicant` - Update applicant
- [ ] `POST /api/applications/:id/submit-for-verification` - Submit application

## Integration Testing

### Complete Workflow
1. [ ] RM logs in
2. [ ] Creates new application
3. [ ] Fills personal information
4. [ ] Fills employment details
5. [ ] Fills loan & property details
6. [ ] Uploads documents
7. [ ] Verifies bank account
8. [ ] Pulls CIBIL report
9. [ ] Reviews application
10. [ ] Submits for verification

### Error Scenarios
- [ ] Invalid form data shows errors
- [ ] API errors are handled gracefully
- [ ] Network errors show appropriate messages
- [ ] Fallback integrations work when API keys are missing

## Browser Testing

### Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile responsive (if applicable)

### Performance
- [ ] Pages load in reasonable time
- [ ] No console errors
- [ ] No memory leaks

