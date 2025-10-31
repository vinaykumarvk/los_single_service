import { describe, it, expect } from 'vitest';

/**
 * Document Compliance Checking Logic
 * Tests the logic for checking document checklist compliance
 */

interface ChecklistItem {
  doc_type: string;
  required: boolean;
}

interface UploadedDocument {
  doc_type: string;
  status: string;
}

function checkCompliance(
  checklist: ChecklistItem[],
  uploadedDocs: UploadedDocument[]
): {
  isCompliant: boolean;
  missing: string[];
  verified: number;
  requiredCount: number;
  totalUploaded: number;
} {
  // Convert checklist to map
  const checklistMap = checklist.reduce((acc: Record<string, boolean>, item) => {
    acc[item.doc_type] = item.required;
    return acc;
  }, {});

  // Get uploaded document types
  const uploadedTypes = uploadedDocs.map(doc => doc.doc_type);
  const uploadedSet = new Set(uploadedTypes);

  // Find missing required documents
  const missing: string[] = [];
  for (const [docType, required] of Object.entries(checklistMap)) {
    if (required && !uploadedSet.has(docType)) {
      missing.push(docType);
    }
  }

  // Count verified documents
  const verified = uploadedDocs.filter(doc => doc.status === 'Verified').length;
  const requiredCount = Object.values(checklistMap).filter(r => r).length;

  // Compliance: no missing required docs AND all required docs are verified
  // Check that each required document type is both uploaded AND verified
  const requiredDocTypes = Object.keys(checklistMap).filter(docType => checklistMap[docType]);
  const allRequiredVerified = requiredDocTypes.every(docType => {
    const doc = uploadedDocs.find(d => d.doc_type === docType);
    return doc && doc.status === 'Verified';
  });
  
  const isCompliant = missing.length === 0 && allRequiredVerified;

  return {
    isCompliant,
    missing,
    verified,
    requiredCount,
    totalUploaded: uploadedDocs.length
  };
}

describe('Document Compliance Checking', () => {
  describe('Compliance Calculation', () => {
    it('should be compliant when all required documents are uploaded and verified', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
        { doc_type: 'ADDRESS_PROOF', required: true },
        { doc_type: 'INCOME_PROOF', required: false },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        { doc_type: 'AADHAAR', status: 'Verified' },
        { doc_type: 'ADDRESS_PROOF', status: 'Verified' },
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.verified).toBe(3);
      expect(result.requiredCount).toBe(3);
    });

    it('should not be compliant when required document is missing', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        // AADHAAR missing
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(false);
      expect(result.missing).toContain('AADHAAR');
      expect(result.missing.length).toBe(1);
    });

    it('should not be compliant when required document is uploaded but not verified', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        { doc_type: 'AADHAAR', status: 'Uploaded' }, // Not verified
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(false);
      expect(result.missing).toHaveLength(0);
      expect(result.verified).toBe(1);
      expect(result.requiredCount).toBe(2);
    });

    it('should be compliant when optional documents are missing', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
        { doc_type: 'BANK_STATEMENT', required: false },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        { doc_type: 'AADHAAR', status: 'Verified' },
        // BANK_STATEMENT not uploaded but optional
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should handle empty checklist', () => {
      const checklist: ChecklistItem[] = [];
      const uploaded: UploadedDocument[] = [];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.requiredCount).toBe(0);
    });

    it('should handle checklist with no required documents', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'OPTIONAL_DOC', required: false },
      ];

      const uploaded: UploadedDocument[] = [];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.requiredCount).toBe(0);
    });

    it('should identify multiple missing documents', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
        { doc_type: 'ADDRESS_PROOF', required: true },
        { doc_type: 'INCOME_PROOF', required: true },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        // Missing AADHAAR, ADDRESS_PROOF, INCOME_PROOF
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.isCompliant).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain('AADHAAR');
      expect(result.missing).toContain('ADDRESS_PROOF');
      expect(result.missing).toContain('INCOME_PROOF');
    });

    it('should count verified documents correctly', () => {
      const checklist: ChecklistItem[] = [
        { doc_type: 'PAN', required: true },
        { doc_type: 'AADHAAR', required: true },
      ];

      const uploaded: UploadedDocument[] = [
        { doc_type: 'PAN', status: 'Verified' },
        { doc_type: 'AADHAAR', status: 'Uploaded' }, // Not verified
        { doc_type: 'EXTRA_DOC', status: 'Verified' }, // Extra verified doc (not in checklist)
      ];

      const result = checkCompliance(checklist, uploaded);

      expect(result.verified).toBe(2); // PAN and EXTRA_DOC are verified
      expect(result.totalUploaded).toBe(3);
      // Compliance requires all required docs to be verified
      // PAN is verified, but AADHAAR (required) is uploaded but not verified
      expect(result.isCompliant).toBe(false); // AADHAAR (required) not verified
    });
  });
});

