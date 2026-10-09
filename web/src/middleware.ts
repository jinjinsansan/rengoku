import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env'

// ログインの状態を毎回新しくする。会員の画面に未ログインで来たら /login へ。
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  // ★getClaims = ログインの印 (JWT) の署名を手元で確かめる (ES256)。getUser のように毎回 Supabase へ問い合わせない。
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/home/:path*', '/salon/:path*', '/bets/:path*', '/settlement/:path*', '/me/:path*', '/referral/:path*', '/notifications/:path*', '/admin/:path*', '/assets/:path*'],
}
