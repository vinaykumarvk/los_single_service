import { describe, it, expect } from 'vitest';

/**
 * Document Service - File Validation Unit Tests
 * Tests file type validation, size limits, and hash calculation logic
 */

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function isValidFileType(mimetype: string): boolean {
  return ALLOWED_TYPES.includes(mimetype);
}

function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

function calculateFileHash(buffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function generateObjectKey(applicationId: string, docId: string, fileName: string): string {
  return `${applicationId}/${docId}/${fileName}`;
}

describe('File Validation', () => {
  describe('File Type Validation', () => {
    it('should accept PDF files', () => {
      expect(isValidFileType('application/pdf')).toBe(true);
    });

    it('should accept JPEG files', () => {
      expect(isValidFileType('image/jpeg')).toBe(true);
      expect(isValidFileType('image/jpg')).toBe(true);
    });

    it('should accept PNG files', () => {
      expect(isValidFileType('image/png')).toBe(true);
    });

    it('should reject unsupported file types', () => {
      expect(isValidFileType('application/zip')).toBe(false);
      expect(isValidFileType('text/plain')).toBe(false);
      expect(isValidFileType('image/gif')).toBe(false);
      expect(isValidFileType('application/msword')).toBe(false);
    });

    it('should be case-sensitive for mimetypes', () => {
      expect(isValidFileType('APPLICATION/PDF')).toBe(false);
      expect(isValidFileType('Image/PNG')).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    it('should accept files within size limit', () => {
      expect(isValidFileSize(1024)).toBe(true); // 1KB
      expect(isValidFileSize(5 * 1024 * 1024)).toBe(true); // 5MB
      expect(isValidFileSize(15 * 1024 * 1024)).toBe(true); // Exactly 15MB
    });

    it('should reject files exceeding size limit', () => {
      expect(isValidFileSize(16 * 1024 * 1024)).toBe(false); // 16MB
      expect(isValidFileSize(100 * 1024 * 1024)).toBe(false); // 100MB
    });

    it('should reject zero or negative sizes', () => {
      expect(isValidFileSize(0)).toBe(false);
      expect(isValidFileSize(-100)).toBe(false);
    });
  });

  describe('File Hash Calculation', () => {
    it('should generate consistent hash for same content', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');
      
      const hash1 = calculateFileHash(buffer1);
      const hash2 = calculateFileHash(buffer2);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should generate different hash for different content', () => {
      const buffer1 = Buffer.from('content 1');
      const buffer2 = Buffer.from('content 2');
      
      const hash1 = calculateFileHash(buffer1);
      const hash2 = calculateFileHash(buffer2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const hash = calculateFileHash(buffer);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('Object Key Generation', () => {
    it('should generate correct S3 object key format', () => {
      const applicationId = '550e8400-e29b-41d4-a716-446655440000';
      const docId = '660e8400-e29b-41d4-a716-446655440000';
      const fileName = 'document.pdf';
      
      const key = generateObjectKey(applicationId, docId, fileName);
      
      expect(key).toBe(`${applicationId}/${docId}/${fileName}`);
      expect(key).toContain(applicationId);
      expect(key).toContain(docId);
      expect(key).toContain(fileName);
    });

    it('should handle file names with spaces', () => {
      const key = generateObjectKey('app-123', 'doc-456', 'my document.pdf');
      expect(key).toBe('app-123/doc-456/my document.pdf');
    });

    it('should handle file names with special characters', () => {
      const key = generateObjectKey('app-123', 'doc-456', 'document (1).pdf');
      expect(key).toBe('app-123/doc-456/document (1).pdf');
    });
  });
});

