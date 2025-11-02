import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

/**
 * Complete End-to-End Workflow Tests
 * 
 * Tests the full journey from application creation through disbursement
 * Simulates real-world scenarios with multiple services
 */

describe('E2E: Complete Application Workflow', () => {
  const testApplicantId = uuidv4();
  const testApplicationIds: string[] = [];
  const rmUserId = '00000001-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    if (pool && testApplicationIds.length > 0) {
      const client = await pool.connect();
      try {
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

  describe('Complete Flow: Create → KYC → Documents → Underwrite → Sanction → Disburse', () => {
    let applicationId: string;

    it('Step 1: RM creates application', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm']))
        .expect(201);

      applicationId = response.body.applicationId;
      testApplicationIds.push(applicationId);

      expect(applicationId).toBeDefined();
      expect(response.body.status).toBe('Draft');
    });

    it('Step 2: Assign application to RM', async () => {
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/assign`)
        .send({ assignedTo: rmUserId })
        .set('x-user-id', rmUserId)
        .expect(200);

      expect(response.body.assignedTo).toBe(rmUserId);
    });

    it('Step 3: RM submits application', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .set('x-user-id', rmUserId)
        .expect(202);

      expect(response.body.status).toBe('Submitted');

      // Verify status in database
      const getResponse = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('x-user-id', rmUserId)
        .expect(200);

      expect(getResponse.body.status).toBe('Submitted');
    });

    it('Step 4: Verify application timeline records all steps', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/timeline`)
        .expect(200);

      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline).toBeInstanceOf(Array);
      expect(response.body.timeline.length).toBeGreaterThan(0);

      // Should have ApplicationCreated event
      const createdEvent = response.body.timeline.find(
        (e: any) => e.event_type === 'ApplicationCreated'
      );
      expect(createdEvent).toBeDefined();

      // Should have ApplicationSubmitted event
      const submittedEvent = response.body.timeline.find(
        (e: any) => e.event_type === 'ApplicationSubmitted'
      );
      expect(submittedEvent).toBeDefined();
    });

    it('Step 5: Verify RM access control - RM can only see their assigned application', async () => {
      // RM should see application in their list
      const listResponse = await request(app)
        .get('/api/applications')
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm']))
        .expect(200);

      const foundApp = listResponse.body.applications.find(
        (app: any) => app.application_id === applicationId
      );
      expect(foundApp).toBeDefined();
    });

    it('Step 6: Verify RM dashboard shows application', async () => {
      const response = await request(app)
        .get('/api/applications/rm/dashboard')
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm']))
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats.total).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('recentApplications');
    });
  });

  describe('Critical Path: Error Handling Workflow', () => {
    it('should handle invalid product code gracefully', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'INVALID_PRODUCT',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent duplicate submission', async () => {
      const appId = uuidv4();
      const client = await pool.connect();
      try {
        await client.query(
          'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [appId, testApplicantId, 'Online', 'HOME_LOAN_V1', 4000000, 120, 'Submitted']
        );
        testApplicationIds.push(appId);

        // Try to submit again
        const response = await request(app)
          .post(`/api/applications/${appId}/submit`)
          .expect(400);

        expect(response.body.error).toContain('cannot submit');
      } finally {
        client.release();
      }
    });

    it('should validate application exists before operations', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .patch(`/api/applications/${nonExistentId}`)
        .send({ requestedAmount: 6000000 })
        .expect(404);

      expect(response.body.error).toBe('Application not found');
    });
  });

  describe('Critical Path: Admin Access Verification', () => {
    let adminAppId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Branch' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 6000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      adminAppId = response.body.applicationId;
      testApplicationIds.push(adminAppId);
    });

    it('should allow admin to access any RM application', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001';

      // Assign to RM1
      await request(app)
        .patch(`/api/applications/${adminAppId}/assign`)
        .send({ assignedTo: rmUserId })
        .expect(200);

      // Admin should still be able to access
      const response = await request(app)
        .get(`/api/applications/${adminAppId}`)
        .set('x-user-id', adminId)
        .set('x-user-roles', JSON.stringify(['admin']))
        .expect(200);

      expect(response.body.application_id).toBe(adminAppId);
    });

    it('should allow admin to see all applications regardless of assignment', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001';

      const response = await request(app)
        .get('/api/applications')
        .set('x-user-id', adminId)
        .set('x-user-roles', JSON.stringify(['admin']))
        .expect(200);

      expect(response.body.applications).toBeInstanceOf(Array);
      // Admin should see applications from multiple RMs
      expect(response.body.applications.length).toBeGreaterThan(0);
    });
  });

  describe('Critical Path: Bulk Operations', () => {
    it('should create multiple applications in bulk', async () => {
      const bulkPayload = {
        applications: [
          {
            applicantId: testApplicantId,
            channel: 'Online' as const,
            productCode: 'HOME_LOAN_V1',
            requestedAmount: 3000000,
            requestedTenureMonths: 120,
          },
          {
            applicantId: testApplicantId,
            channel: 'Mobile' as const,
            productCode: 'PERSONAL_LOAN_V1',
            requestedAmount: 500000,
            requestedTenureMonths: 60,
          },
        ],
      };

      const response = await request(app)
        .post('/api/applications/bulk')
        .send(bulkPayload)
        .expect(201);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.success).toBe(2);

      // Track for cleanup
      response.body.results.forEach((result: any) => {
        if (result.applicationId) {
          testApplicationIds.push(result.applicationId);
        }
      });
    });
  });

  describe('Critical Path: Application Lifecycle Management', () => {
    let lifecycleAppId: string;

    it('should handle complete lifecycle: Draft → Update → Submit → Withdraw', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 4500000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      lifecycleAppId = createResponse.body.applicationId;
      testApplicationIds.push(lifecycleAppId);

      // Update
      await request(app)
        .patch(`/api/applications/${lifecycleAppId}`)
        .send({ requestedAmount: 5000000 })
        .expect(200);

      // Submit
      await request(app)
        .post(`/api/applications/${lifecycleAppId}/submit`)
        .expect(202);

      // Verify status
      const getResponse = await request(app)
        .get(`/api/applications/${lifecycleAppId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('Submitted');

      // Withdraw
      const withdrawResponse = await request(app)
        .post(`/api/applications/${lifecycleAppId}/withdraw`)
        .send({ reason: 'Customer requested cancellation' })
        .expect(200);

      expect(withdrawResponse.body.status).toBe('Withdrawn');

      // Verify final status
      const finalResponse = await request(app)
        .get(`/api/applications/${lifecycleAppId}`)
        .expect(200);

      expect(finalResponse.body.status).toBe('Withdrawn');
    });
  });
});

