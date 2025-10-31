import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

describe('Application Service API', () => {
  const testApplicantId = uuidv4();

  beforeEach(async () => {
    // Clean up test data
    if (pool) {
      await pool.query('DELETE FROM application_history WHERE application_id IN (SELECT application_id FROM applications WHERE applicant_id = $1)', [testApplicantId]);
      await pool.query('DELETE FROM outbox WHERE aggregate_id IN (SELECT application_id FROM applications WHERE applicant_id = $1)', [testApplicantId]);
      await pool.query('DELETE FROM applications WHERE applicant_id = $1', [testApplicantId]);
    }
  });

  afterEach(async () => {
    // Clean up
    if (pool) {
      await pool.query('DELETE FROM applications WHERE applicant_id = $1', [testApplicantId]);
      await pool.query('DELETE FROM outbox WHERE aggregate_id IN (SELECT application_id FROM applications WHERE applicant_id = $1)', [testApplicantId]);
      await pool.query('DELETE FROM application_history WHERE application_id IN (SELECT application_id FROM applications WHERE applicant_id = $1)', [testApplicantId]);
    }
  });

  describe('POST /api/applications', () => {
    it('should create a new application', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      expect(response.body).toHaveProperty('applicationId');
      expect(response.body).toHaveProperty('status', 'Draft');
      
      // Verify in database
      const { rows } = await pool.query(
        'SELECT * FROM applications WHERE application_id = $1',
        [response.body.applicationId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('Draft');
    });

    it('should reject invalid channel', async () => {
      await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Invalid',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        })
        .expect(400);
    });

    it('should reject negative amount', async () => {
      await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: -1000,
          requestedTenureMonths: 120,
        })
        .expect(400);
    });

    it('should create outbox event', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      // Verify outbox event created
      const { rows } = await pool.query(
        'SELECT * FROM outbox WHERE aggregate_id = $1',
        [response.body.applicationId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].event_type).toBe('los.application.ApplicationCreated.v1');
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return application by ID', async () => {
      // Create application first
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        });

      const applicationId = createResponse.body.applicationId;

      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .expect(200);

      expect(response.body.application_id).toBe(applicationId);
      expect(response.body.status).toBe('Draft');
    });

    it('should return 404 for non-existent application', async () => {
      await request(app)
        .get(`/api/applications/${uuidv4()}`)
        .expect(404);
    });
  });

  describe('POST /api/applications/:id/submit', () => {
    it('should submit application', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        });

      const applicationId = createResponse.body.applicationId;

      const response = await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202); // 202 Accepted for async operations

      expect(response.body.status).toBe('Submitted');

      // Verify status updated in DB
      const { rows } = await pool.query(
        'SELECT status FROM applications WHERE application_id = $1',
        [applicationId]
      );
      expect(rows[0].status).toBe('Submitted');
    });

    it('should reject submission of already submitted application', async () => {
      // Create and submit application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online',
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 800000,
          requestedTenureMonths: 120,
        });

      const applicationId = createResponse.body.applicationId;

      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(202); // First submission returns 202

      // Try to submit again - should fail
      await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .expect(400);
    });
  });
});


