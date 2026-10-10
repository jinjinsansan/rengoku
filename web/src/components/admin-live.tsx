// 管理画面: 受け子 1 台の「お金の状態」のパネル (2026-10-10)。見るだけ (変えるのはマスター画面)。
import { fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { fmtBalance } from '@/lib/wallet-core'
import { balanceShare, isStale, modeLabel, stopLabel, type LiveRow } from '@/lib/admin-live'

function Row({ k, children, warn }: { k: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12, padding: '3px 0' }}>
      <span className="faint" style={{ width: 92, flex: 'none' }}>{k}</span>
      <span style={{ flex: 1, color: warn ? 'var(--rg-w-warn)' : undefined }}>{children}</span>
    </div>
  )
}

export function LivePanel({ r }: { r: LiveRow }) {
  const m = r.money || {}
  const share = balanceShare(r)
  const stop = stopLabel(m)
  const caps = m.cap_skips_today
  const wl = `${m.wins ?? 0}-${m.losses ?? 0}-${m.ties ?? 0}`
  return (
    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,200,61,.18)', background: 'rgba(10,5,3,.35)' }}>
      <Row k="Stake の残高">
        <span className="num" style={{ fontSize: 14 }}>{fmtBalance(r.balance ?? null, r.currency || '')}</span>
        {share != null && share < 0.7 && (
          <span style={{ color: 'var(--rg-w-warn)', marginLeft: 8 }}>⚠ 元本の {Math.round(share * 100)}% しかない</span>
        )}
      </Row>
      <Row k="方式">{modeLabel(m)}</Row>
      <Row k="元本 (設定)">
        <span className="num">{usd(Number(m.bankroll || 0))}</span>
        <span className="faint"> · 倍率 {Number(m.ratio || 0).toFixed(2)} · 1 段目 <span className="num">{usd(Number(m.unit || 0))}</span></span>
      </Row>
      <Row k="今の段・次の額">
        {Number(m.step || 0) + 1} 段目 · 次 <span className="num">{usd(Number(m.next_amount || 0))}</span>
        {m.last_kind && <span className="faint"> · 直前 {m.last_kind === 'win' ? '勝ち' : m.last_kind === 'lose' ? '負け' : m.last_kind === 'tie' ? '引き分け' : m.last_kind} <span className="num">{usd(Number(m.last_amount || 0))}</span></span>}
      </Row>
      <Row k="今日">
        <span className={'num ' + pnlClass(Number(r.today?.pnl || 0))}>{r.today?.pnl == null ? '-' : signedUsd(Number(r.today.pnl))}</span>
        <span className="faint"> · BET {r.today?.bets ?? 0} 回 · ローリング <span className="num">{usd(Number(r.today?.rolling || 0))}</span></span>
      </Row>
      <Row k="今のセッション">
        <span className={'num ' + pnlClass(Number(m.session_pnl || 0))}>{signedUsd(Number(m.session_pnl || 0))}</span>
        <span className="faint"> · 勝-負-分 {wl}</span>
      </Row>
      {stop && <Row k="止まっている" warn>{stop}</Row>}
      {caps && caps.count > 0 && (
        <Row k="上限の壁" warn>
          今日 {caps.count} 回、BET を配らなかった
          {caps.last?.amount != null && (
            <> (最後 {caps.last.at ? fmtJst(caps.last.at) : ''}: ${caps.last.amount} が上限 ${caps.last.cap} を超えた・残高 ${caps.last.balance})</>
          )}
        </Row>
      )}
      <div className="faint" style={{ fontSize: 10, marginTop: 4 }}>
        {r.table_name ? `卓 ${r.table_name} · ` : ''}マスターの記録 {fmtJst(r.pushed_at)}{isStale(r) ? ' (古い・マスターから届いていない)' : ''}
      </div>
    </div>
  )
}
