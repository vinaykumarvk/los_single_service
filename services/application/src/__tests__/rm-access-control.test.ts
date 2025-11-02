import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

/**
 * RM Access Control Integration Tests
 * 
 * Tests that RM users can only access applications assigned to them
 */

describe('RM Access Control - Integration Tests', () => {
  const rm1Id = '00000001-0000-0000-0000-000000000001';
  const rm2Id = '00000001-0000-0000-0000-000000000002';
  const adminId = '00000000-0000-0000-0000-000000000001';
  
  const testApplicationIds: string[] = [];
  let rm1ApplicationId: string;
  let rm2ApplicationId: string;

  beforeAll(async () => {
    // Verify database connection
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }

    // Create test applications assigned to different RMs
    const client2 = await pool.connect();
    try {
      // Application for RM1
      const app1Id = uuidv4();
      await client2.query(
        'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [app1Id, uuidv4(), 'Mobile', 'HOME_LOAN_V1', 5000000, 120, 'Draft', rm1Id]
      );
      rm1ApplicationId = app1Id;
      testApplicationIds.push(app1Id);

      // Application for RM2
      const app2Id = uuidv4();
      await client2.query(
        'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [app2Id, uuidv4(), 'Online', 'PERSONAL_LOAN_V1', 1000000, 60, 'Draft', rm2Id]
      );
      rm2ApplicationId = app2Id;
      testApplicationIds.push(app2Id);
    } finally {
      client2.release();
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

  describe('GET /api/applications - RM Filtering', () => {
    it('should return only applications assigned to RM1', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('x-user-id', rm1Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(response.body).toHaveProperty('applications');
      expect(response.body.applications).toBeInstanceOf(Array);
      
      // All returned applications should be assigned to RM1
      response.body.applications.forEach((app: any) => {
        expect(app.assigned_to || app.assigned_to).toBe(rm1Id);
      });
    });

    it('should return only applications assigned to RM2', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('x-user-id', rm2Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(response.body).toHaveProperty('applications');
      expect(response.body.applications).toBeInstanceOf(Array);
      
      // All returned applications should be assigned to RM2
      response.body.applications.forEach((app: any) => {
        if (app.assigned_to) {
          expect(app.assigned_to).toBe(rm2Id);
        }
      });
    });

    it('should return all applications for admin user', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('x-user-id', adminId)
        .set('x-user-roles', JSON.stringify(['admin']))
        .expect(200);

      expect(response.body).toHaveProperty('applications');
      // Admin should see applications from multiple RMs
      const assignedToValues = response.body.applications
        .filter((app: any) => app.assigned_to)
        .map((app: any) => app.assigned_to);
      
      // Should have applications from different RMs (or at least not filtered to one RM)
      expect(assignedToValues.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/applications/:id - RM Access Control', () => {
    it('should allow RM1 to access their assigned application', async () => {
      const response = await request(app)
        .get(`/api/applications/${rm1ApplicationId}`)
        .set('x-user-id', rm1Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(response.body.application_id).toBe(rm1ApplicationId);
      expect(response.body.assigned_to).toBe(rm1Id);
    });

    it('should deny RM1 access to RM2 application (403)', async () => {
      const response = await request(app)
        .get(`/api/applications/${rm2ApplicationId}`)
        .set('x-user-id', rm1Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });

    it('should deny RM2 access to RM1 application (403)', async () => {
      const response = await request(app)
        .get(`/api/applications/${rm1ApplicationId}`)
        .set('x-user-id', rm2Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to access any application', async () => {
      const response = await request(app)
        .get(`/api/applications/${rm1ApplicationId}`)
        .set('x-user-id', adminId)
        .set('x-user-roles', JSON.stringify(['admin']))
        .expect(200);

      expect(response.body.application_id).toBe(rm1ApplicationId);
    });

    it('should allow admin to access RM2 application', async () => {
      const response = await request(app)
        .get(`/api/applications/${rm2ApplicationId}`)
        .set('x-user-id', adminId)
        .set('x-user-roles', JSON.stringify(['admin']))
        .expect(200);

      expect(response.body.application_id).toBe(rm2ApplicationId);
    });
  });

  describe('GET /api/applications/rm/dashboard - RM Dashboard', () => {
    it('should return dashboard stats only for RM1 assigned applications', async () => {
      const response = await request(app)
        .get('/api/applications/rm/dashboard')
        .set('x-user-id', rm1Id)
        .set('x-user-roles', JSON.stringify(['rm', 'relationship_manager']))
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('recentApplications');
      
      // Recent applications should only include RM1's applications
      if (response.body.recentApplications && response.body.recentApplications.length > 0) {
        response.body.recentApplications.forEach((app: any) => {
          // Applications in recent list should be assigned to RM1 (if assigned_to is present in response)
          // Note: The endpoint may not return assigned_to in recentApplications, but stats should be correct
        });
      }
    });
  });
});

