// 管理画面: 受け子ごとの「お金の状態」(マスターから 1 分ごと・rg_receiver_live) を読む (2026-10-10)。
import { createAdminClient } from '@/lib/supabase/admin'

export type LiveMoney = {
  mode?: string
  mode_setting?: string
  master_mode?: string
  seq_shape?: string
  seq_start?: number
  bankroll?: number
  ratio?: number
  unit?: number
  next_amount?: number
  step?: number
  last_amount?: number
  last_kind?: string
  session_pnl?: number
  total_bets?: number
  wins?: number
  losses?: number
  ties?: number
  loss_cut?: number
  profit_stop?: number
  table_max?: number
  enabled?: boolean
  stopped?: boolean
  stopped_reason?: string
  session_open?: boolean
  daily_pnl?: number
  cap_skips_today?: { count: number; last?: { amount?: number; cap?: number; balance?: number; at?: string } }
  // 2026-10-11: SEQ はマイナスなら次のセッションへ持ち越す
  seq_carry?: boolean
  seq_carry_in?: { pnl?: number; count?: number; since?: string }
}

export type LiveRow = {
  executor_id: string
  balance?: number | null
  currency?: string
  table_name?: string | null
  status?: string | null
  error?: string | null
  updated_at?: string | null
  today?: { date?: string; pnl?: number | null; bets?: number | null; rolling?: number | null }
  money: LiveMoney
  pushed_at: string
}

export async function loadLive(): Promise<Map<string, LiveRow>> {
  const { data } = await createAdminClient().from('rg_receiver_live').select('executor_id, data, pushed_at')
  const m = new Map<string, LiveRow>()
  for (const r of data || []) m.set(r.executor_id, { ...(r.data as object), executor_id: r.executor_id, pushed_at: r.pushed_at, money: ((r.data as { money?: LiveMoney })?.money || {}) as LiveMoney } as LiveRow)
  return m
}

const MODE_JA: Record<string, string> = {
  seq: 'SEQ',
  martingale: 'マーチン',
  grand_martingale: 'グランドマーチン',
  dalembert: 'ダランベール',
  flat: 'フラット',
}
const SHAPE_JA: Record<string, string> = { attack: '攻撃型', defense: '守備型', balance: 'バランス型' }

/** 方式の表示。受け子の欄が空なら「マスターと同じ」。 */
export function modeLabel(m: LiveMoney): string {
  const mode = String(m.mode || '')
  let s = MODE_JA[mode] || mode || '-'
  if (mode === 'seq') s += ` ${SHAPE_JA[String(m.seq_shape || '')] || ''}・開始 $${Number(m.seq_start || 0)}`
  if (!m.mode_setting) s += ' (マスターと同じ)'
  return s
}

const STOP_JA: Record<string, string> = {
  below_min: '最小額未満 (1 回の額が $0.20 を下回るので配っていない)',
  table_max: '卓の上限に届いたので止めている',
  loss_cut: '損切りに届いた',
  profit_stop: '利確に届いた',
  limit: '損切り・利確に届いた',
}
export function stopLabel(m: LiveMoney): string {
  if (m.enabled === false) return 'この受け子は無効 (配っていない)'
  const r = String(m.stopped_reason || '')
  return r ? STOP_JA[r] || r : ''
}

/** 実際の残高が元本 (設定) の何割か。ドル建ての時だけ。 */
export function balanceShare(r: LiveRow): number | null {
  const cur = String(r.currency || '').toUpperCase()
  if (!['USD', 'USDT', 'USDC'].includes(cur)) return null
  const b = Number(r.balance)
  const k = Number(r.money?.bankroll)
  if (!isFinite(b) || !k) return null
  return b / k
}

export function isStale(r: LiveRow): boolean {
  return Date.now() - new Date(r.pushed_at).getTime() > 3 * 60_000
}
