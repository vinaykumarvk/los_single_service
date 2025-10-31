/**
 * Document OCR and Metadata Extraction
 * Supports Google Cloud Vision API, AWS Textract, or mock extraction
 */

import { createLogger } from '@los/shared-libs';

const logger = createLogger('document-ocr');

export interface ExtractedMetadata {
  text?: string;
  entities?: Array<{ type: string; value: string; confidence?: number }>;
  fields?: Record<string, string | number>;
  confidence?: number;
}

/**
 * Extract text and metadata from document using OCR
 * Currently supports mock extraction, with placeholders for real providers
 */
export async function extractDocumentMetadata(
  fileBuffer: Buffer,
  fileType: string,
  docType: string
): Promise<ExtractedMetadata> {
  const provider = process.env.OCR_PROVIDER || 'mock';
  
  try {
    switch (provider.toLowerCase()) {
      case 'google':
        return await extractWithGoogleVision(fileBuffer, fileType);
      case 'aws':
      case 'textract':
        return await extractWithAWSTextract(fileBuffer, fileType);
      case 'mock':
      default:
        return extractMockMetadata(docType);
    }
  } catch (err) {
    logger.warn('OCRExtractionError', { 
      error: (err as Error).message, 
      provider,
      fallback: 'Using mock extraction'
    });
    return extractMockMetadata(docType);
  }
}

/**
 * Extract using Google Cloud Vision API
 */
async function extractWithGoogleVision(fileBuffer: Buffer, fileType: string): Promise<ExtractedMetadata> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    
    const [result] = await client.textDetection({
      image: { content: fileBuffer }
    });
    
    const detections = result.textAnnotations;
    const fullText = detections?.[0]?.description || '';
    
    // Extract structured fields (basic implementation)
    const fields: Record<string, string> = {};
    if (fullText) {
      // PAN extraction (example)
      const panMatch = fullText.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
      if (panMatch) fields.pan = panMatch[0];
      
      // Aadhaar extraction (example)
      const aadhaarMatch = fullText.match(/\d{4}\s?\d{4}\s?\d{4}/);
      if (aadhaarMatch) fields.aadhaar = aadhaarMatch[0].replace(/\s/g, '');
    }
    
    return {
      text: fullText,
      fields,
      confidence: 0.9,
      entities: [
        { type: 'TEXT', value: fullText, confidence: 0.9 }
      ]
    };
  } catch (err) {
    throw new Error(`Google Vision OCR failed: ${(err as Error).message}`);
  }
}

/**
 * Extract using AWS Textract
 */
async function extractWithAWSTextract(fileBuffer: Buffer, fileType: string): Promise<ExtractedMetadata> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
    const client = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });
    
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: fileBuffer }
    });
    
    const response = await client.send(command);
    
    const fullText = response.Blocks
      ?.filter((block: any) => block.BlockType === 'LINE')
      .map((block: any) => block.Text)
      .join('\n') || '';
    
    return {
      text: fullText,
      fields: {},
      confidence: 0.85,
      entities: [
        { type: 'TEXT', value: fullText, confidence: 0.85 }
      ]
    };
  } catch (err) {
    throw new Error(`AWS Textract OCR failed: ${(err as Error).message}`);
  }
}

/**
 * Mock metadata extraction for development/testing
 */
function extractMockMetadata(docType: string): ExtractedMetadata {
  // Generate mock extracted data based on document type
  const mockData: Record<string, ExtractedMetadata> = {
    PAN: {
      text: 'ABCDE1234F',
      fields: { pan: 'ABCDE1234F' },
      confidence: 0.95,
      entities: [{ type: 'PAN', value: 'ABCDE1234F', confidence: 0.95 }]
    },
    AADHAAR: {
      text: '1234 5678 9012',
      fields: { aadhaar: '123456789012' },
      confidence: 0.92,
      entities: [{ type: 'AADHAAR', value: '123456789012', confidence: 0.92 }]
    },
    ITR: {
      text: 'Income Tax Return\nAssessment Year: 2023-24\nTotal Income: ₹500000',
      fields: { totalIncome: '500000', assessmentYear: '2023-24' },
      confidence: 0.88,
      entities: [
        { type: 'AMOUNT', value: '500000', confidence: 0.88 },
        { type: 'YEAR', value: '2023-24', confidence: 0.90 }
      ]
    },
    BANK_STATEMENT: {
      text: 'Bank Statement\nAccount Number: 1234567890\nBalance: ₹250000',
      fields: { accountNumber: '1234567890', balance: '250000' },
      confidence: 0.85,
      entities: [
        { type: 'ACCOUNT_NUMBER', value: '1234567890', confidence: 0.85 },
        { type: 'AMOUNT', value: '250000', confidence: 0.85 }
      ]
    },
    SALARY_SLIP: {
      text: 'Salary Slip\nEmployee: John Doe\nGross Salary: ₹100000',
      fields: { grossSalary: '100000', employeeName: 'John Doe' },
      confidence: 0.90,
      entities: [
        { type: 'AMOUNT', value: '100000', confidence: 0.90 },
        { type: 'NAME', value: 'John Doe', confidence: 0.85 }
      ]
    }
  };
  
  const defaultExtraction: ExtractedMetadata = {
    text: `Extracted text from ${docType} document`,
    fields: {},
    confidence: 0.80,
    entities: [{ type: 'TEXT', value: `Extracted text from ${docType} document`, confidence: 0.80 }]
  };
  
  return mockData[docType] || defaultExtraction;
}

