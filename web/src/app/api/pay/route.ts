import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrReuseOrder } from '@/lib/pay'

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return (data?.claims?.sub as string | undefined) || null
}

// POST: 未払いのチャージをまとめた送金の注文を作る (または期限内の同じ注文を返す)
export async function POST() {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const r = await createOrReuseOrder(uid)
    if ('none' in r) return NextResponse.json({ ok: true, none: true })
    return NextResponse.json({ ok: true, ...r, address: process.env.PAYMENT_USDT_TRC20_ADDRESS || '' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}

// GET ?order=<id>: 自分の注文の状態 (pending / credited / expired)
export async function GET(req: NextRequest) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('order') || ''
  const { data } = await createAdminClient()
    .from('crypto_payments')
    .select('status, expires_at, credited_at')
    .eq('id', id).eq('user_id', uid).eq('kind', 'rg_charge')
    .maybeSingle()
  if (!data) return NextResponse.json({ ok: false }, { status: 404 })
  const expired = data.status === 'pending' && new Date(data.expires_at).getTime() < Date.now()
  return NextResponse.json({ ok: true, status: expired ? 'expired' : data.status, credited_at: data.credited_at })
}
