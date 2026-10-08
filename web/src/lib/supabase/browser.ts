import { createBrowserClient } from '@supabase/ssr'
import type { PublicSupabase } from './env'

/** ブラウザ用。接続先はサーバーの画面から渡してもらう (lib/supabase/env.ts の説明)。 */
export function createClient(cfg: PublicSupabase) {
  return createBrowserClient(cfg.url, cfg.anonKey)
}
