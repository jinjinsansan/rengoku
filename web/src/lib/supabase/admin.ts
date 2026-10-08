import { createClient } from '@supabase/supabase-js'
import { supabaseUrl } from './env'

/** サーバーだけで使う (RLS を通さない)。必ず「本人の user_id で絞る」こと。 */
export function createAdminClient() {
  return createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
