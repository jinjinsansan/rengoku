import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 招待コードの事前確認 (bafather.uk と同じ invite_codes を読む)。実際の消費は DB のトリガーが行う。
// 存在しないコードも無効なコードも同じ答えにする (どのコードがあるか分からないように)。
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { code?: unknown }
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!code || code.length > 64) return NextResponse.json({ ok: false }, { status: 400 })
  const { data, error } = await createAdminClient()
    .from('invite_codes')
    .select('active, max_uses, uses, expires_at')
    .eq('code', code)
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false }, { status: 503 })
  const expired = data?.expires_at && new Date(data.expires_at) < new Date()
  const full = data && data.max_uses !== null && data.max_uses !== undefined && data.uses >= data.max_uses
  if (!data || !data.active || expired || full) return NextResponse.json({ ok: false }, { status: 403 })
  return NextResponse.json({ ok: true })
}
