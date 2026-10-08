import { createClient } from '@supabase/supabase-js'

/** サーバーだけで使う (RLS を通さない)。必ず「本人の user_id で絞る」こと。 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
