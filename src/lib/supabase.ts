// Deprecated: This module is kept for backward compatibility
// All code now uses src/lib/db.ts with pg driver instead of Supabase
export { pool, query, transaction } from './db';

// Backward compatibility wrapper (no-op, functions removed)
export const createServerClient = () => {
  console.warn('Supabase createServerClient is deprecated. Use db.query() directly.');
  return {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: { message: 'Deprecated' } }) }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      rpc: () => ({ data: null, error: null }),
    }),
  };
};