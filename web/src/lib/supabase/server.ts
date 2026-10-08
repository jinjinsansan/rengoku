import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from './env'

/** ログイン中の会員として読む (RLS が効く)。 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component から呼ばれた時は書けない (middleware が更新する)
          }
        },
      },
    }
  )
}
