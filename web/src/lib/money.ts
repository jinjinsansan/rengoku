export function signedUsd(v: number | null | undefined): string {
  const n = Number(v || 0)
  const sign = n > 0 ? '+' : n < 0 ? '−' : '±'
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

export function usd(v: number | null | undefined): string {
  return `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function pnlClass(v: number | null | undefined): string {
  const n = Number(v || 0)
  return n > 0 ? 'win' : n < 0 ? 'lose' : ''
}

/** その日の利益からチャージ額を決める。マイナス・0 の日はチャージなし。セント未満は切り捨て。 */
export function chargeFor(dailyPnl: number, rate: number): number {
  const p = Number(dailyPnl) || 0
  const r = Math.min(1, Math.max(0, Number(rate) || 0))
  if (p <= 0 || r <= 0) return 0
  return Math.floor(p * r * 100) / 100
}
