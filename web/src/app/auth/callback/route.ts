import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 確認メールのリンクの戻り先。Supabase の「Redirect URLs」に Rengoku のドメインの /auth/callback を足しておくこと。
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/home'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/home'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url))
  }
  return NextResponse.redirect(new URL('/login', request.url))
}
