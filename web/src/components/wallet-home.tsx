import Link from 'next/link'
import { fmtCoin, fmtUsd, type WPeriod } from '@/lib/wallet-view'
import { Breakdown } from '@/components/wallet-bar'
import { CurBadge } from '@/components/wallet'

// ホームの「資産」カード (README_WALLET.md W1)。今日の利益のすぐ下・押すと資産の画面。
export function AssetCard({ p }: { p: WPeriod }) {
  const hero = p.kind === 'pegged' ? fmtUsd(p.value ?? p.coins) : fmtCoin(p.coins, p.currency).split(' ')[0]
  const sub = p.kind === 'priced' ? (p.value != null ? `≈ ${fmtUsd(p.value)}` : '') : p.kind === 'pegged' ? `元本 ${fmtUsd(p.principalUsd ?? p.startCoins)}` : ''
  const trade = { color: 'var(--rg-w-trade-text)', down: 'var(--rg-w-down-text)' }
  const stats =
    p.kind === 'priced'
      ? [
          { label: 'トレードで増えた枚数', value: fmtCoin(p.tradeCoins, p.currency, true), color: p.tradeCoins < 0 ? trade.down : trade.color, sw: 'var(--rg-w-seg-trade)' },
          { label: '値上がり益', value: fmtUsd(p.capital ?? 0, true), color: (p.capital ?? 0) < 0 ? trade.down : 'var(--rg-w-market-text)', sw: 'var(--rg-w-seg-market)' },
        ]
      : p.kind === 'pegged'
        ? [{ label: 'トレードの損益（今の期間）', value: fmtUsd(p.tradeUsd, true), color: p.tradeUsd < 0 ? trade.down : trade.color, sw: 'var(--rg-w-seg-trade)' }]
        : [{ label: 'トレードで増えた枚数', value: fmtCoin(p.tradeCoins, p.currency, true), color: p.tradeCoins < 0 ? trade.down : trade.color, sw: 'var(--rg-w-seg-trade)' }]
  return (
    <Link href="/assets" className="rg-w-card full">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="rg-head-en">ASSETS</span>
        <span className="rg-head-ja">資産</span>
        <CurBadge cur={p.currency} size="sm" />
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#F2C463' }}>資産を見る ›</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span className="num" style={{ fontSize: 40, lineHeight: 1.2, color: '#F2C463' }}>{hero}</span>
        {p.kind !== 'pegged' && <span style={{ fontFamily: 'var(--rg-font-label)', fontWeight: 600, fontSize: 14, letterSpacing: '.1em', color: '#E9C98A' }}>{p.currency}</span>}
        {sub && <span className="num" style={{ marginLeft: 'auto', fontSize: 15, color: '#E9DCC8' }}>{sub}</span>}
      </div>
      {p.kind !== 'unsupported' && <Breakdown variant="thin" principal={p.principalUsd ?? 0} trade={p.tradeUsd} market={p.capital} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', marginTop: 4 }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: i ? 14 : 0, borderLeft: i ? '1px solid rgba(255,200,61,.18)' : 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A89078' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: s.sw }} />
              {s.label}
            </span>
            <span className="num" style={{ fontSize: 20, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
    </Link>
  )
}
