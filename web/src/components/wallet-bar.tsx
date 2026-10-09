'use client'

// 価値の分解 (README_WALLET.md W3)。元本は帯の 44% に縮め、残り 54% に増減を同じ縮尺で描く。
import { useEffect, useState } from 'react'

const C = {
  principal: 'var(--rg-w-seg-principal)',
  trade: 'var(--rg-w-seg-trade)',
  market: 'var(--rg-w-seg-market)',
  neg: 'var(--rg-w-seg-neg)',
}

function usd(x: number, sign = false) {
  const s = '$' + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (sign ? (x < 0 ? '−' : '+') : '') + s
}
function coin(x: number, sym: string, sign = false) {
  return (sign ? (x < 0 ? '−' : '+') : '') + Math.abs(x).toFixed(4) + ' ' + sym
}

function geometry(P: number, t: number, a: number) {
  const lo = Math.min(0, t, t + a)
  const hi0 = Math.max(0, t, t + a)
  const hi = hi0 === lo ? lo + 1 : hi0
  const pos = (x: number) => 44 + ((x - lo) / (hi - lo)) * 54
  return { pos, v: P + t + a }
}

export function Breakdown({
  variant = 'full', principal, trade, market, coinPrincipal, coinTrade, coinSym,
}: {
  variant?: 'full' | 'thin'
  principal: number
  trade: number
  market: number | null
  coinPrincipal?: number | null
  coinTrade?: number | null
  coinSym?: string | null
}) {
  const [grown, setGrown] = useState(false)
  const [mode, setMode] = useState<'usd' | 'coin'>('usd')
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 120)
    return () => clearTimeout(t)
  }, [])

  const coinMode = mode === 'coin' && !!coinSym && coinPrincipal != null && coinTrade != null
  const P = coinMode ? Number(coinPrincipal) : principal
  const t = coinMode ? Number(coinTrade) : trade
  const hasMarket = !coinMode && market != null
  const a = hasMarket ? Number(market) : 0
  const { pos, v } = geometry(P, t, a)

  const segs: { left: number; width: number; bg: string; edge: string; delay: number }[] = []
  const add = (from: number, to: number, bg: string, edge: string, i: number) =>
    segs.push({ left: from, width: Math.max(0, to - from), bg, edge, delay: i * 0.18 })
  add(0, pos(0), C.principal, 'inset -1px 0 0 rgba(20,10,6,.8)', 0)
  if (t !== 0) add(pos(Math.min(0, t)), pos(Math.max(0, t)), t > 0 ? C.trade : C.neg, t > 0 ? 'inset -1px 0 0 rgba(20,10,6,.6)' : 'inset 0 0 0 1px #7FB2FF', 1)
  if (hasMarket && a !== 0) add(pos(Math.min(t, t + a)), pos(Math.max(t, t + a)), a > 0 ? C.market : C.neg, a > 0 ? 'none' : 'inset 0 0 0 1px #7FB2FF', 2)

  const bar = (
    <div className={'rg-w-bar' + (variant === 'thin' ? ' thin' : '')}>
      <div className="track">
        {segs.map((s, i) => (
          <div
            key={i}
            className="rg-w-seg"
            style={{ left: s.left + '%', width: (grown ? s.width : 0) + '%', background: s.bg, boxShadow: variant === 'thin' ? 'none' : s.edge, transitionDelay: s.delay + 's' }}
          />
        ))}
        <div className="rg-w-cut" />
      </div>
      {variant === 'full' && <div className="rg-w-mark" style={{ left: pos(v - P) + '%', opacity: grown ? 1 : 0 }} />}
    </div>
  )
  if (variant === 'thin') return bar

  const f = (x: number, s = false) => (coinMode ? coin(x, String(coinSym), s) : usd(x, s))
  const col = (x: number, pos: string) => (x < 0 ? 'var(--rg-w-down-text)' : pos)
  const rows = [
    { label: '元本', value: f(P), color: '#E9DCC8', bg: C.principal, edge: 'none' },
    { label: coinMode ? 'トレードで増えた枚数' : 'トレードの損益', value: f(t, true), color: col(t, 'var(--rg-w-trade-text)'), bg: t >= 0 ? C.trade : C.neg, edge: t >= 0 ? 'none' : 'inset 0 0 0 1px #7FB2FF' },
  ]
  if (hasMarket) rows.push({ label: '値上がり益', value: f(a, true), color: col(a, 'var(--rg-w-market-text)'), bg: a >= 0 ? C.market : C.neg, edge: a >= 0 ? 'none' : 'inset 0 0 0 1px #7FB2FF' })
  let note: string
  if (coinMode) note = `枚数で見ると、増えた ${coin(t, String(coinSym), true)} はトレードの成果だけです。値段が動いても、この枚数は変わりません。`
  else if (!hasMarket) note = 'ドルのまま運用しているので、トレードの成果がそのまま積み上がります。'
  else if (a >= 0) note = `トレードの成果 ${usd(t, true)} に、相場の値上がり ${usd(a, true)} が加わっています。`
  else note = `相場の動きで ${usd(a, true)} となりました。トレードの成果 ${usd(t, true)} はそのまま残っていて、値段が戻れば価値も戻ります。`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 }}>
        <span style={{ fontSize: 11, color: '#A89078' }}>元本の長さは縮めて表示しています</span>
        {coinSym && coinPrincipal != null && (
          <div className="rg-w-toggle">
            <button type="button" className={coinMode ? '' : 'on'} onClick={() => setMode('usd')}>ドル</button>
            <button type="button" className={coinMode ? 'on' : ''} onClick={() => setMode('coin')}>枚数</button>
          </div>
        )}
      </div>
      {bar}
      <div>
        {rows.map((r) => (
          <div key={r.label} className="rg-w-row">
            <span style={{ width: 10, height: 10, borderRadius: 2, flex: 'none', background: r.bg, boxShadow: r.edge }} />
            <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
            <span className="num" style={{ fontSize: 18, color: r.color }}>{r.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingTop: 10 }}>
          <span className="mincho" style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{coinMode ? '今の枚数' : '今の価値'}</span>
          <span className="num" style={{ fontSize: 26, lineHeight: 1, color: '#FFF4E2' }}>{f(v)}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: '#C9B8A6' }}>{note}</div>
    </div>
  )
}
