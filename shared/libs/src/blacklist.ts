/**
 * Blacklist/Whitelist Check Utilities
 * Provides functions to check if entities are blacklisted or whitelisted
 */

import crypto from 'crypto';
import { Pool, PoolConfig } from 'pg';
import { createLogger } from './logger';

// Direct implementation to avoid circular dependency with index.ts
function createPgPoolForBlacklist(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return new Pool({ connectionString });
  }
  return new Pool();
}

const logger = createLogger('blacklist-checker');
const pool = createPgPoolForBlacklist();

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  entry?: {
    reason: string;
    source: string;
    expiresAt?: string;
  };
}

/**
 * Check if an entity is blacklisted or whitelisted
 */
export async function checkBlacklistWhitelist(
  entityType: 'PAN' | 'AADHAAR' | 'MOBILE' | 'EMAIL' | 'ACCOUNT',
  entityValue: string
): Promise<BlacklistCheckResult> {
  try {
    // Check whitelist first (whitelist takes precedence)
    const whitelistResult = await pool.query(
      `SELECT entry_id, reason, source, expires_at
       FROM whitelist
       WHERE entity_type = $1 AND entity_value = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       LIMIT 1`,
      [entityType, entityValue]
    );
    
    if (whitelistResult.rows.length > 0) {
      return {
        isBlacklisted: false,
        isWhitelisted: true,
        entry: {
          reason: whitelistResult.rows[0].reason || 'Whitelisted',
          source: whitelistResult.rows[0].source || 'INTERNAL',
          expiresAt: whitelistResult.rows[0].expires_at
        }
      };
    }
    
    // Check blacklist
    const blacklistResult = await pool.query(
      `SELECT entry_id, reason, source, expires_at
       FROM blacklist
       WHERE entity_type = $1 AND entity_value = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       LIMIT 1`,
      [entityType, entityValue]
    );
    
    if (blacklistResult.rows.length > 0) {
      return {
        isBlacklisted: true,
        isWhitelisted: false,
        entry: {
          reason: blacklistResult.rows[0].reason,
          source: blacklistResult.rows[0].source || 'INTERNAL',
          expiresAt: blacklistResult.rows[0].expires_at
        }
      };
    }
    
    return {
      isBlacklisted: false,
      isWhitelisted: false
    };
  } catch (err) {
    logger.warn('BlacklistCheckError', { error: (err as Error).message, entityType, entityValue });
    // Fail open - don't block operations if blacklist check fails
    return {
      isBlacklisted: false,
      isWhitelisted: false
    };
  }
}

/**
 * Add entry to blacklist
 */
export async function addToBlacklist(
  entityType: 'PAN' | 'AADHAAR' | 'MOBILE' | 'EMAIL' | 'ACCOUNT',
  entityValue: string,
  reason: string,
  source: string = 'INTERNAL',
  expiresAt?: Date
): Promise<string> {
  const entryId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO blacklist (entry_id, entity_type, entity_value, reason, source, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (entity_type, entity_value) DO UPDATE SET
       reason = EXCLUDED.reason,
       source = EXCLUDED.source,
       expires_at = EXCLUDED.expires_at,
       is_active = true`,
    [entryId, entityType, entityValue, reason, source, expiresAt || null]
  );
  
  logger.info('BlacklistEntryAdded', { entryId, entityType, source });
  return entryId;
}

/**
 * Add entry to whitelist
 */
export async function addToWhitelist(
  entityType: 'PAN' | 'AADHAAR' | 'MOBILE' | 'EMAIL' | 'ACCOUNT',
  entityValue: string,
  reason?: string,
  source: string = 'INTERNAL',
  expiresAt?: Date
): Promise<string> {
  const entryId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO whitelist (entry_id, entity_type, entity_value, reason, source, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (entity_type, entity_value) DO UPDATE SET
       reason = EXCLUDED.reason,
       source = EXCLUDED.source,
       expires_at = EXCLUDED.expires_at,
       is_active = true`,
    [entryId, entityType, entityValue, reason || null, source, expiresAt || null]
  );
  
  logger.info('WhitelistEntryAdded', { entryId, entityType, source });
  return entryId;
}

