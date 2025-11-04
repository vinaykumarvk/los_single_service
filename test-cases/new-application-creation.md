# Comprehensive Test Cases - New Application Creation

## Test Coverage Areas

### 1. Step 1: Loan Details Capture
### 2. Step 2: Personal Information
### 3. Step 3: Employment Details
### 4. Step 4: Property Details
### 5. Step 5: Document Upload
### 6. Step 6: Review & Submission
### 7. Navigation & Flow
### 8. Data Persistence
### 9. Validation & Error Handling
### 10. Status Management

---

## Test Suite 1: Step 1 - Loan Details Capture

### TC-001: Create Application - Valid Home Loan
**Preconditions:** User is logged in as RM
**Steps:**
1. Navigate to `/rm/applications/new`
2. Select "Home Loan" from Loan Type dropdown
3. Enter amount: `500000`
4. Enter tenure: `20` years
5. Select channel: `Mobile`
6. Click "Create Application"
**Expected:**
- Application created successfully
- Application ID format: `HL00001` (or similar)
- Status: `Draft`
- Redirected to `/rm/applications/{id}/personal`
- Toast message: "Application created! Now add personal details."

### TC-002: Create Application - Valid Personal Loan
**Steps:** Similar to TC-001, but select "Personal Loan"
**Expected:** Application ID format: `PL00001`

### TC-003: Create Application - Valid Balance Transfer
**Steps:** Similar to TC-001, but select "Balance Transfer"
**Expected:** Application ID format: `BT00001`

### TC-004: Validation - Missing Loan Type
**Steps:** Leave Loan Type empty, fill other fields, click Create
**Expected:** Error message: "Please select a loan type"

### TC-005: Validation - Amount Below Minimum
**Steps:** Enter amount: `40000` (below ₹50,000)
**Expected:** Error message: "Amount must be between ₹50,000 and ₹5,00,00,000"

### TC-006: Validation - Amount Above Maximum
**Steps:** Enter amount: `60000000` (above ₹5,00,00,000)
**Expected:** Error message: "Amount must be between ₹50,000 and ₹5,00,00,000"

### TC-007: Validation - Tenure Below Minimum
**Steps:** Enter tenure: `0.5` years
**Expected:** Error message: "Tenure must be between 1-30 years"

### TC-008: Validation - Tenure Above Maximum
**Steps:** Enter tenure: `35` years
**Expected:** Error message: "Tenure must be between 1-30 years"

### TC-009: Cancel Button
**Steps:** Fill form, click "Cancel"
**Expected:** Navigate back to `/rm/applications` without creating application

### TC-010: Unauthenticated User
**Preconditions:** User not logged in
**Steps:** Navigate to `/rm/applications/new`
**Expected:** Redirected to `/login` or shown "Please log in" message

---

## Test Suite 2: Step 2 - Personal Information

### TC-011: Save Personal Information - Valid Data
**Preconditions:** Application created (Draft status)
**Steps:**
1. Navigate to `/rm/applications/{id}/personal`
2. Fill all required fields:
   - First Name: `John`
   - Last Name: `Doe`
   - DOB: `1990-01-15` (age > 18)
   - Gender: `Male`
   - Marital Status: `Single`
   - Mobile: `9876543210`
   - Email: `john.doe@example.com`
   - Address Line 1: `123 Main St`
   - PIN: `400001`
   - City: `Mumbai`
   - State: `Maharashtra`
   - PAN: `ABCDE1234F`
3. Click "Save & Continue"
**Expected:**
- Data saved to database
- Navigate to `/rm/applications/{id}/employment`
- Toast message: Success

### TC-012: Validation - First Name Missing
**Steps:** Leave First Name empty
**Expected:** Error: "First name is required"

### TC-013: Validation - First Name Too Short
**Steps:** Enter First Name: `A`
**Expected:** Error: "First name must be at least 2 characters"

### TC-014: Validation - First Name Invalid Characters
**Steps:** Enter First Name: `John123`
**Expected:** Error: "First name must contain only alphabets and spaces"

### TC-015: Validation - DOB Under 18
**Steps:** Enter DOB: `2010-01-15` (age < 18)
**Expected:** Error: "Applicant must be at least 18 years old"

### TC-016: Validation - DOB Future Date
**Steps:** Enter DOB: `2025-12-31`
**Expected:** Error: "Date of birth cannot be in the future"

### TC-017: Validation - Mobile Invalid Format
**Steps:** Enter Mobile: `12345`
**Expected:** Error message about mobile format

### TC-018: Validation - Email Invalid Format
**Steps:** Enter Email: `invalid-email`
**Expected:** Error: "Invalid email format"

### TC-019: Validation - PIN Invalid Format
**Steps:** Enter PIN: `12345` (5 digits)
**Expected:** Error: "PIN code must be exactly 6 digits"

### TC-020: Validation - PAN Invalid Format
**Steps:** Enter PAN: `ABCD1234` (invalid format)
**Expected:** Error: "PAN must be in format ABCDE1234F"

### TC-021: Save as Draft Button
**Steps:** Fill form, click "Save as Draft"
**Expected:** Data saved, no navigation, stays on same page

---

## Test Suite 3: Step 3 - Employment Details

### TC-022: Save Employment - Salaried Employee
**Preconditions:** Personal information saved
**Steps:**
1. Navigate to `/rm/applications/{id}/employment`
2. Select Employment Type: `Salaried`
3. Enter Employer Name: `ABC Corp`
4. Enter Monthly Income: `50000`
5. Enter Years in Job: `5`
6. Click "Save & Continue"
**Expected:**
- Data saved
- Navigate to `/rm/applications/{id}/loan-property`

### TC-023: Save Employment - Self-Employed
**Steps:** Similar to TC-022, but select "Self-employed" and enter Business Name
**Expected:** Data saved correctly

### TC-024: Validation - Monthly Income Below Minimum
**Steps:** Enter Monthly Income: `5000`
**Expected:** Error: "Monthly income must be at least ₹10,000"

### TC-025: Validation - Years in Job Negative
**Steps:** Enter Years in Job: `-1`
**Expected:** Error: "Years in job must be between 0 and 50 years"

### TC-026: Validation - Years in Job Too High
**Steps:** Enter Years in Job: `60`
**Expected:** Error: "Years in job must be between 0 and 50 years"

---

## Test Suite 4: Step 4 - Property Details

### TC-027: Save Property Details - Home Loan
**Preconditions:** Employment details saved, Product Code = HOME_LOAN_V1
**Steps:**
1. Navigate to `/rm/applications/{id}/loan-property`
2. Select Property Type: `Flat`
3. Enter Builder Name: `XYZ Builders`
4. Enter Project Name: `Green Valley`
5. Enter Property Value: `8000000`
6. Enter Property Address: `456 Property St`
7. Enter Property PIN: `400002`
8. Enter Property City: `Mumbai`
9. Enter Property State: `Maharashtra`
10. Click "Save & Continue"
**Expected:**
- Property details saved to `property_details` table
- Data persisted correctly

### TC-028: Validation - Property Value Negative
**Steps:** Enter Property Value: `-100000`
**Expected:** Error: "Property value must be a positive number"

### TC-029: Property Details - Optional Fields
**Steps:** Fill only required fields, leave optional fields empty
**Expected:** Should save successfully

---

## Test Suite 5: Step 5 - Document Upload

### TC-030: Upload Document - PAN Card
**Preconditions:** Application in Draft status
**Steps:**
1. Navigate to `/rm/applications/{id}/documents`
2. Click "Upload" for PAN Card
3. Select a valid PDF/JPEG file (< 5MB)
4. Upload file
**Expected:**
- File uploaded successfully
- Document appears in checklist
- Status updated to "Uploaded"

### TC-031: Upload Document - Invalid File Type
**Steps:** Try to upload `.txt` file
**Expected:** Error: "Invalid file type. Only PDF, JPEG, PNG allowed"

### TC-032: Upload Document - File Too Large
**Steps:** Try to upload file > 5MB
**Expected:** Error: "File size must be less than 5MB"

---

## Test Suite 6: Step 6 - Review & Submission

### TC-033: Review Application - All Complete
**Preconditions:** All steps completed, documents uploaded
**Steps:**
1. Navigate to `/rm/applications/{id}/review`
2. Verify all sections show as complete
3. Click "Submit for Verification"
**Expected:**
- Application status changes to "Submitted"
- Redirected to dashboard or status page
- Toast message: "Application submitted successfully"
- Dashboard refreshes

### TC-034: Review Application - Incomplete
**Preconditions:** Some mandatory sections incomplete
**Steps:** Navigate to review page
**Expected:**
- Incomplete sections highlighted
- "Submit for Verification" button disabled
- Message: "Please complete all mandatory sections"

### TC-035: Completeness Check
**Steps:** Check completeness percentage
**Expected:**
- Shows correct percentage (e.g., 80%, 100%)
- All mandatory fields marked complete/incomplete

---

## Test Suite 7: Navigation & Flow

### TC-036: Navigation - Step 1 to Step 2
**Steps:** Create application, verify redirect
**Expected:** Navigate to personal information page

### TC-037: Navigation - Step 2 to Step 3
**Steps:** Save personal info, verify redirect
**Expected:** Navigate to employment page

### TC-038: Navigation - Back Button
**Steps:** Click back button on any step
**Expected:** Navigate to previous step or applications list

### TC-039: Direct URL Access - Personal Info
**Steps:** Navigate directly to `/rm/applications/{id}/personal` with valid ID
**Expected:** Page loads, shows existing data if saved

### TC-040: Direct URL Access - Invalid ID
**Steps:** Navigate to `/rm/applications/INVALID123/personal`
**Expected:** Error message or redirect to applications list

---

## Test Suite 8: Data Persistence

### TC-041: Persist Application Creation
**Steps:** Create application, check database
**Expected:**
- Record in `applications` table
- `application_id` in format HL00001/PL00001/BT00001
- `status` = 'Draft'
- `assigned_to` = current user ID

### TC-042: Persist Personal Information
**Steps:** Save personal info, check database
**Expected:**
- Record in `applicants` table
- All fields saved correctly

### TC-043: Persist Employment Details
**Steps:** Save employment, check database
**Expected:**
- `applicants` table updated with employment fields

### TC-044: Persist Property Details
**Steps:** Save property, check database
**Expected:**
- Record in `property_details` table
- Linked to application via `application_id`

### TC-045: Persist Status Change
**Steps:** Submit application, check database
**Expected:**
- `status` changed from 'Draft' to 'Submitted'
- History record created in `application_history`

---

## Test Suite 9: Validation & Error Handling

### TC-046: API Error Handling - Network Error
**Steps:** Disconnect network, try to create application
**Expected:** Error message displayed, form not submitted

### TC-047: API Error Handling - 500 Error
**Steps:** Simulate server error
**Expected:** User-friendly error message

### TC-048: API Error Handling - 400 Validation Error
**Steps:** Submit invalid data
**Expected:** Field-specific error messages displayed

### TC-049: Concurrent Access
**Steps:** Open same application in two tabs, edit in both
**Expected:** Last save wins, or conflict resolution

### TC-050: Session Timeout
**Steps:** Wait for session to expire, try to save
**Expected:** Redirect to login or show session expired message

---

## Test Suite 10: Status Management

### TC-051: Status Transition - Draft to Submitted
**Steps:** Submit application
**Expected:** Status changes from Draft to Submitted

### TC-052: Status Transition - Cannot Edit After Submit
**Preconditions:** Application status = Submitted
**Steps:** Try to edit personal information
**Expected:** Read-only mode or error message

### TC-053: Application ID Format
**Steps:** Create multiple applications
**Expected:** Sequential IDs: HL00001, HL00002, PL00001, etc.

### TC-054: Status Display
**Steps:** View application in list
**Expected:** Correct status badge displayed

---

## Test Suite 11: Edge Cases

### TC-055: Very Long Names
**Steps:** Enter names with 100+ characters
**Expected:** Validation error or truncation

### TC-056: Special Characters in Names
**Steps:** Enter names with special characters
**Expected:** Validation error (only alphabets allowed)

### TC-057: Boundary Values - Amount
**Steps:** Test amount = ₹50,000 (min) and ₹5,00,00,000 (max)
**Expected:** Both accepted

### TC-058: Boundary Values - Tenure
**Steps:** Test tenure = 1 year (min) and 30 years (max)
**Expected:** Both accepted

### TC-059: Empty Optional Fields
**Steps:** Leave all optional fields empty
**Expected:** Should save successfully

### TC-060: Multiple Applications Same User
**Steps:** Create 5 applications as same RM
**Expected:** All created successfully, all assigned to same user

---

## Test Execution Summary

**Total Test Cases:** 60
**Categories:**
- Step 1 (Loan Details): 10 tests
- Step 2 (Personal Info): 11 tests
- Step 3 (Employment): 5 tests
- Step 4 (Property): 3 tests
- Step 5 (Documents): 3 tests
- Step 6 (Review): 3 tests
- Navigation: 5 tests
- Data Persistence: 5 tests
- Validation: 5 tests
- Status Management: 4 tests
- Edge Cases: 6 tests

