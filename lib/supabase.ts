import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

type NoopResult<T> = PromiseLike<{ data: T | null; error: null }> & {
  select: () => NoopResult<T>;
  order: () => NoopResult<T>;
  limit: () => NoopResult<T>;
  eq: () => NoopResult<T>;
  single: () => NoopResult<T>;
  insert: () => NoopResult<T>;
  update: () => NoopResult<T>;
  delete: () => NoopResult<T>;
};

function createNoopResult<T>(): NoopResult<T> {
  const result: Partial<NoopResult<T>> = {
    select: () => result as NoopResult<T>,
    order: () => result as NoopResult<T>,
    limit: () => result as NoopResult<T>,
    eq: () => result as NoopResult<T>,
    single: () => result as NoopResult<T>,
    insert: () => result as NoopResult<T>,
    update: () => result as NoopResult<T>,
    delete: () => result as NoopResult<T>,
    then: (onfulfilled, onrejected) =>
      Promise.resolve({ data: null, error: null }).then(
        onfulfilled,
        onrejected
      ),
  };

  return result as NoopResult<T>;
}

function createNoopSupabase() {
  return {
    from: <T = unknown>() => createNoopResult<T>(),
    rpc: <T = unknown>() => createNoopResult<T>(),
  };
}

if (!isSupabaseConfigured) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars. Running in blank demo mode."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    })
  : (createNoopSupabase() as any);
