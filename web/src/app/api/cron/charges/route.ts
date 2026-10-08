import { NextResponse, type NextRequest } from 'next/server'
import { addDays, jstDate } from '@/lib/jst'
import { runCharges } from '@/lib/charges'

// Rengoku の締め (毎日 0:15 JST・vercel.json)。
//   1. bafather.uk の 0:05 の締めが daily_pnl_log に書いた前日の損益 (田辺チームはマスターが数えた値) を読む
//   2. 会員ごとに rg_daily_charges を 1 行作る (利益 × 率。マイナス・0 の日は「チャージなし」)
//   3. 期限 = 締め (翌日 0:00) + 24 時間。過ぎても自動で止めない (案内だけ)
//   4. 紹介報酬の土台: rg_settings.referral.mode = 'charge_pct' の時だけ、紹介者に pending の報酬を作る
// 同じ日を 2 回流しても二重にならない (user_id + settle_date が一意・既にある行は触らない)。
// 手動: GET /api/cron/charges?date=YYYY-MM-DD  (Authorization: Bearer <CRON_SECRET>)
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const qDate = new URL(req.url).searchParams.get('date')
  const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : addDays(jstDate(), -1)
  return NextResponse.json(await runCharges(date))
}
