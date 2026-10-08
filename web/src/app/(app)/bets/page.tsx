import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, fmtJst, jstDate, jstMidnightUtc } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card, Stat } from '@/components/card'

const RANGES = [
  { k: 'today', label: '今日', days: 0 },
  { k: '7d', label: '7 日', days: 6 },
  { k: 'month', label: '今月', days: -1 },
]

// BET 履歴: 期間の合計 → 日ごと → 1 回ずつ。
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
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        {RANGES.map((x) => (
          <Link key={x.k} href={`/bets?r=${x.k}`} className={'rg-chip' + (!day && r === x.k ? ' on' : '')}>{x.label}</Link>
        ))}
        {day && <span className="rg-chip on">{day}</span>}
      </div>

      <Card tone="hero" en="TOTAL" ja="期間の合計">
        <div className={'rg-hero-num ' + pnlClass(sum.pnl)} style={{ fontSize: 56 }}>{signedUsd(sum.pnl)}</div>
        <div className="rg-sep" />
        <div className="rg-stats">
          <Stat label="ローリング">{usd(sum.roll)}</Stat>
          <Stat label="BET 回数">{rows.length}</Stat>
          <Stat label="勝率">{sum.w + sum.l ? ((sum.w / (sum.w + sum.l)) * 100).toFixed(1) : '-'}%</Stat>
        </div>
      </Card>

      {!day && byDay.size > 1 && (
        <Card en="DAILY" ja="日ごと">
          {Array.from(byDay.entries()).map(([d, x]) => (
            <Link key={d} href={`/bets?day=${d}`} className="rg-row">
              <span className="num">{d}</span>
              <span className="sub" style={{ fontSize: 12 }}><span className="num">{x.n}</span> 回</span>
              <span className={'num ' + pnlClass(x.pnl)} style={{ fontSize: 17 }}>{signedUsd(x.pnl)}</span>
            </Link>
          ))}
        </Card>
      )}

      <Card en="BETS" ja="1 回ずつ" aside={`${rows.length} 件`}>
        {rows.length === 0 && <p className="sub">この期間の BET はありません</p>}
        {rows.slice(0, 300).map((b, i) => (
          <div key={i} className="rg-row" style={{ fontSize: 12 }}>
            <span className="num sub" style={{ width: 86 }}>{fmtJst(b.occurred_at)}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.table_name}</span>
            <span className="num">{String(b.side || '').slice(0, 1).toUpperCase()} {usd(b.amount)}</span>
            <span className={'num ' + (b.outcome === 'push' ? 'draw' : pnlClass(b.pnl))} style={{ width: 64, textAlign: 'right', fontSize: 15 }}>
              {b.outcome === 'push' ? '±0' : signedUsd(b.pnl)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
