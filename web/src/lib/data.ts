// 会員の数字を読む (bafather.uk と同じ表)。すべて「本人の user_id」で絞る。
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, jstDate, jstMidnightUtc } from '@/lib/jst'

export type DaySummary = { pnl: number; rolling: number; bets: number; wins: number; losses: number; ties: number }

export async function todaySummary(userId: string): Promise<DaySummary> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('receiver_bets')
    .select('amount, outcome, pnl')
    .eq('user_id', userId)
    .gte('occurred_at', jstMidnightUtc())
    .limit(5000)
  const s: DaySummary = { pnl: 0, rolling: 0, bets: 0, wins: 0, losses: 0, ties: 0 }
  // outcome = 'win' / 'lose' / 'push' (receiver_bets の決まり。result は出た側 player/banker/tie)
  for (const b of data || []) {
    s.bets += 1
    s.rolling += Number(b.amount || 0)
    s.pnl += Number(b.pnl || 0)
    if (b.outcome === 'win') s.wins += 1
    else if (b.outcome === 'lose') s.losses += 1
    else s.ties += 1
  }
  s.pnl = Math.round(s.pnl * 100) / 100
  s.rolling = Math.round(s.rolling * 100) / 100
  return s
}

export async function receiverStatuses(userId: string) {
  const { data } = await createAdminClient()
    .from('receiver_status')
    .select('executor_id, product, last_seen_at, engine_running, table_name, balance, last_bet_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
  return data || []
}

export async function weekPnl(userId: string): Promise<{ date: string; pnl: number | null }[]> {
  const today = jstDate()
  const from = addDays(today, -6)
  const { data } = await createAdminClient()
    .from('daily_pnl_log')
    .select('date, bet_pnl')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', today)
  const by = new Map((data || []).map((r) => [String(r.date), Number(r.bet_pnl)]))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i)
    return { date: d, pnl: by.has(d) ? by.get(d)! : null }
  })
}

export async function dueCharges(userId: string) {
  const { data } = await createAdminClient()
    .from('rg_daily_charges')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'due')
    .order('settle_date', { ascending: true })
  return data || []
}

export async function referralSummary(userId: string) {
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('referral_code').eq('id', userId).maybeSingle()
  const code = me?.referral_code || ''
  const [{ count }, { data: rewards }] = await Promise.all([
    code
      ? admin.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', code)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    admin.from('rg_referral_rewards').select('amount, status, created_at').eq('referrer_id', userId),
  ])
  const monthStart = jstDate().slice(0, 7)
  let month = 0
  let total = 0
  for (const r of rewards || []) {
    if (r.status === 'cancelled') continue
    total += Number(r.amount || 0)
    if (jstDate(new Date(r.created_at)).startsWith(monthStart)) month += Number(r.amount || 0)
  }
  return { code, referred: count || 0, month, total }
}
