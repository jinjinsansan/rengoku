// まとめて払う送金の注文 (2026-10-09)。
// bafather.uk の入金の仕組み (crypto_payments + VPS の見張り) に kind = 'rg_charge' で乗る。
// 見張りは「届いた金額 (小数 2 桁)」で注文を見分けるので、払う額は「未払いの合計以上で、他の注文と重ならない
// いちばん近い額」にする (ずれは 1 ドル未満)。入金が見つかると bafather.uk が rg_payment_items のチャージを
// すべて「支払い済み」にする (ba/web/src/app/api/payments/credit)。
import { createAdminClient } from '@/lib/supabase/admin'

export const ORDER_TTL_MIN = 60

/** 未払いの合計以上で、ほかの待っている注文と重ならない、いちばん近い額 (小数 2 桁)。 */
export function pickAmount(total: number, taken: Set<number>): number | null {
  const start = Math.round(total * 100)
  for (let c = start; c < start + 100; c++) {
    if (!taken.has(c)) return c / 100
  }
  return null
}

export type PayOrder = { order_id: string; amount: number; expires_at: string; charge_count: number; total_due: number }

/** 未払いのチャージをまとめた注文を作る。同じ中身で期限内の注文があれば、それを返す。 */
export async function createOrReuseOrder(userId: string): Promise<PayOrder | { none: true }> {
  const admin = createAdminClient()
  const { data: due } = await admin.from('rg_daily_charges').select('id, charge_amount').eq('user_id', userId).eq('status', 'due')
  const charges = (due || []).filter((c) => Number(c.charge_amount) > 0)
  if (!charges.length) return { none: true }
  const total = Math.round(charges.reduce((a, c) => a + Number(c.charge_amount), 0) * 100) / 100
  const ids = charges.map((c) => c.id).sort()
  const nowIso = new Date().toISOString()

  // 同じチャージの組み合わせで、まだ期限内の注文があれば使い回す (押すたびに額が変わらないように)
  const { data: mine } = await admin
    .from('crypto_payments')
    .select('id, expected_amount, expires_at')
    .eq('user_id', userId).eq('kind', 'rg_charge').eq('status', 'pending').gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
  for (const o of mine || []) {
    const { data: items } = await admin.from('rg_payment_items').select('charge_id').eq('order_id', o.id)
    const its = (items || []).map((i) => i.charge_id).sort()
    if (its.length === ids.length && its.every((v, i) => v === ids[i])) {
      return { order_id: o.id, amount: Number(o.expected_amount), expires_at: o.expires_at, charge_count: ids.length, total_due: total }
    }
  }

  // ほかの待っている注文 (bafather.uk の分も含む) と金額が重ならないようにする
  const { data: pend } = await admin.from('crypto_payments').select('expected_amount').eq('status', 'pending').gt('expires_at', nowIso)
  const taken = new Set((pend || []).map((p) => Math.round(Number(p.expected_amount) * 100)))
  const amount = pickAmount(total, taken)
  if (amount == null) throw new Error('いま送金の注文が混み合っています。少し時間をおいてお試しください。')
  const expiresAt = new Date(Date.now() + ORDER_TTL_MIN * 60_000).toISOString()
  const { data: order, error } = await admin
    .from('crypto_payments')
    .insert({ user_id: userId, kind: 'rg_charge', expected_amount: amount, status: 'pending', expires_at: expiresAt })
    .select('id')
    .single()
  if (error || !order) throw new Error(error?.message || 'order failed')
  const { error: e2 } = await admin.from('rg_payment_items').insert(ids.map((cid) => ({ order_id: order.id, charge_id: cid })))
  if (e2) {
    await admin.from('crypto_payments').update({ status: 'expired' }).eq('id', order.id) // 中身が無い注文は残さない
    throw new Error(e2.message)
  }
  return { order_id: order.id, amount, expires_at: expiresAt, charge_count: ids.length, total_due: total }
}
