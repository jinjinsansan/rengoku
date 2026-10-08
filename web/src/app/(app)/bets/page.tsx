import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, fmtJst, jstDate, jstMidnightUtc } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'

const RANGES = [
  { k: 'today', label: '今日', days: 0 },
  { k: '7d', label: '7 日', days: 6 },
  { k: 'month', label: '今月', days: -1 },
]

// BET 履歴 (brief/02_screens.md の 5)。期間の合計 → 日ごと → 1 回ずつ。
export default async function Bets({ searchParams }: { searchParams: Promise<{ r?: string; day?: string }> }) {
  const { userId } = await requireMember()
  const { r = 'today', day } = await searchParams
  const today = jstDate()
  const range = RANGES.find((x) => x.k === r) || RANGES[0]
  const from = day || (range.days === -1 ? `${today.slice(0, 7)}-01` : addDays(today, -range.days))
  const to = day ? addDays(day, 1) : addDays(today, 1)
  const { data } = await createAdminClient()
    .from('receiver_bets')
    .select('occurred_at, table_name, side, amount, outcome, pnl')
    .eq('user_id', userId)
    .gte('occurred_at', jstMidnightUtc(from))
    .lt('occurred_at', jstMidnightUtc(to))
    .order('occurred_at', { ascending: false })
    .limit(5000)
  const rows = data || []
  const sum = rows.reduce(
    (a, b) => {
      a.pnl += Number(b.pnl || 0)
      a.roll += Number(b.amount || 0)
      if (b.outcome === 'win') a.w++
      else if (b.outcome === 'lose') a.l++
      else a.t++
      return a
    },
    { pnl: 0, roll: 0, w: 0, l: 0, t: 0 }
  )
  const byDay = new Map<string, { pnl: number; n: number }>()
  for (const b of rows) {
    const d = jstDate(new Date(b.occurred_at))
    const x = byDay.get(d) || { pnl: 0, n: 0 }
    x.pnl += Number(b.pnl || 0)
    x.n++
    byDay.set(d, x)
  }

  return (
    <div>
      <div className="chips">
        {RANGES.map((x) => (
          <Link key={x.k} href={`/bets?r=${x.k}`} className={'chip' + (!day && r === x.k ? ' on' : '')}>{x.label}</Link>
        ))}
        {day && <span className="chip on">{day}</span>}
      </div>
      <section className="panel">
        <h2>合計</h2>
        <div className={'num big ' + pnlClass(sum.pnl)}>{signedUsd(sum.pnl)}</div>
        <div className="ash num" style={{ marginTop: 6 }}>
          ローリング {usd(sum.roll)} · {rows.length} 回 · {sum.w}-{sum.l}-{sum.t} · 勝率 {sum.w + sum.l ? ((sum.w / (sum.w + sum.l)) * 100).toFixed(1) : '-'}%
        </div>
      </section>
      {!day && byDay.size > 1 && (
        <section className="panel">
          <h2>日ごと</h2>
          {Array.from(byDay.entries()).map(([d, x]) => (
            <Link key={d} href={`/bets?day=${d}`} className="row">
              <span>{d}</span>
              <span className="num">{x.n} 回 <b className={pnlClass(x.pnl)}>{signedUsd(x.pnl)}</b></span>
            </Link>
          ))}
        </section>
      )}
      <section className="panel">
        <h2>1 回ずつ</h2>
        {rows.length === 0 && <p className="ash">この期間の BET はありません</p>}
        {rows.slice(0, 300).map((b, i) => (
          <div key={i} className="row" style={{ fontSize: 13 }}>
            <span className="ash num">{fmtJst(b.occurred_at)}</span>
            <span>{b.table_name}</span>
            <span className="num">{String(b.side || '').slice(0, 1).toUpperCase()} {usd(b.amount)}</span>
            <span className={'num ' + pnlClass(b.pnl)}>{b.outcome === 'push' ? '±0' : signedUsd(b.pnl)}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
