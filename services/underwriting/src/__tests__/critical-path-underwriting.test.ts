import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app, pool } from '../server';

/**
 * Critical Path: Underwriting Decision Flow Tests
 * 
 * Tests the complete underwriting workflow from evaluation to decision
 */

describe('Critical Path: Underwriting Decision Flow', () => {
  const testApplicationId = uuidv4();
  const testDecisionIds: string[] = [];

  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      // Create a test application in the application service database
      // (In real scenario, this would be done via API or shared test setup)
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    if (pool && testDecisionIds.length > 0) {
      const client = await pool.connect();
      try {
        for (const decisionId of testDecisionIds) {
          await client.query('DELETE FROM outbox WHERE aggregate_id = $1', [testApplicationId]);
          await client.query('DELETE FROM underwriting_decisions WHERE decision_id = $1', [decisionId]);
        }
      } finally {
        client.release();
      }
    }
  });

  describe('Auto-Approve Scenario', () => {
    it('should AUTO_APPROVE when all rules pass', async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/underwrite`)
        .send({
          monthlyIncome: 100000,
          existingEmi: 10000,
          proposedAmount: 5000000,
          tenureMonths: 120,
          annualRate: 9.5,
          propertyValue: 7000000,
          applicantAgeYears: 35,
          product: {
            maxFOIR: 0.5,
            maxLTV: 0.8,
            maxAgeAtMaturity: 70,
          },
        })
        .expect(200);

      expect(response.body.decision).toBe('AUTO_APPROVE');
      expect(response.body.reasons).toHaveLength(0);
      expect(response.body.metrics).toHaveProperty('foir');
      expect(response.body.metrics).toHaveProperty('ltv');
      expect(response.body.metrics).toHaveProperty('ageAtMaturity');
      
      if (response.body.decisionId) {
        testDecisionIds.push(response.body.decisionId);
      }
    });
  });

  describe('Refer Scenario', () => {
    it('should REFER when one rule fails (FOIR exceeds)', async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/underwrite`)
        .send({
          monthlyIncome: 50000,
          existingEmi: 15000,
          proposedAmount: 5000000,
          tenureMonths: 120,
          annualRate: 9.5,
          propertyValue: 7000000,
          applicantAgeYears: 35,
          product: {
            maxFOIR: 0.5,
            maxLTV: 0.8,
            maxAgeAtMaturity: 70,
          },
        })
        .expect(200);

      expect(response.body.decision).toBe('REFER');
      expect(response.body.reasons.length).toBeGreaterThan(0);
      expect(response.body.reasons[0]).toContain('FOIR');
      
      if (response.body.decisionId) {
        testDecisionIds.push(response.body.decisionId);
      }
    });

    it('should REFER when LTV exceeds threshold', async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/underwrite`)
        .send({
          monthlyIncome: 100000,
          existingEmi: 10000,
          proposedAmount: 6000000,
          tenureMonths: 120,
          annualRate: 9.5,
          propertyValue: 7000000, // LTV = 6000000/7000000 = 0.857 > 0.8
          applicantAgeYears: 35,
          product: {
            maxFOIR: 0.5,
            maxLTV: 0.8,
            maxAgeAtMaturity: 70,
          },
        })
        .expect(200);

      expect(response.body.decision).toBe('REFER');
      expect(response.body.reasons.some((r: string) => r.includes('LTV'))).toBe(true);
    });
  });

  describe('Decline Scenario', () => {
    it('should DECLINE when multiple rules fail', async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/underwrite`)
        .send({
          monthlyIncome: 50000,
          existingEmi: 20000,
          proposedAmount: 6000000,
          tenureMonths: 120,
          annualRate: 9.5,
          propertyValue: 7000000,
          applicantAgeYears: 75, // Age at maturity will be 85 > 70
          product: {
            maxFOIR: 0.5,
            maxLTV: 0.8,
            maxAgeAtMaturity: 70,
          },
        })
        .expect(200);

      expect(response.body.decision).toBe('DECLINE');
      expect(response.body.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Decision Retrieval', () => {
    it('should retrieve latest decision for application', async () => {
      // First create a decision
      const createResponse = await request(app)
        .post(`/api/applications/${testApplicationId}/underwrite`)
        .send({
          monthlyIncome: 100000,
          existingEmi: 10000,
          proposedAmount: 5000000,
          tenureMonths: 120,
          annualRate: 9.5,
          propertyValue: 7000000,
          applicantAgeYears: 35,
          product: {
            maxFOIR: 0.5,
            maxLTV: 0.8,
            maxAgeAtMaturity: 70,
          },
        })
        .expect(200);

      const decisionId = createResponse.body.decisionId;
      if (decisionId) {
        testDecisionIds.push(decisionId);
      }

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/api/applications/${testApplicationId}/decision`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('decision');
      expect(getResponse.body).toHaveProperty('decisionId');
      expect(getResponse.body.decisionId).toBe(decisionId);
    });
  });
});

