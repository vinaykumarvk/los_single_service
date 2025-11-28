import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

/**
 * Supabase client wrapper that provides a pool-like interface
 * This allows us to use Supabase SDK while maintaining compatibility with existing pool.query() calls
 */

let supabaseClient: SupabaseClient | null = null;
let fallbackPool: Pool | null = null;

/**
 * Initialize Supabase client
 */
export function initSupabaseClient(): SupabaseClient | Pool {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Check if we're using Supabase
  if (databaseUrl.includes('supabase.co')) {
    // Extract Supabase URL and key from DATABASE_URL
    // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
    const urlMatch = databaseUrl.match(/@db\.([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectId = urlMatch[1];
      const supabaseUrl = `https://${projectId}.supabase.co`;
      // For service role (bypasses RLS), we'd need SUPABASE_SERVICE_ROLE_KEY
      // For now, use anon key or create a service role key
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized');
        return supabaseClient as any;
      } else {
        console.warn('⚠️  SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY not set, falling back to direct PostgreSQL');
      }
    }
  }
  
  // Fallback to direct PostgreSQL connection for local or if Supabase key not available
  // We'll use a direct connection with SSL for Supabase, or regular pool for local
  const { createPgPool } = require('@los/shared-libs');
  fallbackPool = createPgPool();
  return fallbackPool;
}

/**
 * Query wrapper that uses Supabase or falls back to pool
 * This provides a compatible interface with pool.query()
 */
export async function query(text: string, params?: any[]): Promise<{ rows: any[] }> {
  if (supabaseClient) {
    // For Supabase, we need to use RPC for complex queries or parse the SQL
    // For simple SELECT queries, we can use Supabase's query builder
    // For now, let's use Supabase's REST API with raw SQL via RPC
    
    // Try to execute as RPC if it's a function call
    if (text.includes('SELECT') || text.includes('INSERT') || text.includes('UPDATE') || text.includes('DELETE')) {
      // Use Supabase's PostgREST query builder for simple queries
      // For complex queries, we'll need to use RPC functions or parse SQL
      
      // For now, fall back to direct PostgreSQL connection with SSL
      // This is a temporary solution - ideally we'd parse SQL and use Supabase's query builder
      const { createPgPool } = require('@los/shared-libs');
      const pool = createPgPool();
      try {
        const result = await pool.query(text, params);
        return result;
      } finally {
        await pool.end();
      }
    }
    
    // For function calls, use RPC
    const functionMatch = text.match(/SELECT\s+(\w+)\(/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      const { data, error } = await supabaseClient.rpc(functionName, params?.[0] || {});
      if (error) throw error;
      return { rows: Array.isArray(data) ? data : [data] };
    }
  }
  
  // Fallback to pool
  if (fallbackPool) {
    return await fallbackPool.query(text, params);
  }
  
  throw new Error('No database connection available');
}

/**
 * Get the Supabase client directly (for advanced usage)
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Get the fallback pool (for transactions and advanced queries)
 */
export function getPool(): Pool | null {
  return fallbackPool;
}

