// 資産の画面の記録 (2026-10-10)。VPS が 10 分ごとに /api/cron/wallet へ送るマスターの値を受け取り、
// 残高の記録・期間の開始と終了・トレードで増えた枚数・入金と出金を数える。受け子は触らない。
import { createAdminClient } from '@/lib/supabase/admin'
import { detectFlow, fmtBalance, isPegged, priceOf, PRICED, STABLE_MIN } from '@/lib/wallet-core'

export type WalletPush = {
  now?: string
  executors: { executor_id: string; user_email?: string; balance: number | null; currency: string; updated_at?: string }[]
  bets: { executor_id: string; decision_id: string; at: string; pnl: number }[]
}

const STALE_MIN = 15 // 受け子の報告がこれより古い残高は使わない

/** BTC・ETH のドルの値段。CoinGecko → だめなら Binance。 */
export async function fetchPrices(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', { cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      if (j?.bitcoin?.usd) out.BTC = Number(j.bitcoin.usd)
      if (j?.ethereum?.usd) out.ETH = Number(j.ethereum.usd)
    }
  } catch {}
  for (const c of PRICED) {
    if (out[c]) continue
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${c}USDT`, { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json()
        if (Number(j?.price) > 0) out[c] = Number(j.price)
      }
    } catch {}
  }
  return out
}

export async function processWalletPush(push: WalletPush) {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const prices = await fetchPrices()
  const minute = nowIso.slice(0, 16) + ':00Z'
  const priceRows = Object.entries(prices).map(([currency, usd]) => ({ currency, at: minute, usd }))
  if (priceRows.length) await admin.from('rg_prices').upsert(priceRows, { onConflict: 'currency,at' })

  // 受け子 → 会員 (受け子の生存報告に user_id がある・田辺版だけ)
  const { data: rs } = await admin.from('receiver_status').select('executor_id, user_id').eq('product', 'bacopy')
  const userOf = new Map((rs || []).filter((r) => r.user_id).map((r) => [String(r.executor_id), String(r.user_id)]))

  // 決済済みの BET (重複は decision_id で捨てる)
  const betRows = (push.bets || [])
    .filter((b) => userOf.has(b.executor_id) && b.decision_id && b.at)
    .map((b) => ({ decision_id: b.decision_id, user_id: userOf.get(b.executor_id)!, executor_id: b.executor_id, at: toIso(b.at), pnl_usd: Number(b.pnl) || 0 }))
  for (let i = 0; i < betRows.length; i += 500) {
    await admin.from('rg_wallet_bets').upsert(betRows.slice(i, i + 500), { onConflict: 'decision_id', ignoreDuplicates: true })
  }

  const report: Record<string, string> = {}
  for (const ex of push.executors || []) {
    const uid = userOf.get(ex.executor_id)
    if (!uid) continue
    try {
      report[ex.executor_id] = await processExecutor(uid, ex, prices, nowIso)
    } catch (e) {
      report[ex.executor_id] = 'error: ' + (e instanceof Error ? e.message : String(e))
    }
  }
  return { prices, bets: betRows.length, executors: report }
}

async function processExecutor(uid: string, ex: WalletPush['executors'][number], prices: Record<string, number>, nowIso: string): Promise<string> {
  const admin = createAdminClient()
  const reported = String(ex.currency || '').toUpperCase()
  const fresh = ex.updated_at ? Date.now() - new Date(toIso(ex.updated_at)).getTime() < STALE_MIN * 60_000 : false
  const hasBalance = ex.balance != null && isFinite(Number(ex.balance)) && !!reported && fresh
  const balance = Number(ex.balance)
  if (hasBalance) {
    await admin.from('rg_wallet_snapshots').insert({ user_id: uid, executor_id: ex.executor_id, at: nowIso, balance, currency: reported, reported_at: ex.updated_at ? toIso(ex.updated_at) : null })
  }

  const { data: mem } = await admin.from('rg_members').select('wallet_currency_override').eq('user_id', uid).maybeSingle()
  const override = String(mem?.wallet_currency_override || '').toUpperCase()
  const { data: open } = await admin.from('rg_wallet_periods').select('*').eq('user_id', uid).eq('executor_id', ex.executor_id).is('ended_at', null).maybeSingle()

  // 今の財布の通貨: 会員の申告があればそれ。無ければ受け子の報告 (30 分続いたものだけ)
  let effective = override || ''
  let stable = !!override
  if (!override && hasBalance) {
    effective = reported
    stable = !open || open.currency === reported || (await reportedStableFor(uid, ex.executor_id, reported))
  }

  if (!open) {
    if (!hasBalance || !effective) return 'waiting: no balance yet'
    if (override && override !== reported) return 'waiting: override differs from receiver'
    await openPeriod(uid, ex.executor_id, effective, balance, prices, nowIso, override ? 'member' : 'auto')
    return `opened ${effective}`
  }

  if (effective && effective !== open.currency && stable && hasBalance && reported === effective) {
    // 通貨が変わった: 前の期間を閉じる (最後に分かっている残高で) → 新しい期間
    await applyBets(uid, open, prices, nowIso)
    const lastBal = Number(open.last_balance ?? open.start_coins)
    const endReason = Math.abs(lastBal) < 1e-9 ? 'withdraw' : 'switch'
    await admin
      .from('rg_wallet_periods')
      .update({ ended_at: nowIso, end_coins: lastBal, end_price: priceOf(open.currency, prices), end_reason: endReason, updated_at: nowIso })
      .eq('id', open.id)
    await openPeriod(uid, ex.executor_id, effective, balance, prices, nowIso, override ? 'member' : 'auto')
    await admin.from('rg_notifications').insert({
      user_id: uid,
      kind: 'wallet_period',
      ref_id: null,
      title: '新しい期間を始めました',
      body: `財布の通貨が ${effective} に変わったので、新しい期間を始めました。元本 ${fmtBalance(balance, effective)}`,
    })
    return `switched ${open.currency} -> ${effective}`
  }

  // 同じ期間の続き: トレードで増えた枚数を足し、説明できない差を入金・出金に
  const trade = await applyBets(uid, open, prices, nowIso)
  if (!hasBalance || reported !== open.currency) return `bets ${trade.count} (balance skipped)`
  const price = priceOf(open.currency, prices)
  const prev = Number(open.last_balance ?? open.start_coins)
  const flow = detectFlow(prev, balance, trade.coins, price)
  const upd: Record<string, unknown> = { last_balance: balance, last_at: nowIso, updated_at: nowIso }
  if (flow) {
    const usd = price == null ? null : Math.round(Math.abs(flow.coins) * price * 100) / 100
    await admin.from('rg_wallet_flows').insert({ period_id: open.id, user_id: uid, at: nowIso, kind: flow.kind, coins: flow.coins, price, usd })
    const { data: cur } = await admin.from('rg_wallet_periods').select('flow_in_usd, flow_out_usd, flow_net_coins').eq('id', open.id).single()
    upd.flow_net_coins = Number(cur?.flow_net_coins || 0) + flow.coins
    if (usd != null) {
      if (flow.kind === 'deposit') upd.flow_in_usd = Number(cur?.flow_in_usd || 0) + usd
      else upd.flow_out_usd = Number(cur?.flow_out_usd || 0) + usd
    }
  }
  await admin.from('rg_wallet_periods').update(upd).eq('id', open.id)
  return `bets ${trade.count}${flow ? ` flow ${flow.kind} ${flow.coins}` : ''}`
}

async function openPeriod(uid: string, executorId: string, cur: string, balance: number, prices: Record<string, number>, nowIso: string, source: 'auto' | 'member') {
  const admin = createAdminClient()
  const { data: p, error } = await admin
    .from('rg_wallet_periods')
    .insert({ user_id: uid, executor_id: executorId, currency: cur, source, started_at: nowIso, start_coins: balance, start_price: priceOf(cur, prices), last_balance: balance, last_at: nowIso })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  // 期間より前の BET は、この期間には数えない
  await admin.from('rg_wallet_bets').update({ processed_at: nowIso }).eq('user_id', uid).eq('executor_id', executorId).is('processed_at', null).lt('at', nowIso)
  return p
}

/** まだ数えていない BET を、この期間のトレードとして足す (枚数は今の値段で換える)。 */
async function applyBets(uid: string, open: { id: number; currency: string; started_at: string; trade_usd: number; trade_coins: number; executor_id: string }, prices: Record<string, number>, nowIso: string) {
  const admin = createAdminClient()
  const { data: bets } = await admin
    .from('rg_wallet_bets')
    .select('decision_id, pnl_usd, at')
    .eq('user_id', uid)
    .eq('executor_id', open.executor_id)
    .is('processed_at', null)
    .gte('at', open.started_at)
    .lte('at', nowIso)
    .limit(5000)
  const list = bets || []
  if (!list.length) return { count: 0, coins: 0 }
  const price = priceOf(open.currency, prices)
  const usd = list.reduce((a, b) => a + Number(b.pnl_usd || 0), 0)
  const coins = price == null ? 0 : usd / price
  const ids = list.map((b) => b.decision_id)
  for (let i = 0; i < ids.length; i += 200) {
    await admin.from('rg_wallet_bets').update({ processed_at: nowIso, period_id: open.id, price }).in('decision_id', ids.slice(i, i + 200))
  }
  await admin
    .from('rg_wallet_periods')
    .update({ trade_usd: Number(open.trade_usd || 0) + usd, trade_coins: Number(open.trade_coins || 0) + coins, updated_at: nowIso })
    .eq('id', open.id)
  open.trade_usd = Number(open.trade_usd || 0) + usd
  open.trade_coins = Number(open.trade_coins || 0) + coins
  return { count: list.length, coins }
}

/** 受け子の報告がこの通貨になってから STABLE_MIN 分以上続いているか (一瞬の揺れで期間を切らない)。 */
async function reportedStableFor(uid: string, executorId: string, cur: string): Promise<boolean> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - STABLE_MIN * 60_000).toISOString()
  const { data: before } = await admin
    .from('rg_wallet_snapshots')
    .select('currency, at')
    .eq('user_id', uid)
    .eq('executor_id', executorId)
    .lte('at', since)
    .order('at', { ascending: false })
    .limit(1)
  if (!before?.length || before[0].currency !== cur) return false
  const { data: recent } = await admin.from('rg_wallet_snapshots').select('currency').eq('user_id', uid).eq('executor_id', executorId).gt('at', since)
  return (recent || []).every((r) => r.currency === cur)
}

function toIso(v: string): string {
  const s = String(v || '')
  return /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z'
}

export { isPegged }
