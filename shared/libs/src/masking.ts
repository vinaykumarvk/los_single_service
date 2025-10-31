export function maskPAN(pan: string): string {
  if (!pan || pan.length < 10) return pan;
  return `${pan.slice(0, 2)}XXXX${pan.slice(6)}`;
}

export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 12) return aadhaar;
  return `${aadhaar.slice(0, 2)}XXXXXXXX${aadhaar.slice(-2)}`;
}

export function redactPII<T extends Record<string, any>>(obj: T, fields: string[] = ['pan', 'aadhaar', 'beneficiaryAccount']): T {
  const clone: any = { ...obj };
  for (const f of fields) {
    if (clone[f]) clone[f] = 'REDACTED';
  }
  return clone as T;
}


