import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import {
  encryptField,
  decryptField,
  encryptPAN,
  decryptPAN,
  encryptAadhaar,
  decryptAadhaar,
  isEncrypted,
} from '../encryption';

describe('Encryption Utils', () => {
  // The encryption module loads ENCRYPTION_KEY at import time
  // For tests, we'll test with the default generated key or a pre-set one
  // Note: In real usage, ENCRYPTION_KEY should be set before importing
  
  beforeEach(() => {
    // Ensure we have a valid key set before tests run
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    }
  });

  describe('encryptField / decryptField', () => {
    it('should encrypt and decrypt a field', () => {
      const plaintext = 'sensitive-data-123';
      const encrypted = encryptField(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:encrypted
      
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(encryptField('')).toBe('');
      expect(decryptField('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(encryptField(null as any)).toBe(null);
      expect(decryptField(null as any)).toBe(null);
    });

    it('should produce different ciphertext for same plaintext (IV uniqueness)', () => {
      const plaintext = 'same-input';
      const encrypted1 = encryptField(plaintext);
      const encrypted2 = encryptField(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decryptField(encrypted1)).toBe(plaintext);
      expect(decryptField(encrypted2)).toBe(plaintext);
    });

    it('should fail to decrypt with wrong format', () => {
      const invalid = 'not-encrypted-data';
      const decrypted = decryptField(invalid);
      expect(decrypted).toBe(invalid); // Returns original if decryption fails
    });
  });

  describe('encryptPAN / decryptPAN', () => {
    it('should encrypt and decrypt PAN', () => {
      const pan = 'ABCDE1234F';
      const encrypted = encryptPAN(pan);
      
      expect(encrypted).not.toBe(pan);
      expect(isEncrypted(encrypted)).toBe(true);
      
      const decrypted = decryptPAN(encrypted);
      expect(decrypted).toBe(pan);
    });

    it('should not double-encrypt', () => {
      const pan = 'ABCDE1234F';
      const encrypted1 = encryptPAN(pan);
      const encrypted2 = encryptPAN(encrypted1);
      
      expect(encrypted1).toBe(encrypted2); // Should detect already encrypted
    });

    it('should handle empty PAN', () => {
      expect(encryptPAN('')).toBe('');
      expect(decryptPAN('')).toBe('');
    });

    it('should return masked value if decryption fails', () => {
      const invalidEncrypted = 'invalid:format:data';
      const decrypted = decryptPAN(invalidEncrypted);
      expect(decrypted).toBe('XXXXX****');
    });
  });

  describe('encryptAadhaar / decryptAadhaar', () => {
    it('should encrypt and decrypt Aadhaar', () => {
      const aadhaar = '123456789012';
      const encrypted = encryptAadhaar(aadhaar);
      
      expect(encrypted).not.toBe(aadhaar);
      expect(isEncrypted(encrypted)).toBe(true);
      
      const decrypted = decryptAadhaar(encrypted);
      expect(decrypted).toBe(aadhaar);
    });

    it('should not double-encrypt', () => {
      const aadhaar = '123456789012';
      const encrypted1 = encryptAadhaar(aadhaar);
      const encrypted2 = encryptAadhaar(encrypted1);
      
      expect(encrypted1).toBe(encrypted2);
    });

    it('should return masked value if decryption fails', () => {
      const invalidEncrypted = 'invalid:format:data';
      const decrypted = decryptAadhaar(invalidEncrypted);
      expect(decrypted).toBe('XXXX-XXXX-****');
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted format', () => {
      const encrypted = encryptField('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should detect unencrypted strings', () => {
      expect(isEncrypted('plaintext')).toBe(false);
      expect(isEncrypted('not:encrypted')).toBe(false);
      expect(isEncrypted('iv:tag:data:extra')).toBe(false); // Wrong format
    });
  });
});

