import { createAdminClient } from '@/lib/supabase/admin'
import { addDays } from '@/lib/jst'
import { settleDay } from '@/lib/money'

// Rengoku の締めの中身 (毎日 0:15 の cron と、管理者画面の「締めを実行」から呼ぶ)。
// 同じ日を 2 回流しても二重にならない (user_id + settle_date が一意・既にある行は触らない)。
export async function runCharges(date: string) {
  const admin = createAdminClient()
  const { data: settings } = await admin.from('rg_settings').select('key, value')
  const get = (k: string) => (settings || []).find((s) => s.key === k)?.value
  const rate = Number(get('charge_rate') ?? 0.3)
  const dueHours = Number(get('charge_due_hours') ?? 24)
  const referral = (get('referral') || { mode: 'off', rate: 0 }) as { mode?: string; rate?: number }

  // 運営 (staff / owner) はチャージしない
  const { data: members } = await admin.from('rg_members').select('user_id, role').eq('role', 'member')
  const ids = (members || []).map((m) => m.user_id)
  if (!ids.length) return { ok: true, date, rate, members: 0, created: 0, charged: 0, noLog: 0 }

  const { data: logs } = await admin.from('daily_pnl_log').select('user_id, bet_pnl, pnl_source').eq('date', date).in('user_id', ids)
  const { data: existing } = await admin.from('rg_daily_charges').select('user_id').eq('settle_date', date).in('user_id', ids)
  const done = new Set((existing || []).map((e) => e.user_id))
  // ★マイナスの繰り越し (2026-10-09): 前日までの最後の行の carry_out を引き継ぐ (相殺しきるまで続く)
  const { data: prev } = await admin
    .from('rg_daily_charges')
    .select('user_id, settle_date, carry_out')
    .lt('settle_date', date)
    .in('user_id', ids)
    .order('settle_date', { ascending: false })
  const carryBy = new Map<string, number>()
  for (const r of prev || []) if (!carryBy.has(r.user_id)) carryBy.set(r.user_id, Number(r.carry_out || 0))
  const dueAt = new Date(new Date(`${addDays(date, 1)}T00:00:00+09:00`).getTime() + dueHours * 3600_000).toISOString()

  let created = 0
  let charged = 0
  let noLog = 0
  for (const uid of ids) {
    if (done.has(uid)) continue
    const log = (logs || []).find((l) => l.user_id === uid)
    if (!log) {
      noLog++
      continue
    }
    const pnl = Number(log.bet_pnl || 0)
    const { carryIn, net, charge: amount, carryOut } = settleDay(pnl, carryBy.get(uid) || 0, rate)
    const { data: row, error } = await admin
      .from('rg_daily_charges')
      .insert({
        user_id: uid,
        settle_date: date,
        daily_pnl: pnl,
        carry_in: carryIn,
        net_pnl: net,
        carry_out: carryOut,
        pnl_source: log.pnl_source,
        rate,
        charge_amount: amount,
        status: amount > 0 ? 'due' : 'none',
        due_at: amount > 0 ? dueAt : null,
      })
      .select('id')
      .single()
    if (error || !row) continue
    created++
    if (amount <= 0) continue
    charged++
    await admin.from('rg_notifications').insert({
      user_id: uid,
      kind: 'charge_due',
      ref_id: row.id,
      title: `${date} の精算 $${amount.toFixed(2)}`,
      body: 'お手数ですが、24 時間以内に送金をお願いします。精算の画面に手順があります。',
    })
    if (referral.mode === 'charge_pct' && Number(referral.rate) > 0) {
      const { data: prof } = await admin.from('profiles').select('referred_by').eq('id', uid).maybeSingle()
      if (prof?.referred_by) {
        const { data: referrer } = await admin.from('profiles').select('id').eq('referral_code', prof.referred_by).maybeSingle()
        if (referrer?.id) {
          const r = Math.min(1, Math.max(0, Number(referral.rate)))
          await admin.from('rg_referral_rewards').insert({
            referrer_id: referrer.id,
            referred_id: uid,
            charge_id: row.id,
            base_amount: amount,
            rate: r,
            amount: Math.floor(amount * r * 100) / 100,
            status: 'pending', // チャージが支払われたら confirmed にする (入金の照合と一緒に作る)
          })
        }
      }
    }
  }
  return { ok: true, date, rate, members: ids.length, created, charged, noLog }
}
