// 資産の画面に出す形 (2026-10-10・README_WALLET.md の「必要なデータ」)。読むだけ。
import { createAdminClient } from '@/lib/supabase/admin'
import { isPegged, periodSummary, priceOf, PRICED } from '@/lib/wallet-core'

export type CurKind = 'pegged' | 'priced' | 'unsupported'
export type ChartPoint = { d: string; v: number }
export type ChartMark = { i: number; kind: 'start' | 'change' | 'in' | 'out'; text: string }

export type WPeriod = {
  id: number
  index: number
  executorId: string
  currency: string
  kind: CurKind
  startedAt: string
  endedAt: string | null
  days: number
  startCoins: number
  startPrice: number | null
  principalCoins: number
  principalUsd: number | null
  tradeUsd: number
  tradeCoins: number
  coins: number
  price: number | null
  value: number | null
  capital: number | null
  endReason: string
  bets: number
  series: ChartPoint[]
  marks: ChartMark[]
  principalLine: number
}

export type WalletView = {
  current: WPeriod | null
  history: WPeriod[]
  total: { tradeUsd: number; marketUsd: number; days: number; periods: number }
  prices: { BTC: number | null; ETH: number | null; at: string | null }
  detected: { currency: string; executorId: string; at: string } | null
  declared: string | null
  banners: { text: string; link: string; href: string; tone: 'gold' | 'warn' | 'grey' }[]
  isNew: boolean
}

export function kindOf(cur: string): CurKind {
  const c = String(cur || '').toUpperCase()
  if (isPegged(c)) return 'pegged'
  if ((PRICED as readonly string[]).includes(c)) return 'priced'
  return 'unsupported'
}

const JST = 9 * 3600_000
export function jstDay(iso: string): string {
  return new Date(new Date(iso).getTime() + JST).toISOString().slice(0, 10)
}
function md(day: string): string {
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000) + 1
}
function addDay(day: string, n: number): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
}

export function fmtCoin(v: number, cur: string, sign = false): string {
  const dp = kindOf(cur) === 'priced' ? 4 : 2
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (sign ? (v < 0 ? '−' : '+') : '') + s + ' ' + String(cur).toUpperCase()
}
export function fmtUsd(v: number, sign = false, dp = 2): string {
  const s = '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (sign ? (v < 0 ? '−' : '+') : v < 0 ? '−' : '') + s
}

export async function loadWallet(userId: string, opts: { series?: boolean } = {}): Promise<WalletView> {
  const admin = createAdminClient()
  const [{ data: periods }, { data: mem }, { data: snap }, { data: pr }] = await Promise.all([
    admin.from('rg_wallet_periods').select('*').eq('user_id', userId).order('started_at', { ascending: true }),
    admin.from('rg_members').select('wallet_currency_override').eq('user_id', userId).maybeSingle(),
    admin.from('rg_wallet_snapshots').select('currency, executor_id, at').eq('user_id', userId).order('at', { ascending: false }).limit(1),
    admin.from('rg_prices').select('currency, usd, at').in('currency', ['BTC', 'ETH']).order('at', { ascending: false }).limit(10),
  ])
  const prices: WalletView['prices'] = { BTC: null, ETH: null, at: null }
  for (const p of pr || []) {
    const c = p.currency as 'BTC' | 'ETH'
    if (prices[c] == null) prices[c] = Number(p.usd)
    if (!prices.at) prices.at = p.at
  }
  const priceMap: Record<string, number> = {}
  if (prices.BTC) priceMap.BTC = prices.BTC
  if (prices.ETH) priceMap.ETH = prices.ETH

  const list = periods || []
  const today = jstDay(new Date().toISOString())
  const out: WPeriod[] = []
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    const next = list[i + 1]
    const kind = kindOf(p.currency)
    const nowPrice = priceOf(p.currency, priceMap)
    const s = periodSummary(
      {
        currency: p.currency, start_coins: Number(p.start_coins), start_price: p.start_price == null ? null : Number(p.start_price),
        trade_usd: Number(p.trade_usd), trade_coins: Number(p.trade_coins), flow_in_usd: Number(p.flow_in_usd), flow_out_usd: Number(p.flow_out_usd),
        flow_net_coins: Number(p.flow_net_coins), last_balance: p.last_balance == null ? null : Number(p.last_balance),
        end_coins: p.end_coins == null ? null : Number(p.end_coins), end_price: p.end_price == null ? null : Number(p.end_price), ended_at: p.ended_at,
      },
      nowPrice,
    )
    const startDay = jstDay(p.started_at)
    const endDay = p.ended_at ? jstDay(p.ended_at) : today
    let endReason = ''
    if (p.ended_at) {
      const nx = next ? String(next.currency) : ''
      endReason = p.end_reason === 'withdraw'
        ? `${md(endDay)} ${p.currency} を出金${nx ? ` · ${nx} に変更` : ''}`
        : `${md(endDay)} ${nx || '別の通貨'} に変更`
    }
    // 対応していない通貨 (DOGE など) は、トレードで増えた枚数 = 今の枚数 − 元本の枚数 (値段が分からないため)
    const tradeCoins = kind === 'unsupported' ? s.coins - s.principalCoins : s.tradeCoins
    out.push({
      id: Number(p.id), index: i + 1, executorId: String(p.executor_id), currency: String(p.currency), kind,
      startedAt: p.started_at, endedAt: p.ended_at, days: daysBetween(startDay, endDay),
      startCoins: Number(p.start_coins), startPrice: p.start_price == null ? null : Number(p.start_price),
      principalCoins: s.principalCoins, principalUsd: s.principal,
      tradeUsd: s.tradeUsd, tradeCoins, coins: s.coins, price: s.price, value: s.value,
      capital: kind === 'priced' ? s.capital : null, endReason, bets: 0, series: [], marks: [], principalLine: 0,
    })
  }

  const current = out.find((p) => !p.endedAt) || null
  if (current && opts.series !== false) await fillSeries(current, today, userId)

  const history = out.filter((p) => p.endedAt).reverse()
  const first = out[0]
  const total = {
    tradeUsd: Math.round(out.reduce((a, p) => a + p.tradeUsd, 0) * 100) / 100,
    marketUsd: Math.round(out.reduce((a, p) => a + (p.capital || 0), 0) * 100) / 100,
    days: first ? daysBetween(jstDay(first.startedAt), today) : 0,
    periods: out.length,
  }

  const detected = snap && snap[0] ? { currency: String(snap[0].currency), executorId: String(snap[0].executor_id), at: String(snap[0].at) } : null
  const declared = mem?.wallet_currency_override ? String(mem.wallet_currency_override) : null
  const banners: WalletView['banners'] = []
  if (current && history.length && Date.now() - Date.parse(current.startedAt) < 72 * 3600_000) {
    const principal = current.kind === 'pegged' ? fmtUsd(current.principalUsd ?? current.startCoins) : fmtCoin(current.startCoins, current.currency)
    banners.push({ text: `財布の通貨が ${current.currency} に変わったので、新しい期間を始めました。元本 ${principal}`, link: '違う場合 ›', href: '/me/wallet', tone: 'gold' })
  }
  if (declared && detected && declared !== detected.currency) {
    banners.push({ text: `自動の判定では ${detected.currency} ですが、ご申告は ${declared} です。表示はご申告の ${declared} に合わせています。`, link: '確かめる ›', href: '/me/wallet', tone: 'warn' })
  }
  if (current && current.kind === 'unsupported') {
    banners.push({ text: `${current.currency} は枚数だけ表示しています。ドルの換算と値上がり益は USDT・USDC・BTC・ETH だけです。`, link: '', href: '', tone: 'grey' })
  }
  return { current, history, total, prices, detected, declared, banners, isNew: !!current && opts.series !== false && current.bets === 0 }
}

/** 今の期間の、日ごとの点 (グラフ) と印。 */
async function fillSeries(p: WPeriod, today: string, userId: string) {
  const admin = createAdminClient()
  const [{ data: bets }, { data: flows }, { data: snaps }] = await Promise.all([
    admin.from('rg_wallet_bets').select('at, pnl_usd, price').eq('period_id', p.id).order('at', { ascending: true }).limit(20000),
    admin.from('rg_wallet_flows').select('at, kind, coins, usd').eq('period_id', p.id).order('at', { ascending: true }),
    p.kind === 'unsupported'
      ? admin.from('rg_wallet_snapshots').select('at, balance').eq('user_id', userId).eq('executor_id', p.executorId).eq('currency', p.currency).gte('at', p.startedAt).order('at', { ascending: true }).limit(20000)
      : Promise.resolve({ data: [] as { at: string; balance: number }[] }),
  ])
  // 対応していない通貨は、日ごとの最後の残高 (枚数) をそのまま点にする
  const snapBy = new Map<string, number>()
  for (const sn of snaps || []) snapBy.set(jstDay(sn.at), Number(sn.balance))
  p.bets = (bets || []).length
  const start = jstDay(p.startedAt)
  const nDays = Math.min(daysBetween(start, today), 60)
  const days = Array.from({ length: nDays }, (_, i) => addDay(start, i + Math.max(0, daysBetween(start, today) - 60)))
  const tradeBy = new Map<string, number>()
  for (const b of bets || []) {
    const d = jstDay(b.at)
    const v = p.kind === 'pegged' ? Number(b.pnl_usd) : b.price ? Number(b.pnl_usd) / Number(b.price) : 0
    tradeBy.set(d, (tradeBy.get(d) || 0) + v)
  }
  const flowBy = new Map<string, number>()
  for (const f of flows || []) {
    const d = jstDay(f.at)
    const v = p.kind === 'pegged' ? Number(f.usd ?? f.coins) * (f.kind === 'withdraw' ? -1 : 1) : Number(f.coins)
    flowBy.set(d, (flowBy.get(d) || 0) + v)
  }
  let base = p.startCoins
  let trade = 0
  let lastSnap = p.startCoins
  const series: ChartPoint[] = []
  const marks: ChartMark[] = []
  days.forEach((d, i) => {
    base += flowBy.get(d) || 0
    trade += tradeBy.get(d) || 0
    if (snapBy.has(d)) lastSnap = snapBy.get(d) as number
    series.push({ d: md(d), v: p.kind === 'unsupported' ? lastSnap : base + trade })
    const f = flowBy.get(d)
    if (f) marks.push({ i, kind: f > 0 ? 'in' : 'out', text: f > 0 ? '入金' : '出金' })
  })
  if (series.length) marks.unshift({ i: 0, kind: p.index > 1 ? 'change' : 'start', text: p.index > 1 ? `${p.currency} に変更` : '開始' })
  p.series = series
  p.marks = marks
  p.principalLine = p.kind === 'pegged' ? (p.principalUsd ?? p.startCoins) : p.principalCoins
}
