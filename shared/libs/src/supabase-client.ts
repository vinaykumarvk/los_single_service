/**
 * Supabase SDK Client Wrapper
 * Provides a unified interface for all database operations using Supabase SDK
 * Handles: queries, transactions, RPC calls, and complex operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Re-export SupabaseClient for use in other modules
export type { SupabaseClient } from '@supabase/supabase-js';

// For complex queries that can't be expressed via Supabase query builder,
// we'll use RPC functions or direct SQL execution
import { Pool } from 'pg';

export interface SupabaseQueryResult {
  rows: any[];
  rowCount?: number;
}

export interface SupabaseTransaction {
  query(text: string, params?: any[]): Promise<SupabaseQueryResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Initialize Supabase client from environment variables
 */
export function createSupabaseClient(): SupabaseClient {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Extract Supabase project details from DATABASE_URL
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
  let supabaseUrl: string;
  let supabaseKey: string;
  
  if (databaseUrl.includes('supabase.co')) {
    const urlMatch = databaseUrl.match(/@db\.([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectId = urlMatch[1];
      supabaseUrl = `https://${projectId}.supabase.co`;
      
      // Get key from environment (prioritize service role key)
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
      
      // Check if key is valid (not placeholder)
      if (!supabaseKey || 
          supabaseKey === 'your_service_role_key_here' || 
          supabaseKey === 'your_anon_key_here' ||
          supabaseKey.length < 50) {
        throw new Error(
          'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set with a valid key when using Supabase.\n' +
          'Please add your actual Supabase API key to the .env file.\n' +
          'Get your keys from: https://supabase.com/dashboard/project/' + projectId + '/settings/api'
        );
      }
    } else {
      throw new Error('Invalid Supabase DATABASE_URL format');
    }
  } else {
    // For local development, we still need Supabase URL and key
    // These should be set even for local Supabase instances
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for local Supabase instances');
    }
  }
  
  const client = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    auth: { persistSession: false },
  });
  
  return client;
}

/**
 * Execute a raw SQL query using direct PostgreSQL connection
 * This is used for complex queries that can't be expressed via Supabase query builder
 * Note: This is a fallback - prefer using Supabase query builder when possible
 */
async function executeRawQuery(
  supabaseClient: SupabaseClient,
  sql: string,
  params?: any[]
): Promise<SupabaseQueryResult> {
  // For stored procedure calls, use RPC
  const rpcMatch = sql.match(/SELECT\s+(\w+)\(/);
  if (rpcMatch) {
    const functionName = rpcMatch[1];
    const { data, error } = await supabaseClient.rpc(functionName, params?.[0] || {});
    if (error) throw error;
    return { rows: Array.isArray(data) ? data : [data] };
  }
  
  // For complex queries (CTEs, JOINs, complex aggregations, etc.), use direct PostgreSQL
  // This is necessary because Supabase PostgREST has limitations on complex SQL
  // We still use Supabase's connection string to maintain consistency
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set');
  }
  
  // Create a temporary pool for this query
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? {
      rejectUnauthorized: false
    } : undefined,
    max: 1 // Single connection for this query
  });
  
  try {
    const result = await pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? undefined };
  } finally {
    await pool.end();
  }
}

/**
 * Convert a simple SELECT query to Supabase query builder
 */
function buildSupabaseQuery(
  supabaseClient: SupabaseClient,
  table: string,
  sql: string,
  params?: any[]
): any {
  // Try to parse simple SELECT queries
  // This is a simplified parser - for complex queries, we'll use executeRawQuery
  
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
  if (!selectMatch) return null;
  
  const columns = selectMatch[1];
  const tableName = selectMatch[2];
  
  if (tableName !== table) return null;
  
  // Parse WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
  let query = supabaseClient.from(table).select(columns === '*' ? '*' : columns);
  
  if (whereMatch && params) {
    const whereClause = whereMatch[1];
    // Simple WHERE parsing - for complex WHERE clauses, use executeRawQuery
    // This handles: column = $1, column IN ($1, $2), etc.
    const conditions = whereClause.split(/\s+AND\s+/i);
    conditions.forEach((condition, index) => {
      if (condition.includes('=')) {
        const [col, val] = condition.split('=').map(s => s.trim());
        if (val.startsWith('$')) {
          const paramIndex = parseInt(val.substring(1)) - 1;
          if (params[paramIndex] !== undefined) {
            query = query.eq(col.replace(/::\w+/g, ''), params[paramIndex]);
          }
        }
      }
    });
  }
  
  // Parse ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)?/i);
  if (orderMatch) {
    query = query.order(orderMatch[1], { ascending: !orderMatch[2] || orderMatch[2].toUpperCase() === 'ASC' });
  }
  
  // Parse LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    query = query.limit(parseInt(limitMatch[1]));
  }
  
  return query;
}

/**
 * Execute a query using Supabase SDK
 * Automatically chooses the best method (query builder vs raw SQL)
 */
export async function executeQuery(
  supabaseClient: SupabaseClient,
  sql: string,
  params?: any[]
): Promise<SupabaseQueryResult> {
  // Detect query type
  const trimmedSql = sql.trim();
  const upperSql = trimmedSql.toUpperCase();
  
  // Handle INSERT
  if (upperSql.startsWith('INSERT')) {
    return executeInsert(supabaseClient, sql, params);
  }
  
  // Handle UPDATE
  if (upperSql.startsWith('UPDATE')) {
    return executeUpdate(supabaseClient, sql, params);
  }
  
  // Handle DELETE
  if (upperSql.startsWith('DELETE')) {
    return executeDelete(supabaseClient, sql, params);
  }
  
  // Handle SELECT - try query builder first, fallback to raw SQL
  if (upperSql.startsWith('SELECT')) {
    // Try to extract table name
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      const query = buildSupabaseQuery(supabaseClient, table, sql, params);
      if (query) {
        try {
          const { data, error } = await query;
          if (error) throw error;
          return { rows: data || [] };
        } catch (err) {
          // Fallback to raw SQL if query builder fails
          return executeRawQuery(supabaseClient, sql, params);
        }
      }
    }
    // Complex SELECT - use raw SQL
    return executeRawQuery(supabaseClient, sql, params);
  }
  
  // For other queries (CREATE, ALTER, etc.), use raw SQL
  return executeRawQuery(supabaseClient, sql, params);
}

/**
 * Execute INSERT query
 */
async function executeInsert(
  supabaseClient: SupabaseClient,
  sql: string,
  params?: any[]
): Promise<SupabaseQueryResult> {
  // Parse INSERT INTO table (cols) VALUES ($1, $2, ...)
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch && params) {
    const table = insertMatch[1];
    const columns = insertMatch[2].split(',').map(c => c.trim());
    const values = insertMatch[3].split(',').map(v => v.trim());
    
    // Map parameterized values to actual values
    const data: any = {};
    columns.forEach((col, index) => {
      const valueExpr = values[index];
      if (valueExpr.startsWith('$')) {
        const paramIndex = parseInt(valueExpr.substring(1)) - 1;
        data[col] = params[paramIndex];
      } else {
        data[col] = valueExpr;
      }
    });
    
    const { data: result, error } = await supabaseClient.from(table).insert(data).select();
    if (error) throw error;
    return { rows: result || [] };
  }
  
  // Complex INSERT (ON CONFLICT, etc.) - use raw SQL
  return executeRawQuery(supabaseClient, sql, params);
}

/**
 * Execute UPDATE query
 */
async function executeUpdate(
  supabaseClient: SupabaseClient,
  sql: string,
  params?: any[]
): Promise<SupabaseQueryResult> {
  // Parse UPDATE table SET col1 = $1, col2 = $2 WHERE condition
  const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
  if (updateMatch && params) {
    const table = updateMatch[1];
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];
    
    // Parse SET clause
    const updates: any = {};
    const setPairs = setClause.split(',').map(s => s.trim());
    setPairs.forEach(pair => {
      const [col, val] = pair.split('=').map(s => s.trim());
      if (val.startsWith('$')) {
        const paramIndex = parseInt(val.substring(1)) - 1;
        updates[col] = params[paramIndex];
      }
    });
    
    // Parse WHERE clause (simplified)
    let query = supabaseClient.from(table).update(updates);
    if (whereClause.includes('=')) {
      const [col, val] = whereClause.split('=').map(s => s.trim());
      if (val.startsWith('$')) {
        const paramIndex = parseInt(val.substring(1)) - 1;
        query = query.eq(col.replace(/::\w+/g, ''), params[paramIndex]);
      }
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    return { rows: data || [] };
  }
  
  // Complex UPDATE - use raw SQL
  return executeRawQuery(supabaseClient, sql, params);
}

/**
 * Execute DELETE query
 */
async function executeDelete(
  supabaseClient: SupabaseClient,
  sql: string,
  params?: any[]
): Promise<SupabaseQueryResult> {
  // Parse DELETE FROM table WHERE condition
  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
  if (deleteMatch && params) {
    const table = deleteMatch[1];
    const whereClause = deleteMatch[2];
    
    let query = supabaseClient.from(table).delete();
    if (whereClause.includes('=')) {
      const [col, val] = whereClause.split('=').map(s => s.trim());
      if (val.startsWith('$')) {
        const paramIndex = parseInt(val.substring(1)) - 1;
        query = query.eq(col.replace(/::\w+/g, ''), params[paramIndex]);
      }
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    return { rows: data || [] };
  }
  
  // Complex DELETE - use raw SQL
  return executeRawQuery(supabaseClient, sql, params);
}

/**
 * Create a transaction wrapper
 * Note: Supabase doesn't support transactions in the JS SDK directly
 * For transactions, we'll use direct PostgreSQL connection
 */
export async function beginTransaction(
  supabaseClient: SupabaseClient
): Promise<SupabaseTransaction> {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set');
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? {
      rejectUnauthorized: false
    } : undefined,
    max: 1 // Single connection for transaction
  });
  
  const client = await pool.connect();
  await client.query('BEGIN');
  
  return {
    async query(text: string, params?: any[]): Promise<SupabaseQueryResult> {
      const result = await client.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount ?? undefined };
    },
    async commit(): Promise<void> {
      await client.query('COMMIT');
      client.release();
      await pool.end();
    },
    async rollback(): Promise<void> {
      await client.query('ROLLBACK');
      client.release();
      await pool.end();
    }
  };
}

/**
 * Execute RPC (stored procedure) call
 */
export async function executeRPC(
  supabaseClient: SupabaseClient,
  functionName: string,
  params?: any
): Promise<any> {
  const { data, error } = await supabaseClient.rpc(functionName, params || {});
  if (error) throw error;
  return data;
}

/**
 * Compatibility wrapper: Execute query with pool.query() interface
 * This makes migration easier - can replace pool.query() calls directly
 */
export async function query(
  supabaseClient: SupabaseClient,
  text: string,
  params?: any[]
): Promise<{ rows: any[]; rowCount?: number }> {
  return executeQuery(supabaseClient, text, params);
}

// Alias for easier migration
export const querySupabase = query;

/**
 * Compatibility wrapper: Get a client connection (for transactions)
 * Returns a transaction object that mimics pool.connect() behavior
 */
export async function connect(
  supabaseClient: SupabaseClient
): Promise<SupabaseTransaction> {
  return beginTransaction(supabaseClient);
}

// Alias for easier migration
export const connectSupabase = connect;

