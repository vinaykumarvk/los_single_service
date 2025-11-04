import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, encryptPAN, encryptAadhaar, decryptPAN, decryptAadhaar, encryptEmail, decryptEmail, encryptMobile, decryptMobile, encryptAddress, decryptAddress } from '@los/shared-libs';

// Export pool and app for testing
export const pool = createPgPool();
const logger = createLogger('customer-kyc-service');

export const app = express();
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

// GET /api/applicants/:id - get applicant details
app.get('/api/applicants/:id', async (req, res) => {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid UUID format' });
    }
    
    let rows;
    try {
      const result = await pool.query(
        `SELECT 
           applicant_id, first_name, middle_name, last_name, 
           date_of_birth, 
           date_of_birth as dob, gender, father_name, mother_name,
           marital_status, mobile, email, pan, aadhaar_masked, kyc_status,
           address_line1, address_line2, city, state, pincode, country,
           occupation, employer_name, employment_type, monthly_income, existing_emi,
           other_income_sources, years_in_job,
           bank_account_number, bank_ifsc, bank_account_holder_name, bank_verified, bank_verification_method, bank_verified_at,
           co_applicant_id, is_co_applicant,
           created_at, updated_at
         FROM applicants 
         WHERE applicant_id = $1`,
        [req.params.id]
      );
      rows = result.rows;
    } catch (queryErr: any) {
      // Log the query error for debugging
      logger.error('GetApplicantQueryError', { 
        error: queryErr?.message, 
        code: queryErr?.code,
        stack: queryErr?.stack,
        correlationId: (req as any).correlationId 
      });
      // Re-throw to be caught by outer catch - let normal error handling deal with it
      throw queryErr;
    }
    
    // Check if applicant exists - return 404 if not found
    if (!rows || rows.length === 0) {
      logger.debug('ApplicantNotFound', { applicantId: req.params.id, correlationId: (req as any).correlationId });
      return res.status(404).json({ error: 'Applicant not found' });
    }
    
    // Decrypt sensitive fields before returning (masking will happen in gateway if needed)
    const applicant = rows[0];
    try {
      if (applicant.pan) {
        applicant.pan = decryptPAN(applicant.pan);
      }
      if (applicant.aadhaar_masked) {
        applicant.aadhaar_masked = decryptAadhaar(applicant.aadhaar_masked);
      }
      if (applicant.email) {
        applicant.email = decryptEmail(applicant.email);
      }
      if (applicant.mobile) {
        applicant.mobile = decryptMobile(applicant.mobile);
      }
      if (applicant.address_line1) {
        applicant.address_line1 = decryptAddress(applicant.address_line1);
      }
      if (applicant.address_line2) {
        applicant.address_line2 = decryptAddress(applicant.address_line2);
      }
      if (applicant.city) {
        applicant.city = decryptAddress(applicant.city);
      }
      if (applicant.state) {
        applicant.state = decryptAddress(applicant.state);
      }
      if (applicant.pincode) {
        applicant.pincode = decryptAddress(applicant.pincode);
      }
      if (applicant.bank_account_number) {
        applicant.bank_account_number = decryptAddress(applicant.bank_account_number);
      }
    } catch (decryptErr) {
      // Log decryption errors but don't fail the request - return partial data
      logger.warn('GetApplicantDecryptError', { 
        error: (decryptErr as Error).message,
        applicantId: req.params.id,
        correlationId: (req as any).correlationId 
      });
    }
    
    // Transform response to use date_of_birth instead of dob for frontend
    const transformed: any = { ...applicant };
    // Ensure date_of_birth is returned (frontend expects this)
    if (!transformed.date_of_birth && transformed.dob) {
      transformed.date_of_birth = transformed.dob;
    }
    // Keep dob for backward compatibility
    if (!transformed.dob && transformed.date_of_birth) {
      transformed.dob = transformed.date_of_birth;
    }
    
    logger.debug('GetApplicant', { correlationId: (req as any).correlationId, applicantId: req.params.id });
    return res.status(200).json(transformed);
  } catch (err: any) {
    // Only return 500 for actual server errors, not "not found" cases
    logger.error('GetApplicantError', { 
      error: err?.message, 
      stack: err?.stack,
      correlationId: (req as any).correlationId 
    });
    // If the error indicates "not found" scenario, return 404
    if (err?.message?.includes('not found') || err?.code === 'PGRST116') {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch applicant' });
  }
});

const ApplicantSchema = z.object({
  firstName: z.string().min(2).max(200).optional(),
  middleName: z.string().max(200).optional(),
  lastName: z.string().min(2).max(200).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Accept both dob and dateOfBirth
  gender: z.enum(['Male', 'Female', 'Other', 'PreferNotToSay']).optional(),
  fatherName: z.string().max(200).optional(),
  motherName: z.string().max(200).optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  aadhaarMasked: z.string().length(12).optional(),
  // Address fields
  addressLine1: z.string().max(500).optional(),
  addressLine2: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  country: z.string().max(100).optional(),
  // Employment fields
  occupation: z.string().max(200).optional(),
  employerName: z.string().max(200).optional(),
  employmentType: z.enum(['Salaried', 'Self-employed', 'SelfEmployed', 'Business', 'Retired', 'Student', 'Unemployed']).optional(), // Accept both Self-employed and SelfEmployed
  monthlyIncome: z.number().min(0).optional(),
  existingEmi: z.number().min(0).optional(),
  otherIncomeSources: z.string().max(500).optional(),
  yearsInJob: z.number().min(0).max(50).optional(),
  // Bank fields
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  bankAccountHolderName: z.string().max(200).optional(),
  bankVerified: z.boolean().optional(),
  bankVerificationMethod: z.enum(['name_match', 'penny_drop', 'manual']).optional(),
  bankVerifiedAt: z.string().optional(),
  // Co-applicant
  coApplicantId: z.string().uuid().optional(),
  isCoApplicant: z.boolean().optional()
}).transform((data) => {
  // Transform data to match backend schema
  const transformed: any = { ...data };
  // Map dateOfBirth to dob
  if (data.dateOfBirth && !data.dob) {
    transformed.dob = data.dateOfBirth;
  }
  // Map Self-employed to SelfEmployed
  if (data.employmentType === 'Self-employed') {
    transformed.employmentType = 'SelfEmployed';
  }
  return transformed;
});

// PUT /api/applicants/:id - upsert applicant
app.put('/api/applicants/:id', async (req, res) => {
  const parsed = ApplicantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Encrypt sensitive fields before storage
    const encryptedPan = parsed.data.pan ? encryptPAN(parsed.data.pan) : null;
    const encryptedAadhaar = parsed.data.aadhaarMasked ? encryptAadhaar(parsed.data.aadhaarMasked) : null;
    const encryptedEmail = parsed.data.email ? encryptEmail(parsed.data.email) : null;
    const encryptedMobile = parsed.data.mobile ? encryptMobile(parsed.data.mobile) : null;
    const encryptedAddressLine1 = parsed.data.addressLine1 ? encryptAddress(parsed.data.addressLine1) : null;
    const encryptedAddressLine2 = parsed.data.addressLine2 ? encryptAddress(parsed.data.addressLine2) : null;
    const encryptedCity = parsed.data.city ? encryptAddress(parsed.data.city) : null;
    const encryptedState = parsed.data.state ? encryptAddress(parsed.data.state) : null;
    const encryptedPincode = parsed.data.pincode ? encryptAddress(parsed.data.pincode) : null;

    // Use date_of_birth if column exists, otherwise use dob
    const dobField = 'date_of_birth'; // Use consistent field name
    
    // Upsert applicant
    await client.query(
      `INSERT INTO applicants (
         applicant_id, first_name, middle_name, last_name, date_of_birth, gender, father_name, mother_name,
         marital_status, mobile, email, pan, aadhaar_masked,
         address_line1, address_line2, city, state, pincode, country,
         occupation, employer_name, employment_type, monthly_income, existing_emi,
         other_income_sources, years_in_job,
         bank_account_number, bank_ifsc, bank_account_holder_name, bank_verified, bank_verification_method, bank_verified_at,
         co_applicant_id, is_co_applicant
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
       ON CONFLICT (applicant_id) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, applicants.first_name),
         middle_name = COALESCE(EXCLUDED.middle_name, applicants.middle_name),
         last_name = COALESCE(EXCLUDED.last_name, applicants.last_name),
         date_of_birth = COALESCE(EXCLUDED.date_of_birth, applicants.date_of_birth),
         gender = COALESCE(EXCLUDED.gender, applicants.gender),
         father_name = COALESCE(EXCLUDED.father_name, applicants.father_name),
         mother_name = COALESCE(EXCLUDED.mother_name, applicants.mother_name),
         marital_status = COALESCE(EXCLUDED.marital_status, applicants.marital_status),
         mobile = COALESCE(EXCLUDED.mobile, applicants.mobile),
         email = COALESCE(EXCLUDED.email, applicants.email),
         pan = COALESCE(EXCLUDED.pan, applicants.pan),
         aadhaar_masked = COALESCE(EXCLUDED.aadhaar_masked, applicants.aadhaar_masked),
         address_line1 = COALESCE(EXCLUDED.address_line1, applicants.address_line1),
         address_line2 = COALESCE(EXCLUDED.address_line2, applicants.address_line2),
         city = COALESCE(EXCLUDED.city, applicants.city),
         state = COALESCE(EXCLUDED.state, applicants.state),
         pincode = COALESCE(EXCLUDED.pincode, applicants.pincode),
         country = COALESCE(EXCLUDED.country, applicants.country),
         occupation = COALESCE(EXCLUDED.occupation, applicants.occupation),
         employer_name = COALESCE(EXCLUDED.employer_name, applicants.employer_name),
         employment_type = COALESCE(EXCLUDED.employment_type, applicants.employment_type),
         monthly_income = COALESCE(EXCLUDED.monthly_income, applicants.monthly_income),
         existing_emi = COALESCE(EXCLUDED.existing_emi, applicants.existing_emi),
         other_income_sources = COALESCE(EXCLUDED.other_income_sources, applicants.other_income_sources),
         years_in_job = COALESCE(EXCLUDED.years_in_job, applicants.years_in_job),
         bank_account_number = COALESCE(EXCLUDED.bank_account_number, applicants.bank_account_number),
         bank_ifsc = COALESCE(EXCLUDED.bank_ifsc, applicants.bank_ifsc),
         bank_account_holder_name = COALESCE(EXCLUDED.bank_account_holder_name, applicants.bank_account_holder_name),
         bank_verified = COALESCE(EXCLUDED.bank_verified, applicants.bank_verified),
         bank_verification_method = COALESCE(EXCLUDED.bank_verification_method, applicants.bank_verification_method),
         bank_verified_at = COALESCE(EXCLUDED.bank_verified_at, applicants.bank_verified_at),
         co_applicant_id = COALESCE(EXCLUDED.co_applicant_id, applicants.co_applicant_id),
         is_co_applicant = COALESCE(EXCLUDED.is_co_applicant, applicants.is_co_applicant),
         updated_at = now()`,
      [
        req.params.id,
        parsed.data.firstName,
        parsed.data.middleName,
        parsed.data.lastName,
        parsed.data.dob || parsed.data.dateOfBirth,
        parsed.data.gender,
        parsed.data.fatherName,
        parsed.data.motherName,
        parsed.data.maritalStatus,
        encryptedMobile,
        encryptedEmail,
        encryptedPan,
        encryptedAadhaar,
        encryptedAddressLine1,
        encryptedAddressLine2,
        encryptedCity,
        encryptedState,
        encryptedPincode,
        parsed.data.country || 'India',
        parsed.data.occupation,
        parsed.data.employerName,
        parsed.data.employmentType,
        parsed.data.monthlyIncome,
        parsed.data.existingEmi,
        parsed.data.otherIncomeSources,
        parsed.data.yearsInJob,
        parsed.data.bankAccountNumber ? encryptAddress(parsed.data.bankAccountNumber) : null,
        parsed.data.bankIfsc,
        parsed.data.bankAccountHolderName,
        parsed.data.bankVerified || false,
        parsed.data.bankVerificationMethod,
        parsed.data.bankVerifiedAt ? new Date(parsed.data.bankVerifiedAt) : null,
        parsed.data.coApplicantId,
        parsed.data.isCoApplicant || false
      ]
    );

    await client.query('COMMIT');
    logger.info('UpsertApplicant', { correlationId: (req as any).correlationId, applicantId: req.params.id });
    return res.status(200).json({ applicantId: req.params.id, updated: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('UpsertApplicantError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to upsert applicant' });
  } finally {
    client.release();
  }
});

// POST /api/applicants/:id/consent - capture consent
app.post('/api/applicants/:id/consent', async (req, res) => {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  const ConsentSchema = z.object({ purpose: z.string().min(1) });
  const parsed = ConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'purpose required' });
  }

  const consentId = uuidv4();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if applicant exists
    const applicantCheck = await client.query('SELECT applicant_id FROM applicants WHERE applicant_id = $1', [req.params.id]);
    if (applicantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Applicant not found' });
    }
    
    // Persist consent
    await client.query(
      'INSERT INTO consents (consent_id, applicant_id, purpose) VALUES ($1, $2, $3)',
      [consentId, req.params.id, parsed.data.purpose]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.customer.ConsentCaptured.v1', 'los.customer.ConsentCaptured.v1', JSON.stringify({ applicantId: req.params.id, consentId, purpose: parsed.data.purpose }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('ConsentCaptured', { correlationId: (req as any).correlationId, applicantId: req.params.id, consentId });
    return res.status(201).json({ consentId });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ConsentCaptureError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to capture consent' });
  } finally {
    client.release();
  }
});

// POST /api/kyc/:applicationId/start - trigger KYC
app.post('/api/kyc/:applicationId/start', async (req, res) => {
  const applicationId = req.params.applicationId;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create KYC session
    const sessionId = uuidv4();
    await client.query(
      'INSERT INTO kyc_sessions (session_id, application_id, status) VALUES ($1, $2, $3)',
      [sessionId, applicationId, 'IN_PROGRESS']
    );
    
    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, applicationId, 'los.kyc.KycRequested.v1', 'los.kyc.KycRequested.v1', JSON.stringify({ applicationId, sessionId }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('StartKYC', { correlationId: (req as any).correlationId, applicationId, sessionId });
    return res.status(202).json({ applicationId, sessionId, started: true, status: 'IN_PROGRESS' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('StartKYCError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to start KYC' });
  } finally {
    client.release();
  }
});

// GET /api/kyc/:applicationId/status - get KYC status
app.get('/api/kyc/:applicationId/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
         session_id, application_id, applicant_id, status, provider, 
         provider_session_id, remarks, started_at, completed_at, updated_at,
         kyc_type, video_session_url, video_session_id, video_provider, scheduled_at, completed_via
       FROM kyc_sessions 
       WHERE application_id = $1 
       ORDER BY started_at DESC 
       LIMIT 1`,
      [req.params.applicationId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'KYC session not found for this application' });
    }
    
    const session = rows[0];
    
    // Get pending verifications (if any)
    const pendingVerifications: string[] = [];
    if (session.status === 'IN_PROGRESS') {
      if (session.kyc_type === 'VIDEO_KYC') {
        pendingVerifications.push('Video KYC session');
      } else {
        pendingVerifications.push('eKYC verification');
      }
    }
    
    logger.debug('GetKycStatus', { correlationId: (req as any).correlationId, applicationId: req.params.applicationId, status: session.status });
    return res.status(200).json({
      applicationId: req.params.applicationId,
      sessionId: session.session_id,
      status: session.status,
      kycType: session.kyc_type || 'eKYC',
      provider: session.provider,
      pendingVerifications,
      remarks: session.remarks,
      videoSessionUrl: session.video_session_url,
      videoSessionId: session.video_session_id,
      videoProvider: session.video_provider,
      scheduledAt: session.scheduled_at,
      completedVia: session.completed_via,
      startedAt: session.started_at,
      completedAt: session.completed_at
    });
  } catch (err) {
    logger.error('GetKycStatusError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// POST /api/kyc/:applicationId/video/schedule - schedule Video KYC session
app.post('/api/kyc/:applicationId/video/schedule', async (req, res) => {
  const ScheduleVideoKycSchema = z.object({
    scheduledAt: z.string().datetime(),
    videoProvider: z.enum(['ZOOM', 'GOOGLE_MEET', 'CUSTOM']).optional(),
    remarks: z.string().optional()
  });
  
  const parsed = ScheduleVideoKycSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const applicationId = req.params.applicationId;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create or update KYC session for Video KYC
    const sessionId = uuidv4();
    const videoSessionId = uuidv4(); // Generate video session ID
    const scheduledAt = new Date(parsed.data.scheduledAt);
    const videoProvider = parsed.data.videoProvider || 'CUSTOM';
    
    // Generate video session URL (in production, this would call the video provider API)
    const videoSessionUrl = `https://video-kyc.example.com/session/${videoSessionId}`;
    
    // Check if session exists
    const existingResult = await client.query(
      'SELECT session_id FROM kyc_sessions WHERE application_id = $1',
      [applicationId]
    );
    
    if (existingResult.rows.length > 0) {
      // Update existing session
      await client.query(
        `UPDATE kyc_sessions SET
           kyc_type = 'VIDEO_KYC',
           video_session_url = $1,
           video_session_id = $2,
           video_provider = $3,
           scheduled_at = $4,
           status = 'IN_PROGRESS',
           remarks = $5,
           updated_at = now()
         WHERE application_id = $6`,
        [videoSessionUrl, videoSessionId, videoProvider, scheduledAt, parsed.data.remarks || null, applicationId]
      );
    } else {
      // Create new session
      await client.query(
        `INSERT INTO kyc_sessions 
         (session_id, application_id, kyc_type, status, video_session_url, video_session_id, video_provider, scheduled_at, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [sessionId, applicationId, 'VIDEO_KYC', 'IN_PROGRESS', videoSessionUrl, videoSessionId, videoProvider, scheduledAt, parsed.data.remarks || null]
      );
    }
    
    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, applicationId, 'los.kyc.VideoKycScheduled.v1', 'los.kyc.VideoKycScheduled.v1', JSON.stringify({ applicationId, sessionId: existingResult.rows[0]?.session_id || sessionId, videoSessionId, scheduledAt, videoProvider }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('VideoKycScheduled', { correlationId: (req as any).correlationId, applicationId, videoSessionId, scheduledAt });
    return res.status(201).json({ 
      applicationId, 
      sessionId: existingResult.rows[0]?.session_id || sessionId,
      videoSessionId,
      videoSessionUrl,
      scheduledAt,
      status: 'IN_PROGRESS'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ScheduleVideoKycError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to schedule Video KYC' });
  } finally {
    client.release();
  }
});

// POST /api/kyc/:applicationId/video/complete - mark Video KYC as completed
app.post('/api/kyc/:applicationId/video/complete', async (req, res) => {
  const CompleteVideoKycSchema = z.object({
    status: z.enum(['COMPLETED', 'FAILED', 'REJECTED']),
    remarks: z.string().optional(),
    verificationNotes: z.string().optional()
  });
  
  const parsed = CompleteVideoKycSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const applicationId = req.params.applicationId;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update KYC session
    const updateResult = await client.query(
      `UPDATE kyc_sessions SET
         status = $1,
         completed_via = 'VIDEO',
         remarks = $2,
         completed_at = now(),
         updated_at = now()
       WHERE application_id = $3 AND kyc_type = 'VIDEO_KYC'
       RETURNING session_id`,
      [parsed.data.status, parsed.data.remarks || parsed.data.verificationNotes || null, applicationId]
    );
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Video KYC session not found' });
    }
    
    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, applicationId, 'los.kyc.VideoKycCompleted.v1', 'los.kyc.VideoKycCompleted.v1', JSON.stringify({ applicationId, sessionId: updateResult.rows[0].session_id, status: parsed.data.status, completedVia: 'VIDEO' }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('VideoKycCompleted', { correlationId: (req as any).correlationId, applicationId, status: parsed.data.status });
    return res.status(200).json({ 
      applicationId,
      sessionId: updateResult.rows[0].session_id,
      status: parsed.data.status,
      completedAt: new Date().toISOString()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CompleteVideoKycError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to complete Video KYC' });
  } finally {
    client.release();
  }
});

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  // Default port is 3003 to match gateway configuration
  // Gateway routes /api/applicants to http://localhost:3003
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
  app.listen(port, () => {
    logger.info('CustomerKYCServiceStarted', { port });
  });
}


