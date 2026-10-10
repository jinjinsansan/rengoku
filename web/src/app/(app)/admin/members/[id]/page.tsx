import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card } from '@/components/card'
import { loadLive } from '@/lib/admin-live'
import { LivePanel } from '@/components/admin-live'
import { fmtCoin, fmtUsd, jstDay, loadWallet } from '@/lib/wallet-view'

const ROLE_JA: Record<string, string> = { owner: 'オーナー', staff: '運営', member: '会員' }
const STATUS_JA: Record<string, string> = { due: 'お支払い待ち', paid: '支払い済み', none: 'チャージなし', waived: '免除' }
const SIDE_JA: Record<string, string> = { player: 'P', banker: 'B', tie: 'T', P: 'P', B: 'B', T: 'T' }

// 管理画面: 会員 1 人のくわしい情報 (2026-10-10)。受け子のお金の状態・BET の履歴・精算・資産。見るだけ。
export default async function AdminMemberDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params
  const admin = createAdminClient()
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString()
  const [{ data: m }, { data: prof }, { data: rs }, live, { data: bets }, { data: charges }, wallet] = await Promise.all([
    admin.from('rg_members').select('*').eq('user_id', id).maybeSingle(),
    admin.from('profiles').select('email').eq('id', id).maybeSingle(),
    admin.from('receiver_status').select('executor_id, last_seen_at, engine_running, engine_sha, app_version, product').eq('user_id', id),
    loadLive(),
    admin.from('receiver_bets').select('occurred_at, executor_id, table_name, side, amount, result, outcome, pnl').eq('user_id', id).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(5000),
    admin.from('rg_daily_charges').select('settle_date, daily_pnl, carry_in, carry_out, charge_amount, status, paid_at').eq('user_id', id).order('settle_date', { ascending: false }).limit(30),
    loadWallet(id, { series: false }),
  ])
  if (!m) notFound()

  // 日ごと (日本時間) にまとめる
  const days = new Map<string, { n: number; w: number; l: number; t: number; pnl: number; roll: number }>()
  for (const b of bets || []) {
    const d = jstDay(b.occurred_at)
    const a = days.get(d) || { n: 0, w: 0, l: 0, t: 0, pnl: 0, roll: 0 }
    a.n += 1
    a.roll += Number(b.amount || 0)
    a.pnl += Number(b.pnl || 0)
    if (b.outcome === 'win') a.w += 1
    else if (b.outcome === 'lose') a.l += 1
    else a.t += 1
    days.set(d, a)
  }
  const dayRows = Array.from(days.entries()).sort((x, y) => y[0].localeCompare(x[0]))
  const cur = wallet.current

  return (
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        <Link href="/admin/members" className="rg-chip">‹ 会員の一覧</Link>
      </div>

      <Card en="MEMBER" ja={m.display_name || '(名前なし)'}>
        <div className="faint" style={{ fontSize: 12 }}>
          {ROLE_JA[m.role] || m.role} · {prof?.email || ''} · 入会 <span className="num">{String(m.joined_at).slice(0, 10)}</span>
        </div>
      </Card>

      <Card en="AGENT" ja="受け子とお金の状態">
        {(rs || []).length === 0 && <p className="sub">受け子はまだありません</p>}
        {(rs || []).map((r) => {
          const lv = live.get(r.executor_id)
          const on = Date.now() - new Date(r.last_seen_at).getTime() < 150_000 && r.engine_running !== false
          return (
            <div key={r.executor_id} style={{ marginBottom: 10 }}>
              <div className={'rg-online' + (on ? '' : ' off')}>
                <i />{r.executor_id} · {r.product} · 最後の通信 <span className="num">{fmtJst(r.last_seen_at)}</span>
                {r.engine_sha && <span className="faint"> · engine <span className="num">{String(r.engine_sha).slice(0, 8).toUpperCase()}</span></span>}
                {r.app_version && <span className="faint"> · GUI {r.app_version}</span>}
              </div>
              {lv ? <LivePanel r={lv} /> : <p className="faint" style={{ fontSize: 11 }}>マスターからのお金の状態は、まだ届いていません (田辺版の受け子だけ出ます)。</p>}
            </div>
          )
        })}
      </Card>

      <Card en="BETS" ja="BET の履歴 (直近 14 日・日本時間)">
        {dayRows.length === 0 && <p className="sub">この 14 日の BET はありません</p>}
        {dayRows.map(([d, a]) => (
          <div key={d} className="rg-row" style={{ fontSize: 12 }}>
            <span className="num" style={{ width: 84 }}>{d}</span>
            <span className="faint">{a.n} 回 · {a.w}-{a.l}-{a.t}</span>
            <span className="faint">ローリング <span className="num">{usd(a.roll)}</span></span>
            <span className={'num ' + pnlClass(a.pnl)} style={{ fontSize: 14 }}>{signedUsd(Math.round(a.pnl * 100) / 100)}</span>
          </div>
        ))}
        {(bets || []).length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="win" style={{ cursor: 'pointer', fontSize: 12 }}>直近の 30 回を見る</summary>
            {(bets || []).slice(0, 30).map((b, i) => (
              <div key={i} className="rg-row" style={{ fontSize: 11 }}>
                <span className="num" style={{ width: 120 }}>{fmtJst(b.occurred_at)}</span>
                <span className="faint" style={{ flex: 1 }}>{b.table_name}</span>
                <span>{SIDE_JA[String(b.side)] || b.side}</span>
                <span className="num">{usd(Number(b.amount || 0))}</span>
                <span className={'num ' + pnlClass(Number(b.pnl || 0))}>{signedUsd(Number(b.pnl || 0))}</span>
              </div>
            ))}
          </details>
        )}
        <p className="faint" style={{ fontSize: 10, marginBottom: 0 }}>受け子が送った BET の記録です。精算の損益はマスターが数えた値を使うので、少しずれることがあります。</p>
      </Card>

      <Card en="SETTLEMENT" ja="精算 (直近 30 日)">
        {(charges || []).length === 0 && <p className="sub">まだ精算はありません</p>}
        {(charges || []).map((c) => (
          <div key={c.settle_date} className="rg-row" style={{ fontSize: 12 }}>
            <span className="num" style={{ width: 84 }}>{c.settle_date}</span>
            <span className={'num ' + pnlClass(Number(c.daily_pnl || 0))}>{signedUsd(Number(c.daily_pnl || 0))}</span>
            {Number(c.carry_out) < 0 && <span className="faint">繰越 {signedUsd(Number(c.carry_out))}</span>}
            <span className="num">{Number(c.charge_amount) > 0 ? usd(Number(c.charge_amount)) : '-'}</span>
            <span className={c.status === 'due' ? 'win' : 'sub'}>{STATUS_JA[c.status] || c.status}</span>
          </div>
        ))}
      </Card>

      <Card en="ASSETS" ja="資産 (今の期間)">
        {!cur && <p className="sub">まだ記録がありません</p>}
        {cur && (
          <div style={{ fontSize: 12, lineHeight: 1.9 }}>
            {cur.currency} · {fmtJst(cur.startedAt)} から {cur.days} 日目
            <br />
            今の残高 <span className="num">{cur.kind === 'pegged' ? fmtUsd(cur.value ?? cur.coins) : fmtCoin(cur.coins, cur.currency)}</span>
            {cur.kind === 'priced' && cur.value != null && <span className="faint"> (≈ {fmtUsd(cur.value)})</span>}
            {' '}· 元本 <span className="num">{cur.kind === 'pegged' ? fmtUsd(cur.principalUsd ?? cur.startCoins) : fmtCoin(cur.principalCoins, cur.currency)}</span>
            <br />
            トレード <span className={'num ' + pnlClass(cur.tradeUsd)}>{fmtUsd(cur.tradeUsd, true)}</span>
            {cur.capital != null && <> · 値上がり益 <span className={'num ' + pnlClass(cur.capital)}>{fmtUsd(cur.capital, true)}</span></>}
            {wallet.history.length > 0 && <> · これまでの期間 {wallet.history.length}</>}
          </div>
        )}
      </Card>
    </div>
  )
}
