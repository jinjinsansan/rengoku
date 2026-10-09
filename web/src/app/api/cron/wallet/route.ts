import { NextResponse, type NextRequest } from 'next/server'
import { processWalletPush, type WalletPush } from '@/lib/wallet'

// 資産の画面の記録 (2026-10-10)。VPS の cron が 10 分ごとに、マスターの /api/mirror/wallet の中身を
// そのまま POST してくる (Authorization: Bearer <CRON_SECRET>)。会員サイトはマスターの鍵を持たない。
export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => null)) as WalletPush | null
  if (!body || !Array.isArray(body.executors) || !Array.isArray(body.bets)) {
    return NextResponse.json({ ok: false, error: 'executors[] and bets[] required' }, { status: 400 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await processWalletPush(body)) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
