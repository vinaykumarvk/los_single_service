import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

/**
 * Critical Path Workflow Tests
 * 
 * Tests the complete end-to-end workflow from application creation to disbursement
 * These tests simulate real user journeys through the system
 */

describe('Critical Path: Complete Application Workflow', () => {
  const testApplicantId = uuidv4();
  const testApplicationIds: string[] = [];
  let applicationId: string;
  let rmUserId = '00000001-0000-0000-0000-000000000001'; // RM1 from test data

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

  describe('Critical Path 1: RM Application Creation to Submission', () => {
    it('should complete full RM workflow: create → update → assign → submit', async () => {
      // Step 1: RM creates application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 5000000,
          requestedTenureMonths: 120,
        })
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(201);

      applicationId = createResponse.body.applicationId;
      testApplicationIds.push(applicationId);

      expect(applicationId).toBeDefined();
      expect(createResponse.body.status).toBe('Draft');

      // Step 2: RM can see their application in list
      const listResponse = await request(app)
        .get('/api/applications')
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(listResponse.body.applications).toBeInstanceOf(Array);
      const createdApp = listResponse.body.applications.find(
        (app: any) => app.application_id === applicationId
      );
      expect(createdApp).toBeDefined();

      // Step 3: RM can view their application
      const getResponse = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(getResponse.body.application_id).toBe(applicationId);
      expect(getResponse.body.status).toBe('Draft');

      // Step 4: RM updates application (if needed)
      const updateResponse = await request(app)
        .patch(`/api/applications/${applicationId}`)
        .send({
          requestedAmount: 5500000,
        })
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(updateResponse.body.updated).toBe(true);

      // Step 5: Application is assigned to RM (or admin assigns)
      const assignResponse = await request(app)
        .patch(`/api/applications/${applicationId}/assign`)
        .send({
          assignedTo: rmUserId,
        })
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(assignResponse.body.assignedTo).toBe(rmUserId);

      // Step 6: RM submits application
      const submitResponse = await request(app)
        .post(`/api/applications/${applicationId}/submit`)
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(202);

      expect(submitResponse.body.status).toBe('Submitted');
      expect(submitResponse.body.submitted).toBe(true);

      // Step 7: Verify application status changed
      const finalResponse = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('x-user-id', rmUserId)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(finalResponse.body.status).toBe('Submitted');
    });

    it('should verify RM cannot access unassigned application', async () => {
      const rm2Id = '00000001-0000-0000-0000-000000000002'; // RM2

      // RM2 tries to access RM1's application
      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('x-user-id', rm2Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Critical Path 2: Application Status Transitions', () => {
    let draftAppId: string;

    beforeAll(async () => {
      // Create a fresh application for status transition tests
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Online' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 4000000,
          requestedTenureMonths: 120,
        })
        .expect(201);

      draftAppId = createResponse.body.applicationId;
      testApplicationIds.push(draftAppId);
    });

    it('should enforce status transition rules: Draft → Submitted only', async () => {
      // Cannot submit twice
      await request(app)
        .post(`/api/applications/${draftAppId}/submit`)
        .expect(202);

      const response = await request(app)
        .post(`/api/applications/${draftAppId}/submit`)
        .expect(400);

      expect(response.body.error).toContain('cannot submit');
    });

    it('should allow withdrawal from Draft status', async () => {
      const withdrawAppId = uuidv4();
      const client = await pool.connect();
      try {
        await client.query(
          'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [withdrawAppId, testApplicantId, 'Online', 'HOME_LOAN_V1', 3000000, 120, 'Draft']
        );
        testApplicationIds.push(withdrawAppId);

        const response = await request(app)
          .post(`/api/applications/${withdrawAppId}/withdraw`)
          .send({ reason: 'Customer requested cancellation' })
          .expect(200);

        expect(response.body.status).toBe('Withdrawn');
      } finally {
        client.release();
      }
    });
  });

  describe('Critical Path 3: Error Handling and Edge Cases', () => {
    it('should handle invalid application ID gracefully', async () => {
      const response = await request(app)
        .get('/api/applications/invalid-uuid')
        .expect(400);

      expect(response.body.error).toContain('Invalid UUID format');
    });

    it('should handle non-existent application', async () => {
      const nonExistentId = uuidv4();
      const response = await request(app)
        .get(`/api/applications/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Application not found');
    });

    it('should validate product limits on creation', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          applicantId: testApplicantId,
          channel: 'Mobile' as const,
          productCode: 'HOME_LOAN_V1',
          requestedAmount: 0, // Invalid amount
          requestedTenureMonths: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent update of non-draft application', async () => {
      // Get the submitted application from previous test
      if (applicationId) {
        const response = await request(app)
          .patch(`/api/applications/${applicationId}`)
          .send({
            requestedAmount: 6000000,
          })
          .expect(400);

        expect(response.body.error).toContain('cannot update');
      }
    });
  });

  describe('Critical Path 4: RM Dashboard Integration', () => {
    it('should show correct stats for RM assigned applications', async () => {
      // Create multiple applications for RM1
      const app1 = uuidv4();
      const app2 = uuidv4();
      const client = await pool.connect();
      try {
        await client.query(
          'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [app1, testApplicantId, 'Mobile', 'HOME_LOAN_V1', 5000000, 120, 'Draft', rmUserId]
        );
        await client.query(
          'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [app2, testApplicantId, 'Online', 'PERSONAL_LOAN_V1', 1000000, 60, 'Submitted', rmUserId]
        );
        testApplicationIds.push(app1, app2);

        const response = await request(app)
          .get('/api/applications/rm/dashboard')
          .set('x-user-id', rmUserId)
          .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
          .expect(200);

        expect(response.body).toHaveProperty('stats');
        expect(response.body).toHaveProperty('recentApplications');
        expect(response.body.stats).toHaveProperty('total');
        expect(response.body.stats).toHaveProperty('draft');
        expect(response.body.stats).toHaveProperty('submitted');
      } finally {
        client.release();
      }
    });
  });

  describe('Critical Path 5: Admin Access Verification', () => {
    const adminId = '00000000-0000-0000-0000-000000000001';

    it('should allow admin to access any application', async () => {
      if (applicationId) {
        const response = await request(app)
          .get(`/api/applications/${applicationId}`)
          .set('x-user-id', adminId)
          .set('x-user-roles', JSON.stringify(['admin']))
          .expect(200);

        expect(response.body.application_id).toBe(applicationId);
      }
    });

    it('should allow admin to see all applications', async () => {
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
});

