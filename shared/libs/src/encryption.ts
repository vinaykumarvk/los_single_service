import crypto from 'crypto';

// Use environment variable for encryption key (32 bytes for AES-256 = 64 hex chars)
const getEncryptionKey = (): Buffer => {
  const keyHex = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  // Ensure we have at least 64 hex characters (32 bytes) for AES-256
  const keyHexNormalized = keyHex.length >= 64 ? keyHex.slice(0, 64) : keyHex.padEnd(64, '0');
  return Buffer.from(keyHexNormalized, 'hex');
};

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a sensitive field value (PAN, Aadhaar, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptField(value: string): string {
  if (!value) return value;
  
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted field value
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.includes(':')) return encryptedValue;
  
  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) return encryptedValue; // Invalid format
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, return original (might be unencrypted legacy data)
    return encryptedValue;
  }
}

/**
 * Encrypts PAN number (if not already encrypted)
 */
export function encryptPAN(pan: string): string {
  if (!pan) return pan;
  // Check if already encrypted (format check)
  if (pan.includes(':') && pan.split(':').length === 3) return pan;
  return encryptField(pan);
}

/**
 * Decrypts PAN number (returns masked if decryption fails)
 */
export function decryptPAN(encryptedPan: string): string {
  if (!encryptedPan) return encryptedPan;
  const decrypted = decryptField(encryptedPan);
  // If decryption failed, return masked version
  if (decrypted === encryptedPan && encryptedPan.includes(':')) {
    return 'XXXXX****';
  }
  return decrypted;
}

/**
 * Encrypts Aadhaar number (if not already encrypted)
 */
export function encryptAadhaar(aadhaar: string): string {
  if (!aadhaar) return aadhaar;
  // Check if already encrypted
  if (aadhaar.includes(':') && aadhaar.split(':').length === 3) return aadhaar;
  return encryptField(aadhaar);
}

/**
 * Decrypts Aadhaar number (returns masked if decryption fails)
 */
export function decryptAadhaar(encryptedAadhaar: string): string {
  if (!encryptedAadhaar) return encryptedAadhaar;
  const decrypted = decryptField(encryptedAadhaar);
  // If decryption failed, return masked version
  if (decrypted === encryptedAadhaar && encryptedAadhaar.includes(':')) {
    return 'XXXX-XXXX-****';
  }
  return decrypted;
}

/**
 * Encrypts email address (if not already encrypted)
 */
export function encryptEmail(email: string): string {
  if (!email) return email;
  // Check if already encrypted
  if (email.includes(':') && email.split(':').length === 3) return email;
  return encryptField(email);
}

/**
 * Decrypts email address
 */
export function decryptEmail(encryptedEmail: string): string {
  if (!encryptedEmail) return encryptedEmail;
  return decryptField(encryptedEmail);
}

/**
 * Encrypts mobile number (if not already encrypted)
 */
export function encryptMobile(mobile: string): string {
  if (!mobile) return mobile;
  // Check if already encrypted
  if (mobile.includes(':') && mobile.split(':').length === 3) return mobile;
  return encryptField(mobile);
}

/**
 * Decrypts mobile number
 */
export function decryptMobile(encryptedMobile: string): string {
  if (!encryptedMobile) return encryptedMobile;
  return decryptField(encryptedMobile);
}

/**
 * Encrypts address field (if not already encrypted)
 */
export function encryptAddress(address: string): string {
  if (!address) return address;
  // Check if already encrypted
  if (address.includes(':') && address.split(':').length === 3) return address;
  return encryptField(address);
}

/**
 * Decrypts address field
 */
export function decryptAddress(encryptedAddress: string): string {
  if (!encryptedAddress) return encryptedAddress;
  return decryptField(encryptedAddress);
}

/**
 * Checks if a value is encrypted (format check)
 */
export function isEncrypted(value: string): boolean {
  return value.includes(':') && value.split(':').length === 3;
}

