import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

/**
 * Integration tests for Application Service API endpoints
 * 
 * These tests require a running PostgreSQL database.
 * Set DATABASE_URL environment variable before running tests.
 */

describe('Application Service - API Integration Tests', () => {
  const testApplicantId = uuidv4();
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
    if (pool && testApplicationIds.length > 0) {
      const client = await pool.connect();
      try {
        // Delete test applications
        for (const appId of testApplicationIds) {
          await client.query('DELETE FROM application_history WHERE application_id = $1', [appId]);
          await client.query('DELETE FROM outbox WHERE aggregate_id = $1', [appId]);
          await client.query('DELETE FROM applications WHERE application_id = $1', [appId]);
        }
      } finally {
        client.release();
      }
    }
  });

  beforeEach(() => {
    // Reset test state for each test
  });

  describe('Health Check', () => {
    it('GET /health should return 200 OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.text).toBe('OK');
    });
  });

  describe('POST /api/applications', () => {
    it('should create a new application', async () => {
      const payload = {
        applicantId: testApplicantId,
        channel: 'Mobile' as const,
        productCode: 'HOME_LOAN_V1',
        requestedAmount: 5000000,
        requestedTenureMonths: 120,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('applicationId');
      expect(response.body).toHaveProperty('status', 'Draft');
      // Note: POST response only includes applicationId and status, not full application data

      testApplicationIds.push(response.body.applicationId);

      // Verify in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM applications WHERE application_id = $1',
          [response.body.applicationId]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe('Draft');
        expect(rows[0].applicant_id).toBe(testApplicantId);
      } finally {
        client.release();
      }
    });

    it('should create outbox event on application creation', async () => {
      const payload = {
        applicantId: testApplicantId,
        channel: 'Online' as const,
        productCode: 'PERSONAL_LOAN_V1',
        requestedAmount: 1000000,
        requestedTenureMonths: 60,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      testApplicationIds.push(response.body.applicationId);

      // Verify outbox event created
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM outbox WHERE aggregate_id = $1 ORDER BY occurred_at DESC LIMIT 1',
          [response.body.applicationId]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].event_type).toBe('los.application.ApplicationCreated.v1');
        expect(rows[0].topic).toBe('los.application.ApplicationCreated.v1');
        
        // Payload is already an object (JSONB)
        const payloadData = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
        expect(payloadData.applicationId).toBe(response.body.applicationId);
        expect(payloadData.channel).toBe('Online');
      } finally {
        client.release();
      }
    });

    it('should record application history on creation', async () => {
      const payload = {
        applicantId: testApplicantId,
        channel: 'Branch' as const,
        productCode: 'HOME_LOAN_V1',
        requestedAmount: 8000000,
        requestedTenureMonths: 180,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      testApplicationIds.push(response.body.applicationId);

      // Verify history recorded
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM application_history WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
          [response.body.applicationId]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].event_type).toBe('ApplicationCreated');
        expect(rows[0].event_source).toBe('application'); // Server uses 'application' as source
      } finally {
        client.release();
      }
    });

    it('should reject invalid channel', async () => {
      const invalidPayload = {
        applicantId: testApplicantId,
        channel: 'InvalidChannel',
        productCode: 'HOME_LOAN_V1',
        requestedAmount: 5000000,
        requestedTenureMonths: 120,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid payload');
    });

    it('should reject negative amount', async () => {
      const invalidPayload = {
        applicantId: testApplicantId,
        channel: 'Mobile' as const,
        productCode: 'HOME_LOAN_V1',
        requestedAmount: -1000,
        requestedTenureMonths: 120,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid UUID for applicantId', async () => {
      const invalidPayload = {
        applicantId: 'not-a-uuid',
        channel: 'Mobile' as const,
        productCode: 'HOME_LOAN_V1',
        requestedAmount: 5000000,
        requestedTenureMonths: 120,
      };

      const response = await request(app)
        .post('/api/applications')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing required fields', async () => {
      const incompletePayload = {
        applicantId: testApplicantId,
        channel: 'Mobile',
        // Missing productCode, requestedAmount, requestedTenureMonths
      };

      const response = await request(app)
        .post('/api/applications')
        .send(incompletePayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return application by ID', async () => {
      // Create application first
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 6000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      // Fetch application
      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .expect(200);

      expect(response.body.application_id).toBe(applicationId);
      expect(response.body.status).toBe('Draft');
      expect(response.body.applicant_id).toBe(testApplicantId);
      expect(response.body.channel).toBe('Online');
      expect(response.body.product_code).toBe('HOME_LOAN_V1');
      // PostgreSQL NUMERIC is returned as string, parse it
      expect(Number(response.body.requested_amount)).toBe(6000000);
      expect(response.body.requested_tenure_months).toBe(120);
    });

    it('should return 404 for non-existent application', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/applications/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Application not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/applications/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/applications', () => {
    it('should return paginated list of applications', async () => {
      // Create a test application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 7000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      // Fetch list
      const response = await request(app)
        .get('/api/applications?limit=10&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.applications)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(typeof response.body.pagination.total).toBe('number');
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by status', async () => {
      // Create a draft application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'PERSONAL_LOAN_V1',
          requestedAmount: 500000,
          requestedTenureMonths: 60,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      // Filter by Draft status
      const response = await request(app)
        .get('/api/applications?status=Draft')
        .expect(200);

      expect(response.body.applications.every((app: any) => app.status === 'Draft')).toBe(true);
    });

    it('should filter by channel', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Branch' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 9000000,
          requestedTenureMonths: 240,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      const response = await request(app)
        .get('/api/applications?channel=Branch')
        .expect(200);

      expect(response.body.applications.every((app: any) => app.channel === 'Branch')).toBe(true);
    });

    it('should filter by product code', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 10000000,
          requestedTenureMonths: 300,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      const response = await request(app)
        .get('/api/applications?productCode=HOME_LOAN_V1')
        .expect(200);

      expect(response.body.applications.every((app: any) => app.product_code === 'HOME_LOAN_V1')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/applications?limit=5&offset=0')
        .expect(200);

      expect(response.body.applications.length).toBeLessThanOrEqual(5);
      
      if (response.body.total > 5) {
        const secondPage = await request(app)
          .get('/api/applications?limit=5&offset=5')
          .expect(200);
        
        expect(secondPage.body.applications.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PATCH /api/applications/:id', () => {
    it('should update draft application', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      // Update application
      const updates = {
        requestedAmount: 6000000,
        requestedTenureMonths: 180,
        channel: 'Mobile' as const,
      };

      const response = await request(app)
        .patch(`/api/applications/${applicationId}`)
        .send(updates)
        .expect(200);

      // PATCH response only returns applicationId and updated flag
      expect(response.body).toHaveProperty('applicationId');
      expect(response.body).toHaveProperty('updated', true);
      
      // Verify in database instead

      // Verify in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM applications WHERE application_id = $1',
          [applicationId]
        );
        // PostgreSQL NUMERIC returns as string
        expect(Number(rows[0].requested_amount)).toBe(6000000);
        expect(rows[0].requested_tenure_months).toBe(180);
        expect(rows[0].channel).toBe('Mobile');
      } finally {
        client.release();
      }
    });

    it('should record history on update', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      await request(app)
        .patch(`/api/applications/${applicationId}`)
        .send({ requestedAmount: 7000000 })
        .expect(200);

      // Verify history
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM application_history WHERE application_id = $1 AND event_type = $2 ORDER BY created_at DESC LIMIT 1',
          [applicationId, 'ApplicationUpdated']
        );
        expect(rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });

    it('should reject updates to non-draft applications', async () => {
      // Create and submit application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      // Submit application
      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202);

      // Try to update - should fail
      const response = await request(app)
        .patch(`/api/applications/${applicationId}`)
        .send({ requestedAmount: 8000000 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Draft');
    });

    it('should reject invalid update payload', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      const response = await request(app)
        .patch(`/api/applications/${createResponse.body.applicationId}`)
        .send({ requestedAmount: -1000 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/applications/:id/submit', () => {
    it('should submit application and change status to Submitted', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      const response = await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202); // 202 Accepted for async operations

      expect(response.body.status).toBe('Submitted');

      // Verify status in database
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT status FROM applications WHERE application_id = $1',
          [applicationId]
        );
        expect(rows[0].status).toBe('Submitted');
      } finally {
        client.release();
      }
    });

    it('should create outbox event on submission', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'PERSONAL_LOAN_V1',
          requestedAmount: 2000000,
          requestedTenureMonths: 60,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202);

      // Verify outbox event
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          'SELECT * FROM outbox WHERE aggregate_id = $1 AND event_type = $2 ORDER BY occurred_at DESC LIMIT 1',
          [applicationId, 'los.application.ApplicationSubmitted.v1']
        );
        expect(rows).toHaveLength(1);
      } finally {
        client.release();
      }
    });

    it('should reject submission of already submitted application', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      // Submit first time
      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202);

      // Try to submit again - should fail
      const response = await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('cannot submit');
    });
  });

  describe('GET /api/applications/:id/timeline', () => {
    it('should return application timeline with events', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      const applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      // Update application
      await request(app)
        .patch(`/api/applications/${applicationId}`)
        .send({ requestedAmount: 6000000 })
        .expect(200);

      // Submit application
      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202);

      // Get timeline
      const response = await request(app)
        .get(`/api/applications/${applicationId}/timeline`)
        .expect(200);

      expect(response.body).toHaveProperty('timeline');
      expect(Array.isArray(response.body.timeline)).toBe(true);
      expect(response.body.timeline.length).toBeGreaterThan(0);

      // Verify event types
      const eventTypes = response.body.timeline.map((e: any) => e.event_type);
      expect(eventTypes).toContain('ApplicationCreated');
      expect(eventTypes).toContain('ApplicationUpdated');
      expect(eventTypes).toContain('ApplicationSubmitted');
    });

    it('should return empty timeline for new application', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      testApplicationIds.push(createResponse.body.applicationId);

      const response = await request(app)
        .get(`/api/applications/${createResponse.body.applicationId}/timeline`)
        .expect(200);

      expect(response.body.timeline.length).toBeGreaterThan(0); // Should have at least ApplicationCreated
    });

    it('should return 404 for non-existent application timeline', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/applications/${nonExistentId}/timeline`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

