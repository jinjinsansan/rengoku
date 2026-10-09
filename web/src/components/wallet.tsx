// 資産の画面の部品 (README_WALLET.md)。通貨のバッジ・枚数の成長のグラフ。
import type { ChartMark, ChartPoint } from '@/lib/wallet-view'

const BADGE: Record<string, { glyph: string; fg: string; bg: string; line: string }> = {
  BTC: { glyph: '₿', fg: 'var(--rg-w-btc)', bg: 'var(--rg-w-btc-bg)', line: 'var(--rg-w-btc-line)' },
  ETH: { glyph: 'Ξ', fg: 'var(--rg-w-eth)', bg: 'var(--rg-w-eth-bg)', line: 'var(--rg-w-eth-line)' },
  USDT: { glyph: '₮', fg: 'var(--rg-w-usdt)', bg: 'var(--rg-w-usdt-bg)', line: 'var(--rg-w-usdt-line)' },
  USDC: { glyph: '$', fg: 'var(--rg-w-usdc)', bg: 'var(--rg-w-usdc-bg)', line: 'var(--rg-w-usdc-line)' },
  DOGE: { glyph: 'Ð', fg: 'var(--rg-w-unsupported)', bg: 'var(--rg-w-unsupported-bg)', line: 'var(--rg-w-unsupported-line)' },
}
export function badgeColor(cur: string): string {
  return (BADGE[String(cur).toUpperCase()] || BADGE.DOGE).fg
}

export function CurBadge({ cur, size = '' }: { cur: string; size?: '' | 'sm' | 'lg' }) {
  const c = String(cur || '').toUpperCase()
  const b = BADGE[c] || { ...BADGE.DOGE, glyph: c.slice(0, 1) }
  return (
    <span className={'rg-w-badge ' + size} style={{ color: b.fg, background: b.bg, borderColor: b.line }}>
      <b>{b.glyph}</b>
      <i>{c}</i>
    </span>
  )
}

/** 枚数 (ドル) の成長のグラフ。viewBox 0 0 320 160、描く範囲 x 44〜304・y 16〜128、上下に 18% の余白。 */
export function GrowthChart({ points, principal, marks, unit }: { points: ChartPoint[]; principal: number; marks: ChartMark[]; unit: 'coin' | 'usd' | 'coin2' }) {
  if (!points.length) return null
  const X0 = 44, X1 = 304, Y0 = 16, Y1 = 128
  const vals = points.map((p) => p.v).concat(principal)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(hi) * 0.02, 1e-6)
  lo -= pad
  hi += pad
  const x = (i: number) => X0 + (points.length === 1 ? (X1 - X0) / 2 : (i / (points.length - 1)) * (X1 - X0))
  const y = (v: number) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0)
  const fmtY = (v: number) =>
    unit === 'usd' ? '$' + Math.round(v).toLocaleString('en-US') : unit === 'coin2' ? Math.round(v).toLocaleString('en-US') : v.toFixed(4)
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area =
    'M' + points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' L') +
    ` L${x(points.length - 1).toFixed(1)},${y(principal).toFixed(1)} L${x(0).toFixed(1)},${y(principal).toFixed(1)} Z`
  const grid = [0, 0.5, 1].map((f) => {
    const v = lo + pad + f * (hi - lo - 2 * pad)
    return { y: y(v), label: fmtY(v) }
  })
  const MC = { start: '#F2C463', change: '#F2C463', in: '#FF9A5A', out: '#7FB2FF' }
  const step = points.length <= 7 ? 1 : Math.ceil(points.length / 6)
  const last = points.length - 1
  return (
    <svg width="100%" viewBox="0 0 320 160" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="成長のグラフ">
      <defs>
        <linearGradient id="rgwA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2C463" stopOpacity=".42" />
          <stop offset="1" stopColor="#F2C463" stopOpacity=".06" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1="40" x2="314" y1={g.y} y2={g.y} stroke="rgba(255,200,61,.1)" strokeWidth="1" />
          <text x="36" y={g.y + 3} textAnchor="end" fontFamily="Saira Condensed" fontSize="10" fill="#8E7A66">{g.label}</text>
        </g>
      ))}
      <path d={area} fill="url(#rgwA)" />
      <line x1="40" x2="314" y1={y(principal)} y2={y(principal)} stroke="rgba(246,234,214,.55)" strokeWidth="1.2" strokeDasharray="4 4" />
      <polyline points={line} fill="none" stroke="#F2C463" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        i % step === 0 || i === last ? (
          <text key={i} x={x(i)} y="156" textAnchor="middle" fontFamily="Saira Condensed" fontSize="10.5" fill="#A89078">{p.d}</text>
        ) : null,
      )}
      {marks.map((m, i) => {
        const cx = x(m.i)
        const cy = y(points[m.i]?.v ?? principal)
        return (
          <g key={i}>
            <polygon points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}`} fill={MC[m.kind]} stroke="#140A06" strokeWidth="1" />
            <text x={cx + 8} y={cy - 8} fontSize="9.5" fill={MC[m.kind]}>{m.text}</text>
          </g>
        )
      })}
      <circle cx={x(last)} cy={y(points[last].v)} r="7" fill="rgba(255,200,61,.18)" />
      <circle cx={x(last)} cy={y(points[last].v)} r="3.5" fill="#FFF4E2" />
    </svg>
  )
}
