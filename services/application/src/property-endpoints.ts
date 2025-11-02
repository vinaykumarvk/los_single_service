// Property details endpoints for applications
import { z } from 'zod';
import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('application-service-property');

const PropertySchema = z.object({
  propertyType: z.enum(['Flat', 'Plot', 'House', 'Under Construction']),
  builderName: z.string().max(200).optional(),
  projectName: z.string().max(200).optional(),
  propertyValue: z.number().min(0).optional(),
  propertyAddress: z.string().max(500).optional(),
  propertyPincode: z.string().regex(/^\d{6}$/).optional(),
  propertyCity: z.string().max(100).optional(),
  propertyState: z.string().max(100).optional(),
});

export function setupPropertyEndpoints(app: any, pool: Pool) {
  // POST /api/applications/:id/property - create or update property details
  app.post('/api/applications/:id/property', async (req: any, res: any) => {
    const parsed = PropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check application exists
      const { rows: appRows } = await client.query(
        'SELECT application_id, status FROM applications WHERE application_id = $1',
        [req.params.id]
      );
      if (appRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Only allow updates for Draft or Submitted applications
      if (!['Draft', 'Submitted'].includes(appRows[0].status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cannot update property for application in ${appRows[0].status} status` });
      }

      // Upsert property details
      await client.query(
        `INSERT INTO property_details (
           application_id, property_type, builder_name, project_name, property_value,
           property_address, property_pincode, property_city, property_state
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (application_id) DO UPDATE SET
           property_type = EXCLUDED.property_type,
           builder_name = EXCLUDED.builder_name,
           project_name = EXCLUDED.project_name,
           property_value = EXCLUDED.property_value,
           property_address = EXCLUDED.property_address,
           property_pincode = EXCLUDED.property_pincode,
           property_city = EXCLUDED.property_city,
           property_state = EXCLUDED.property_state,
           updated_at = now()`,
        [
          req.params.id,
          parsed.data.propertyType,
          parsed.data.builderName || null,
          parsed.data.projectName || null,
          parsed.data.propertyValue || null,
          parsed.data.propertyAddress || null,
          parsed.data.propertyPincode || null,
          parsed.data.propertyCity || null,
          parsed.data.propertyState || null,
        ]
      );

      await client.query('COMMIT');
      
      logger.info('UpsertProperty', { correlationId: (req as any).correlationId, applicationId: req.params.id });
      return res.status(200).json({ 
        applicationId: req.params.id, 
        propertyType: parsed.data.propertyType,
        updated: true 
      });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('UpsertPropertyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to update property details' });
    } finally {
      client.release();
    }
  });

  // GET /api/applications/:id/property - get property details
  app.get('/api/applications/:id/property', async (req: any, res: any) => {
    try {
      const { rows } = await pool.query(
        `SELECT 
           property_id, application_id, property_type, builder_name, project_name,
           property_value, property_address, property_pincode, property_city, property_state,
           created_at, updated_at
         FROM property_details 
         WHERE application_id = $1`,
        [req.params.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Property details not found' });
      }
      
      logger.debug('GetProperty', { correlationId: (req as any).correlationId, applicationId: req.params.id });
      return res.status(200).json(rows[0]);
    } catch (err) {
      logger.error('GetPropertyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to fetch property details' });
    }
  });
}

