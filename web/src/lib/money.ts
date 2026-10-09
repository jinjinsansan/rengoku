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
  return Math.floor(p * r * 100 + 1e-6) / 100 // +1e-6: 42.8 × 0.3 = 12.8399999… を 12.84 にする (小数の誤差)
}

/**
 * 1 日の締め (2026-10-09): その日の利益に前日までの繰り越し (マイナス) を足して相殺する。
 * 相殺後がプラスならその額 × 率がチャージで繰り越しは 0。マイナスならチャージなしで、その額を次の日へ。
 */
export function settleDay(pnl: number, carryIn: number, rate: number) {
  const ci = Math.min(0, Number(carryIn) || 0)
  const net = Math.round(((Number(pnl) || 0) + ci) * 100) / 100
  return { carryIn: ci, net, charge: chargeFor(net, rate), carryOut: net < 0 ? net : 0 }
}
