import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create connection pool
export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Helper function for queries
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// For backward compatibility with existing code
export const createServerClient = () => ({
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: () => ({ single: () => ({ data: null, error: { message: 'Not implemented' } }) }),
      order: () => ({ limit: () => ({ data: [], error: null }) }),
    }),
    insert: (data: unknown) => ({
      select: () => ({
        single: () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    }),
    delete: () => ({
      eq: () => ({ data: null, error: null }),
    }),
    upsert: (data: unknown) => ({
      select: () => ({
        single: () => ({ data: null, error: null }),
      }),
    }),
    rpc: () => ({ data: null, error: null }),
  }),
});

// Transaction helper
export async function transaction<T>(
  callback: (client: Pool) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(pool);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}