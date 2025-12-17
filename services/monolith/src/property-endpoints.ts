// Property details endpoints for applications
import { z } from 'zod';
import { SupabaseClient, querySupabase, connectSupabase } from '@los/shared-libs';
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

export function setupPropertyEndpoints(app: any, supabaseClient: SupabaseClient) {
  // POST /api/applications/:id/property - create or update property details
  app.post('/api/applications/:id/property', async (req: any, res: any) => {
    const parsed = PropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      // Check application exists using Supabase SDK
      const { data: appData, error: appError } = await supabaseClient
        .from('applications')
        .select('application_id, status')
        .eq('application_id', req.params.id)
        .maybeSingle();
      
      if (appError || !appData) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Only allow updates for Draft or Submitted applications
      if (!['Draft', 'Submitted'].includes(appData.status)) {
        return res.status(400).json({ error: `Cannot update property for application in ${appData.status} status` });
      }

      // Build property payload for Supabase SDK
      const propertyPayload: any = {
        application_id: req.params.id,
        property_type: parsed.data.propertyType,
        builder_name: parsed.data.builderName || null,
        project_name: parsed.data.projectName || null,
        property_value: parsed.data.propertyValue || null,
        property_address: parsed.data.propertyAddress || null,
        property_pincode: parsed.data.propertyPincode || null,
        property_city: parsed.data.propertyCity || null,
        property_state: parsed.data.propertyState || null,
        updated_at: new Date().toISOString()
      };

      // Upsert property details using Supabase SDK
      const { error: upsertError } = await supabaseClient
        .from('property_details')
        .upsert(propertyPayload, { onConflict: 'application_id' });
      
      if (upsertError) {
        logger.error('UpsertPropertyError', { 
          error: upsertError.message, 
          correlationId: (req as any).correlationId,
          applicationId: req.params.id
        });
        return res.status(500).json({ error: 'Failed to update property details' });
      }
      
      logger.info('UpsertProperty', { correlationId: (req as any).correlationId, applicationId: req.params.id });
      return res.status(200).json({ 
        applicationId: req.params.id, 
        propertyType: parsed.data.propertyType,
        updated: true 
      });
    } catch (err) {
      logger.error('UpsertPropertyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to update property details' });
    }
  });

  // GET /api/applications/:id/property - get property details
  app.get('/api/applications/:id/property', async (req: any, res: any) => {
    try {
      const { rows } = await querySupabase(
        supabaseClient,
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

