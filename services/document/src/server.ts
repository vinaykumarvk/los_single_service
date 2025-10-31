import express from 'express';
import { json } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, createS3Client, putObjectBuffer, getPresignedUrl } from '@los/shared-libs';
import crypto from 'crypto';
import { extractDocumentMetadata } from './ocr';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB max
app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();
const logger = createLogger('document-service');
const s3 = createS3Client();
const bucket = process.env.MINIO_BUCKET || 'los-docs';

app.get('/health', (_req, res) => res.status(200).send('OK'));

const UploadSchema = z.object({
  docType: z.string().min(1),
  file: z.any() // Multer file object
});

// POST /api/applications/:id/documents - upload
app.post('/api/applications/:id/documents', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG' });
  }

  const docId = uuidv4();
  const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Extract OCR metadata (non-blocking, but await for transaction)
    let extractedData = null;
    let ocrProvider = null;
    let ocrConfidence = null;
    try {
      const metadata = await extractDocumentMetadata(req.file.buffer, req.file.mimetype, req.body.docType);
      extractedData = metadata;
      ocrProvider = process.env.OCR_PROVIDER || 'mock';
      ocrConfidence = metadata.confidence || null;
    } catch (ocrErr) {
      logger.warn('OCRFailed', { error: (ocrErr as Error).message, docId, docType: req.body.docType });
      // Continue without OCR data
    }
    
    // Check if this is a re-upload (document versioning)
    const existingDoc = await client.query(
      'SELECT doc_id, version FROM documents WHERE application_id = $1 AND doc_type = $2 ORDER BY version DESC LIMIT 1',
      [req.params.id, req.body.docType]
    );
    
    const version = existingDoc.rows.length > 0 ? existingDoc.rows[0].version + 1 : 1;
    const previousVersionId = existingDoc.rows.length > 0 ? existingDoc.rows[0].doc_id : null;
    
    // Persist document metadata with OCR data and versioning
    await client.query(
      'INSERT INTO documents (doc_id, application_id, doc_type, file_name, file_type, size_bytes, hash, status, extracted_data, ocr_provider, ocr_confidence, version, previous_version_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [docId, req.params.id, req.body.docType, req.file.originalname, req.file.mimetype, req.file.size, fileHash, 'Uploaded', extractedData ? JSON.stringify(extractedData) : null, ocrProvider, ocrConfidence, version, previousVersionId]
    );

    // Upload to MinIO (outside transaction but awaited before event)
    const objectKey = `${req.params.id}/${docId}/${req.file.originalname}`;
    await putObjectBuffer(s3, { bucket, key: objectKey, body: req.file.buffer, contentType: req.file.mimetype });

    // Store object key
    await client.query('UPDATE documents SET object_key = $1 WHERE doc_id = $2', [objectKey, docId]);

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.document.DocumentUploaded.v1', 'los.document.DocumentUploaded.v1', JSON.stringify({ applicationId: req.params.id, docId, docType: req.body.docType, fileName: req.file.originalname, sizeBytes: req.file.size, objectKey }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DocumentUploaded', { correlationId: (req as any).correlationId, applicationId: req.params.id, docId, docType: req.body.docType });
    return res.status(201).json({ applicationId: req.params.id, docId, docType: req.body.docType, fileName: req.file.originalname });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DocumentUploadError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    client.release();
  }
});

// PATCH /api/documents/:docId/verify - verify
app.patch('/api/documents/:docId/verify', async (req, res) => {
  const VerifySchema = z.object({ remarks: z.string().optional() });
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check document exists and get application_id
    const { rows } = await client.query('SELECT application_id, status FROM documents WHERE doc_id = $1', [req.params.docId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update status
    await client.query(
      'UPDATE documents SET status = $1 WHERE doc_id = $2',
      ['Verified', req.params.docId]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, rows[0].application_id, 'los.document.DocumentVerified.v1', 'los.document.DocumentVerified.v1', JSON.stringify({ docId: req.params.docId, remarks: parsed.data.remarks }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DocumentVerified', { correlationId: (req as any).correlationId, docId: req.params.docId });
    return res.status(200).json({ docId: req.params.docId, status: 'Verified', verified: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DocumentVerifyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to verify document' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id/checklist - get document checklist for application's product
app.get('/api/applications/:id/checklist', async (req, res) => {
  try {
    // Get product code from application
    const appResult = await pool.query(
      'SELECT product_code FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const productCode = appResult.rows[0].product_code;

    // Get checklist for this product
    const { rows } = await pool.query(
      'SELECT doc_type, required FROM document_checklist WHERE product_code = $1 ORDER BY doc_type',
      [productCode]
    );

    return res.status(200).json({ productCode, checklist: rows });
  } catch (err) {
    logger.error('GetChecklistError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to get checklist' });
  }
});

// GET /api/applications/:id/documents - list documents
app.get('/api/applications/:id/documents', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT doc_id, doc_type, file_name, file_type, size_bytes, status, created_at FROM documents WHERE application_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    return res.status(200).json({ documents: rows });
  } catch (err) {
    logger.error('ListDocumentsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

// GET /api/applications/:id/documents/compliance - check document compliance against checklist
app.get('/api/applications/:id/documents/compliance', async (req, res) => {
  try {
    // Get product code from application
    const appResult = await pool.query(
      'SELECT product_code FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const productCode = appResult.rows[0].product_code;

    // Get checklist for this product
    const checklistResult = await pool.query(
      'SELECT doc_type, required FROM document_checklist WHERE product_code = $1',
      [productCode]
    );
    const checklist = checklistResult.rows.reduce((acc: Record<string, boolean>, row: any) => {
      acc[row.doc_type] = row.required;
      return acc;
    }, {});

    // Get uploaded documents
    const docsResult = await pool.query(
      'SELECT doc_type, status FROM documents WHERE application_id = $1',
      [req.params.id]
    );
    const uploaded = docsResult.rows.map((r: any) => r.doc_type);

    // Check compliance
    const missing: string[] = [];
    const uploadedSet = new Set(uploaded);

    for (const [docType, required] of Object.entries(checklist)) {
      if (required && !uploadedSet.has(docType)) {
        missing.push(docType);
      }
    }

    // Check if all required are verified
    const verified = docsResult.rows.filter((r: any) => r.status === 'Verified').length;
    const requiredCount = Object.values(checklist).filter((r: boolean) => r).length;

    const isCompliant = missing.length === 0 && verified >= requiredCount;

    return res.status(200).json({
      productCode,
      isCompliant,
      checklist,
      uploaded,
      missing,
      verified,
      requiredCount,
      totalUploaded: docsResult.rows.length
    });
  } catch (err) {
    logger.error('CheckComplianceError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// GET /api/documents/:docId/download - presigned URL
app.get('/api/documents/:docId/download', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT object_key, file_name, file_type FROM documents WHERE doc_id = $1', [req.params.docId]);
    if (rows.length === 0 || !rows[0].object_key) return res.status(404).json({ error: 'Not found' });
    const url = await getPresignedUrl(s3, { bucket, key: rows[0].object_key, expiresInSec: 300 });
    return res.status(200).json({ url, fileName: rows[0].file_name, fileType: rows[0].file_type, expiresInSec: 300 });
  } catch (err) {
    logger.error('DownloadPresignError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to generate download link' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Document service listening on ${port}`);
});


