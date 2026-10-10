import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 受け子ごとの「お金の状態」(2026-10-10)。VPS の cron が 1 分ごとに、マスターの /api/mirror/receivers-live の中身を
// そのまま POST してくる (Authorization: Bearer <CRON_SECRET>)。最新の 1 件だけを残す。管理画面が読む。
export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => null)) as { now?: string; master?: Record<string, unknown>; receivers?: { executor_id: string }[] } | null
  if (!body || !Array.isArray(body.receivers)) return NextResponse.json({ ok: false, error: 'receivers[] required' }, { status: 400 })
  const at = new Date().toISOString()
  const rows = body.receivers
    .filter((r) => r && r.executor_id)
    .map((r) => ({ executor_id: String(r.executor_id), data: { ...r, master_now: body.now || null }, pushed_at: at }))
  if (body.master) rows.push({ executor_id: '__master__', data: { executor_id: '__master__', money: body.master, master_now: body.now || null } as never, pushed_at: at })
  const { error } = await createAdminClient().from('rg_receiver_live').upsert(rows, { onConflict: 'executor_id' })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, rows: rows.length })
}
