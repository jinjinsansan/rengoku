// 資産の画面の計算 (2026-10-10)。データベースに触らない純粋な関数だけ (テストしやすいように)。
// 言葉: 期間 = 1 つの通貨で運用していたひと続きの間。元本 = 始めた時の価値 + 入金 − 出金。

export const PEGGED = ['USD', 'USDT', 'USDC'] as const
export const PRICED = ['BTC', 'ETH'] as const
export const STABLE_MIN = 30 // 受け子の通貨が変わってから、何分続いたら新しい期間にするか

export function isPegged(cur: string): boolean {
  return (PEGGED as readonly string[]).includes(String(cur || '').toUpperCase())
}

/** その通貨の 1 枚のドルの値段。ドル建ては 1。BTC・ETH は相場。それ以外 (DOGE など) は分からない (null)。 */
export function priceOf(cur: string, prices: Record<string, number | undefined>): number | null {
  const c = String(cur || '').toUpperCase()
  if (isPegged(c)) return 1
  const p = prices[c]
  return typeof p === 'number' && p > 0 ? p : null
}

/**
 * 残高の変化のうち、トレードで説明できない差を入金・出金とみなすか。
 * 目安: 残高の 1% より大きく、かつ $5 相当より大きい。値段が分からない通貨は残高の 2% だけで見る。
 */
export function detectFlow(prevBalance: number, balance: number, tradeCoins: number, price: number | null) {
  const residual = balance - (prevBalance + tradeCoins)
  const pct = Math.abs(balance) * (price == null ? 0.02 : 0.01)
  const floor = price == null ? 0 : 5 / price
  const threshold = Math.max(pct, floor)
  if (Math.abs(residual) <= threshold) return null
  return { kind: residual > 0 ? ('deposit' as const) : ('withdraw' as const), coins: residual }
}

export type PeriodRow = {
  currency: string
  start_coins: number
  start_price: number | null
  trade_usd: number
  trade_coins: number
  flow_in_usd: number
  flow_out_usd: number
  flow_net_coins: number
  last_balance: number | null
  end_coins?: number | null
  end_price?: number | null
  ended_at?: string | null
}

/**
 * 期間の成績。value = 残高 × 値段、principal = 始めの価値 + 入金 − 出金、
 * 値上がり益 = value − principal − トレードの損益 (ドル)。ドル建ては値上がり益 0 (端数は丸める)。
 * 値段が分からない通貨は枚数だけ (ドルの値は null)。
 */
export function periodSummary(p: PeriodRow, nowPrice: number | null) {
  const closed = !!p.ended_at
  const coins = Number((closed ? p.end_coins : p.last_balance) ?? p.start_coins) || 0
  const price = closed ? (p.end_price ?? null) : nowPrice
  const startPrice = p.start_price ?? null
  const pegged = isPegged(p.currency)
  const value = price == null ? null : round2(coins * price)
  const principal = startPrice == null ? null : round2(Number(p.start_coins) * startPrice + Number(p.flow_in_usd) - Number(p.flow_out_usd))
  const tradeUsd = round2(Number(p.trade_usd) || 0)
  let capital: number | null = null
  if (value != null && principal != null) capital = pegged ? 0 : round2(value - principal - tradeUsd)
  return {
    currency: p.currency,
    coins,
    price,
    value,
    principal,
    principalCoins: Number(p.start_coins) + Number(p.flow_net_coins || 0),
    tradeUsd,
    tradeCoins: Number(p.trade_coins) || 0,
    capital,
    closed,
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/** 残高の表示 (ドル建ては $・それ以外は枚数と通貨名)。 */
export function fmtBalance(balance: number | null | undefined, cur: string): string {
  if (balance == null || !isFinite(Number(balance))) return '-'
  const c = String(cur || '').toUpperCase()
  if (!c || isPegged(c)) return '$' + Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const digits = c === 'BTC' ? 6 : c === 'ETH' ? 5 : 2
  return Number(balance).toLocaleString('en-US', { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits }) + ' ' + c
}
