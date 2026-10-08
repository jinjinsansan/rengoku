// Supabase の接続先。Vercel では NEXT_PUBLIC_ の名前を「秘密」にできず保存できないことがあるので、
// サーバーでは SUPABASE_URL / SUPABASE_ANON_KEY を読み、ブラウザへはサーバーから渡す (どちらの名前でも動く)。
export function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
}

export function supabaseAnonKey(): string {
  return (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
}

export type PublicSupabase = { url: string; anonKey: string }

export function publicSupabase(): PublicSupabase {
  return { url: supabaseUrl(), anonKey: supabaseAnonKey() }
}
