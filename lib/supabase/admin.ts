import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Admin client uses the service role key.
// ONLY use this server-side (in server actions / route handlers).
// It bypasses RLS and email confirmation requirements.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
