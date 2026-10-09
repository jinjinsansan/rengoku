import Link from 'next/link'
import { isStaff, requireMember } from '@/lib/member'
import { DEMO_SCENARIOS, demoWallet } from '@/lib/wallet-demo'
import { AssetCard } from '@/components/wallet-home'
import { fmtCoin, fmtUsd, jstDay, loadWallet, type WPeriod } from '@/lib/wallet-view'
import { Breakdown } from '@/components/wallet-bar'
import { CurBadge, GrowthChart, badgeColor } from '@/components/wallet'

// 資産の画面 (README_WALLET.md W2)。BTC・ETH の会員は「トレードで増えた枚数」と「値上がり益」を分けて見せる。
const BANNER = {
  gold: { d: '#F2C463', line: 'rgba(255,200,61,.55)' },
  warn: { d: 'var(--rg-w-warn)', line: 'var(--rg-w-warn-line)' },
  grey: { d: '#B9A48F', line: 'rgba(185,164,143,.45)' },
}
const WD = ['日', '月', '火', '水', '木', '金', '土']

function md(iso: string) {
  const d = jstDay(iso)
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
}
function priceStr(v: number | null) {
  return v == null ? '-' : '$' + Math.round(v).toLocaleString('en-US')
}
function principalStr(p: WPeriod) {
  if (p.kind === 'pegged') return fmtUsd(p.principalUsd ?? p.startCoins)
  if (p.kind === 'unsupported') return fmtCoin(p.principalCoins, p.currency)
  return `${fmtCoin(p.startCoins, p.currency)} @ ${priceStr(p.startPrice)} = ${fmtUsd(p.principalUsd ?? 0)}`
}
function tc(v: number) {
  return v < 0 ? 'var(--rg-w-down-text)' : 'var(--rg-w-trade-text)'
}
function mc(v: number) {
  return v < 0 ? 'var(--rg-w-down-text)' : 'var(--rg-w-market-text)'
}

export default async function Assets({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { userId, member } = await requireMember()
  const { demo } = await searchParams
  // 運営だけ: 見本の数字で画面を確かめる (/assets?demo=btc|usdt|new|doge|mismatch)。データベースは読まない
  const isDemo = isStaff(member) && !!demo && (DEMO_SCENARIOS as readonly string[]).includes(demo)
  const w = isDemo ? demoWallet(String(demo)) : await loadWallet(userId)
  const cur = w.current
  const notes = ['手数料はトレードの利益（ドル）にだけかかり、値上がり益にはかかりません。', 'BTC や ETH の値段が下がると、トレードで勝っていてもドルの価値は減ることがあります。枚数は減りません。']

  return (
    <div style={{ display: 'grid', gridAutoRows: 'max-content', gap: 14 }}>
      {isStaff(member) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 11, color: '#8E7A66' }}>
          <span>見本 (運営だけ):</span>
          {DEMO_SCENARIOS.map((sc) => (
            <Link key={sc} href={`/assets?demo=${sc}`} className="rg-w-tag" style={{ color: demo === sc ? '#140A06' : undefined, background: demo === sc ? '#F2C463' : undefined }}>{sc}</Link>
          ))}
          {isDemo && <Link href="/assets" className="rg-w-tag">本物に戻す</Link>}
        </div>
      )}
      {isDemo && cur && <AssetCard p={cur} />}
      {w.banners.map((b, i) => (
        <div key={i} className="rg-w-banner" style={{ borderColor: BANNER[b.tone].line }}>
          <span className="d" style={{ background: BANNER[b.tone].d }} />
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>{b.text}</span>
          {b.link && <Link href={b.href} style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: '#F2C463', marginTop: 2, whiteSpace: 'nowrap' }}>{b.link}</Link>}
        </div>
      ))}

      {!cur && (
        <div className="rg-w-card" style={{ border: '1px dashed rgba(255,200,61,.3)', alignItems: 'center', textAlign: 'center', padding: '22px 20px', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.svg" alt="" width={56} height={56} style={{ opacity: 0.55 }} />
          <div className="mincho" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '.06em' }}>まだ記録がありません</div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: '#C9B8A6' }}>
            受け子が動き始めると、財布の通貨と残高を自動で見つけ、元本を記録します。ここに「枚数の成長」と「価値の分解」が表示されます。
          </div>
        </div>
      )}

      {cur && <NowCard p={cur} />}

      {cur && !w.isNew && <Tiles p={cur} />}

      {cur && !w.isNew && cur.kind !== 'unsupported' && (
        <div className="rg-w-card">
          <div className="rg-head" style={{ marginBottom: 0 }}><span className="rg-head-en">BREAKDOWN</span><span className="rg-head-ja">価値の分解</span></div>
          <Breakdown
            principal={cur.principalUsd ?? 0}
            trade={cur.tradeUsd}
            market={cur.kind === 'priced' ? cur.capital ?? 0 : null}
            coinPrincipal={cur.kind === 'priced' ? cur.principalCoins : null}
            coinTrade={cur.kind === 'priced' ? cur.tradeCoins : null}
            coinSym={cur.kind === 'priced' ? cur.currency : null}
          />
        </div>
      )}

      {cur && w.isNew && (
        <div className="rg-w-card" style={{ border: '1px dashed rgba(255,200,61,.3)', background: 'rgba(26,13,8,.6)', alignItems: 'center', textAlign: 'center', padding: '22px 20px', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.svg" alt="" width={56} height={56} style={{ opacity: 0.55 }} />
          <div className="mincho" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '.06em' }}>ようこそ。ここから積み上げます</div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: '#C9B8A6' }}>最初のセッションが終わると、ここに「枚数の成長」と「価値の分解」が表示されます。元本は自動で記録しました。</div>
          <div style={{ width: '100%', height: 70, position: 'relative', marginTop: 4 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed rgba(246,234,214,.25)' }} />
            <div style={{ position: 'absolute', left: 0, top: 'calc(50% - 4px)', width: 8, height: 8, transform: 'rotate(45deg)', background: '#F2C463' }} />
            <span style={{ position: 'absolute', left: 14, top: 'calc(50% - 22px)', fontSize: 10, color: '#A89078' }}>{md(cur.startedAt)} 開始</span>
          </div>
        </div>
      )}

      {cur && !w.isNew && cur.series.length > 0 && (
        <div className="rg-w-card" style={{ padding: '14px 14px 10px 18px', gap: 6 }}>
          <div className="rg-head" style={{ marginBottom: 0 }}>
            <span className="rg-head-en">{cur.kind === 'pegged' ? 'GROWTH' : 'COINS'}</span>
            <span className="rg-head-ja">{cur.kind === 'pegged' ? 'ドルの成長' : '枚数の成長'}</span>
          </div>
          <GrowthChart points={cur.series} principal={cur.principalLine} marks={cur.marks} unit={cur.kind === 'pegged' ? 'usd' : cur.kind === 'priced' ? 'coin' : 'coin2'} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 11, color: '#A89078', padding: '2px 0 4px' }}>
            <Legend sw={<span style={{ width: 16, height: 0, borderTop: '1.5px dashed rgba(246,234,214,.6)' }} />}>元本</Legend>
            <Legend sw={<span style={{ width: 16, height: 2, background: '#F2C463' }} />}>{cur.kind === 'pegged' ? '元本 + トレードの損益' : cur.kind === 'priced' ? '元本 + トレードで増えた枚数' : '枚数'}</Legend>
            <Legend sw={<span style={{ width: 12, height: 10, background: 'rgba(242,196,99,.3)' }} />}>{cur.kind === 'pegged' ? 'トレードで増えた分' : 'トレードで増えた枚数'}</Legend>
            <Legend sw={<Dia c="#F2C463" />}>開始・変更</Legend>
            <Legend sw={<Dia c="#FF9A5A" />}>入金</Legend>
            <Legend sw={<Dia c="#7FB2FF" />}>出金</Legend>
          </div>
        </div>
      )}

      {cur && cur.kind !== 'unsupported' && (w.prices.BTC || w.prices.ETH) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,200,61,.18)', background: 'rgba(20,10,6,.6)' }}>
          <span className="rg-head-en" style={{ fontSize: 10, letterSpacing: '.24em' }}>PRICE</span>
          <span style={{ fontSize: 12, color: '#E9DCC8' }}>今日の値段</span>
          {(['BTC', 'ETH'] as const).map((c) => (
            <span key={c} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontFamily: 'var(--rg-font-label)', fontWeight: 600, fontSize: 10, letterSpacing: '.12em', color: badgeColor(c) }}>{c}</span>
              <span className="num" style={{ fontSize: 15 }}>{priceStr(w.prices[c])}</span>
            </span>
          ))}
          {w.prices.at && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8E7A66' }}>{updatedAt(w.prices.at)} 更新</span>}
        </div>
      )}

      {w.history.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 2px' }}>
              <span className="rg-head-en">HISTORY</span>
              <span className="rg-head-ja">これまでの期間</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A89078' }}>新しい順</span>
            </div>
            <div className="rg-w-timeline">
              {w.history.map((h) => <PeriodCard key={h.id} p={h} />)}
            </div>
          </div>
          <TotalCard w={w} />
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 4px 0' }}>
        {(cur?.kind === 'unsupported' ? ['対応している通貨に変えると、次の期間からドルの価値と値上がり益も表示されます。'] : notes).map((n) => (
          <div key={n} className="rg-w-note"><span>{n}</span></div>
        ))}
      </div>
    </div>
  )
}

function updatedAt(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WD[d.getUTCDay()]}) ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function Legend({ sw, children }: { sw: React.ReactNode; children: React.ReactNode }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{sw}{children}</span>
}
function Dia({ c }: { c: string }) {
  return <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: c }} />
}

function NowCard({ p }: { p: WPeriod }) {
  const hero = p.kind === 'pegged' ? fmtUsd(p.value ?? p.coins) : fmtCoin(p.coins, p.currency).split(' ')[0]
  return (
    <div className="rg-w-now">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="rg-head-en">NOW</span>
        <span className="rg-head-ja">今の期間</span>
        <CurBadge cur={p.currency} />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A89078' }}>期間 {p.index} · {md(p.startedAt)} から · {p.days} 日目</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 6, flexWrap: 'wrap' }}>
        <span className="num" style={{ fontSize: 60, lineHeight: 1.2, color: '#F2C463', textShadow: '0 0 20px rgba(255,138,31,.3)' }}>{hero}</span>
        {p.kind !== 'pegged' && <span style={{ fontFamily: 'var(--rg-font-label)', fontWeight: 600, fontSize: 18, letterSpacing: '.1em', color: '#E9C98A' }}>{p.currency}</span>}
      </div>
      {p.kind === 'priced' && p.value != null && <div className="num" style={{ fontSize: 18, color: '#E9DCC8', marginTop: -4 }}>≈ {fmtUsd(p.value)}</div>}
      <div style={{ height: 1, margin: '10px 0 6px', background: 'linear-gradient(90deg,rgba(255,200,61,.45),rgba(255,200,61,.05))' }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#A89078' }}>元本</span>
        <span className="num" style={{ fontSize: 15, color: '#E9DCC8' }}>{principalStr(p)}</span>
        <span style={{ fontSize: 11, color: '#8E7A66' }}>{md(p.startedAt)} に自動で記録</span>
      </div>
    </div>
  )
}

function Tiles({ p }: { p: WPeriod }) {
  const tiles: { en: string; label: string; value: string; sub: string; color: string; sw: string }[] = []
  if (p.kind === 'priced') {
    tiles.push({ en: 'TRADE', label: 'トレードで増えた枚数', value: fmtCoin(p.tradeCoins, p.currency, true), sub: `${fmtUsd(p.tradeUsd, true)} · 打ち手の成果`, color: tc(p.tradeCoins), sw: 'var(--rg-w-seg-trade)' })
    tiles.push({ en: 'MARKET', label: '値上がり益', value: fmtUsd(p.capital ?? 0, true), sub: `${p.currency} ${priceStr(p.startPrice)} → ${priceStr(p.price)}`, color: mc(p.capital ?? 0), sw: 'var(--rg-w-seg-market)' })
  } else if (p.kind === 'pegged') {
    tiles.push({ en: 'TRADE', label: 'トレードの損益', value: fmtUsd(p.tradeUsd, true), sub: `${p.currency} はドルのまま運用するので、値上がり益はありません`, color: tc(p.tradeUsd), sw: 'var(--rg-w-seg-trade)' })
  } else {
    tiles.push({ en: 'TRADE', label: 'トレードで増えた枚数', value: fmtCoin(p.tradeCoins, p.currency, true), sub: 'ドルへの換算と値上がり益は出していません', color: tc(p.tradeCoins), sw: 'var(--rg-w-seg-trade)' })
  }
  return (
    <div className="rg-w-tiles">
      {tiles.map((t) => (
        <div key={t.en} className="rg-w-tile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="rg-w-sw" style={{ background: t.sw }} />
            <span className="rg-head-en" style={{ fontSize: 10, letterSpacing: '.24em' }}>{t.en}</span>
          </div>
          <span style={{ fontSize: 12, color: '#E9DCC8' }}>{t.label}</span>
          <span className="num" style={{ fontSize: 26, lineHeight: 1.25, color: t.color }}>{t.value}</span>
          <span style={{ fontSize: 11, color: '#A89078', lineHeight: 1.5 }}>{t.sub}</span>
        </div>
      ))}
    </div>
  )
}

function PeriodCard({ p }: { p: WPeriod }) {
  const end = p.endedAt ? md(p.endedAt) : ''
  const endValue =
    p.kind === 'pegged' ? fmtUsd(p.value ?? p.coins) : p.kind === 'priced' ? `${fmtCoin(p.coins, p.currency)} @ ${priceStr(p.price)} = ${fmtUsd(p.value ?? 0)}` : fmtCoin(p.coins, p.currency)
  return (
    <div className="rg-w-period">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CurBadge cur={p.currency} size="sm" />
        <span className="mincho" style={{ fontWeight: 700, fontSize: 14 }}>期間 {p.index}</span>
        <span className="num" style={{ marginLeft: 'auto', fontSize: 13, color: '#A89078' }}>{md(p.startedAt)}〜{end} · {p.days} 日</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, color: '#A89078' }}>{p.kind === 'pegged' ? 'トレードの損益' : 'トレードで増えた枚数'}</span>
          <span className="num" style={{ fontSize: 18, color: tc(p.kind === 'pegged' ? p.tradeUsd : p.tradeCoins) }}>
            {p.kind === 'pegged' ? fmtUsd(p.tradeUsd, true) : fmtCoin(p.tradeCoins, p.currency, true)}
          </span>
          {p.kind === 'priced' && <span className="num" style={{ fontSize: 12, color: '#A89078', fontWeight: 500 }}>{fmtUsd(p.tradeUsd, true)}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 12, borderLeft: '1px solid rgba(255,200,61,.16)' }}>
          <span style={{ fontSize: 10, color: '#A89078' }}>値上がり益</span>
          <span className="num" style={{ fontSize: 18, color: p.capital == null ? '#8E7A66' : mc(p.capital) }}>{p.capital == null ? '—' : fmtUsd(p.capital, true)}</span>
          {p.kind === 'priced' && <span className="num" style={{ fontSize: 12, color: '#A89078', fontWeight: 500 }}>{p.currency} {priceStr(p.startPrice)} → {priceStr(p.price)}</span>}
        </div>
      </div>
      {p.kind !== 'unsupported' && <Breakdown variant="thin" principal={p.principalUsd ?? 0} trade={p.tradeUsd} market={p.capital} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: '#A89078' }}>
        <div style={{ display: 'flex', gap: 8 }}><span style={{ width: 100, flex: 'none' }}>元本</span><span className="num" style={{ fontSize: 13, color: '#E9DCC8' }}>{principalStr(p)}</span></div>
        <div style={{ display: 'flex', gap: 8 }}><span style={{ width: 100, flex: 'none' }}>終わった時の価値</span><span className="num" style={{ fontSize: 13, color: '#FFF4E2' }}>{endValue}</span></div>
      </div>
      {p.endReason && <div style={{ display: 'flex' }}><span style={{ padding: '2px 8px', borderRadius: 3, border: '1px solid rgba(255,200,61,.3)', fontSize: 10, color: '#E9C98A' }}>{p.endReason}</span></div>}
    </div>
  )
}

function TotalCard({ w }: { w: Awaited<ReturnType<typeof loadWallet>> }) {
  const all = [...(w.current ? [w.current] : []), ...w.history]
  return (
    <div className="rg-w-total">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="rg-head-en">TOTAL</span>
        <span className="rg-head-ja">通算</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A89078' }}>{w.total.periods} 期間 · {w.total.days} 日</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#A89078' }}>トレードの損益</span>
          <span className="num" style={{ fontSize: 30, lineHeight: 1.2, color: tc(w.total.tradeUsd) }}>{fmtUsd(w.total.tradeUsd, true)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 14, borderLeft: '1px solid rgba(255,200,61,.18)' }}>
          <span style={{ fontSize: 11, color: '#A89078' }}>値上がり益</span>
          <span className="num" style={{ fontSize: 30, lineHeight: 1.2, color: mc(w.total.marketUsd) }}>{fmtUsd(w.total.marketUsd, true)}</span>
        </div>
      </div>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 60px minmax(0,1fr) minmax(0,1fr)', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,200,61,.14)', fontSize: 10, color: '#8E7A66' }}>
          <span>期間</span><span>通貨</span><span style={{ textAlign: 'right' }}>トレード</span><span style={{ textAlign: 'right' }}>値上がり</span>
        </div>
        {all.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '52px 60px minmax(0,1fr) minmax(0,1fr)', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,200,61,.08)', alignItems: 'center' }}>
            <span style={{ fontSize: 12 }}>期間 {p.index}</span>
            <span style={{ fontFamily: 'var(--rg-font-label)', fontWeight: 600, fontSize: 10, letterSpacing: '.12em', color: badgeColor(p.currency) }}>{p.currency}</span>
            <span className="num" style={{ textAlign: 'right', fontSize: 15, color: tc(p.tradeUsd) }}>{fmtUsd(p.tradeUsd, true)}</span>
            <span className="num" style={{ textAlign: 'right', fontSize: 15, color: p.capital == null ? '#8E7A66' : mc(p.capital) }}>{p.capital == null ? '—' : fmtUsd(p.capital, true)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
