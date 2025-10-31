import { describe, it, expect } from 'vitest';
import { maskPAN, maskAadhaar, redactPII } from '../masking';

describe('masking utils', () => {
  it('masks PAN retaining first 2 and last 4 characters', () => {
    // PAN: ABCDE1234F (10 chars) -> AB + XXXX + 234F = ABXXXX234F
    expect(maskPAN('ABCDE1234F')).toBe('ABXXXX234F');
  });

  it('masks Aadhaar retaining first 2 and last 2 digits', () => {
    expect(maskAadhaar('123456789012')).toBe('12XXXXXXXX12');
  });

  it('redacts PII fields', () => {
    const original = { pan: 'ABCDE1234F', aadhaar: '123456789012', beneficiaryAccount: '00112233', other: 'ok' };
    const redacted = redactPII(original);
    expect(redacted.pan).toBe('REDACTED');
    expect(redacted.aadhaar).toBe('REDACTED');
    expect(redacted.beneficiaryAccount).toBe('REDACTED');
    expect(redacted.other).toBe('ok');
  });
});


