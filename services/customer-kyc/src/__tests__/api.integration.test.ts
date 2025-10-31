import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';
import { encryptPAN, encryptAadhaar, decryptPAN, decryptAadhaar } from '@los/shared-libs';

/**
 * Integration tests for Customer KYC Service API endpoints
 * 
 * These tests require a running PostgreSQL database.
 * Set DATABASE_URL environment variable before running tests.
 */

describe('Customer KYC Service - API Integration Tests', () => {
  const testApplicantIds: string[] = [];
  const testApplicationIds: string[] = [];

  beforeAll(async () => {
    // Verify database connection
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (pool && (testApplicantIds.length > 0 || testApplicationIds.length > 0)) {
      const client = await pool.connect();
      try {
        // Delete test consent records
        for (const applicantId of testApplicantIds) {
          await client.query('DELETE FROM consents WHERE applicant_id = $1', [applicantId]);
        }
        // Delete test applicants
        for (const applicantId of testApplicantIds) {
          await client.query('DELETE FROM applicants WHERE applicant_id = $1', [applicantId]);
        }
        // Delete test outbox events
        for (const applicationId of testApplicationIds) {
          await client.query('DELETE FROM outbox WHERE aggregate_id = $1', [applicationId]);
        }
      } finally {
        client.release();
      }
    }
  });

  beforeEach(() => {
    // Reset test state
  });

  describe('Health Check', () => {
    it('GET /health should return 200 OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.text).toBe('OK');
    });
  });

  describe('PUT /api/applicants/:id', () => {
    it('should create a new applicant with basic information', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-01-15',
        mobile: '9876543210',
        email: 'john.doe@example.com',
      };

      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('applicantId', applicantId);
      testApplicantIds.push(applicantId);

      // Verify in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM applicants WHERE applicant_id = $1',
          [applicantId]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].first_name).toBe('John');
        expect(rows[0].last_name).toBe('Doe');
        expect(rows[0].mobile).toBe('9876543210');
        expect(rows[0].email).toBe('john.doe@example.com');
      } finally {
        client.release();
      }
    });

    it('should encrypt PAN and Aadhaar before storage', async () => {
      const applicantId = uuidv4();
      const pan = 'ABCDE1234F';
      const aadhaar = '123456789012';
      
      const payload = {
        firstName: 'Jane',
        lastName: 'Smith',
        pan,
        aadhaarMasked: aadhaar,
      };

      await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(200);

      testApplicantIds.push(applicantId);

      // Verify encryption in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT pan, aadhaar_masked FROM applicants WHERE applicant_id = $1',
          [applicantId]
        );
        expect(rows[0].pan).not.toBe(pan); // Should be encrypted (hash format)
        expect(rows[0].aadhaar_masked).not.toBe(aadhaar); // Should be encrypted
        
        // Verify decryption works
        const decryptedPan = decryptPAN(rows[0].pan);
        const decryptedAadhaar = decryptAadhaar(rows[0].aadhaar_masked);
        expect(decryptedPan).toBe(pan);
        expect(decryptedAadhaar).toBe(aadhaar);
      } finally {
        client.release();
      }
    });

    it('should update existing applicant with partial data', async () => {
      const applicantId = uuidv4();
      
      // Create initial applicant
      await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send({
          firstName: 'Initial',
          lastName: 'Name',
          mobile: '9876543210',
        })
        .expect(200);

      testApplicantIds.push(applicantId);

      // Update with additional fields
      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send({
          email: 'updated@example.com',
          addressLine1: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        })
        .expect(200);

      expect(response.body).toHaveProperty('applicantId', applicantId);

      // Verify both old and new data preserved
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM applicants WHERE applicant_id = $1',
          [applicantId]
        );
        expect(rows[0].first_name).toBe('Initial'); // Old data preserved
        expect(rows[0].last_name).toBe('Name'); // Old data preserved
        expect(rows[0].email).toBe('updated@example.com'); // New data added
        expect(rows[0].address_line1).toBe('123 Main Street');
        expect(rows[0].city).toBe('Mumbai');
      } finally {
        client.release();
      }
    });

    it('should handle employment information', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'Employee',
        lastName: 'Test',
        occupation: 'Software Engineer',
        employerName: 'Tech Corp',
        employmentType: 'Salaried' as const,
        monthlyIncome: 100000,
        existingEmi: 15000,
      };

      await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(200);

      testApplicantIds.push(applicantId);

      // Verify employment data
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT occupation, employer_name, employment_type, monthly_income, existing_emi FROM applicants WHERE applicant_id = $1',
          [applicantId]
        );
        expect(rows[0].occupation).toBe('Software Engineer');
        expect(rows[0].employer_name).toBe('Tech Corp');
        expect(rows[0].employment_type).toBe('Salaried');
        expect(Number(rows[0].monthly_income)).toBe(100000);
        expect(Number(rows[0].existing_emi)).toBe(15000);
      } finally {
        client.release();
      }
    });

    it('should reject invalid PAN format', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'Test',
        lastName: 'User',
        pan: 'INVALID', // Invalid PAN format
      };

      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid payload');
    });

    it('should reject invalid mobile number', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'Test',
        lastName: 'User',
        mobile: '12345', // Invalid mobile format
      };

      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid email format', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email', // Invalid email format
      };

      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid pincode', async () => {
      const applicantId = uuidv4();
      const payload = {
        firstName: 'Test',
        lastName: 'User',
        pincode: '123', // Invalid pincode (must be 6 digits)
      };

      const response = await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/applicants/:id', () => {
    it('should return applicant details with decrypted PAN and Aadhaar', async () => {
      const applicantId = uuidv4();
      const pan = 'ABCDE1234F';
      const aadhaar = '123456789012';

      // Create applicant with PAN and Aadhaar
      await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send({
          firstName: 'Decrypt',
          lastName: 'Test',
          pan,
          aadhaarMasked: aadhaar,
        })
        .expect(200);

      testApplicantIds.push(applicantId);

      // Retrieve applicant
      const response = await request(app)
        .get(`/api/applicants/${applicantId}`)
        .expect(200);

      expect(response.body.applicant_id).toBe(applicantId);
      // Server decrypts PAN and Aadhaar before returning
      expect(response.body.pan).toBe(pan); // Should be decrypted (original value)
      expect(response.body.aadhaar_masked).toBe(aadhaar); // Should be decrypted (original value)
      expect(response.body.first_name).toBe('Decrypt');
    });

    it('should return 404 for non-existent applicant', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/applicants/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Applicant not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/applicants/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/applicants/:id/consent', () => {
    it('should record consent for applicant', async () => {
      const applicantId = uuidv4();

      // Create applicant first
      await request(app)
        .put(`/api/applicants/${applicantId}`)
        .send({
          firstName: 'Consent',
          lastName: 'Test',
        })
        .expect(200);

      testApplicantIds.push(applicantId);

      // Record consent
      const consentPayload = {
        purpose: 'KYC_VERIFICATION',
      };

      const response = await request(app)
        .post(`/api/applicants/${applicantId}/consent`)
        .send(consentPayload)
        .expect(201);

      expect(response.body).toHaveProperty('consentId');
      // Response only includes consentId (server.ts line 211)

      // Verify consent in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM consents WHERE applicant_id = $1 ORDER BY captured_at DESC LIMIT 1',
          [applicantId]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].purpose).toBe('KYC_VERIFICATION');
        expect(rows[0].applicant_id).toBe(applicantId);
      } finally {
        client.release();
      }
    });

    it('should reject consent for non-existent applicant', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .post(`/api/applicants/${nonExistentId}/consent`)
        .send({ purpose: 'KYC_VERIFICATION' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/kyc/:applicationId/start', () => {
    it('should start KYC process and create outbox event', async () => {
      const applicationId = uuidv4();
      testApplicationIds.push(applicationId);

      const response = await request(app)
        .post(`/api/kyc/${applicationId}/start`)
        .expect(202);

      expect(response.body).toHaveProperty('applicationId', applicationId);
      expect(response.body).toHaveProperty('started', true);

      // Verify outbox event created
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM outbox WHERE aggregate_id = $1 AND event_type = $2 ORDER BY occurred_at DESC LIMIT 1',
          [applicationId, 'los.kyc.KycRequested.v1']
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].topic).toBe('los.kyc.KycRequested.v1');
      } finally {
        client.release();
      }
    });

    it('should handle multiple KYC starts for same application', async () => {
      const applicationId = uuidv4();
      testApplicationIds.push(applicationId);

      // Start KYC multiple times
      await request(app)
        .post(`/api/kyc/${applicationId}/start`)
        .expect(202);

      await request(app)
        .post(`/api/kyc/${applicationId}/start`)
        .expect(202);

      // Verify multiple outbox events
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM outbox WHERE aggregate_id = $1 AND event_type = $2',
          [applicationId, 'los.kyc.KycRequested.v1']
        );
        expect(rows.length).toBeGreaterThanOrEqual(2);
      } finally {
        client.release();
      }
    });
  });
});

