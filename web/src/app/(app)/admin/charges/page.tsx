import Link from 'next/link'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card } from '@/components/card'
import { markPaid, reopen, waive } from '../actions'

const STATUS_JA: Record<string, string> = { due: 'お支払い待ち', paid: '支払い済み', none: 'チャージなし', waived: '免除' }
const FILTERS = [
  { k: 'due', label: 'お支払い待ち' },
  { k: 'paid', label: '支払い済み' },
  { k: 'all', label: 'すべて' },
]

// 精算の管理: 入金を確かめて「支払い済み」にする。期限を過ぎても自動では止めない (止めるのは運営が別に行う)。
export default async function AdminCharges({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireStaff()
  const { s = 'due' } = await searchParams
  const admin = createAdminClient()
  let q = admin.from('rg_daily_charges').select('*').order('settle_date', { ascending: false }).order('created_at', { ascending: false }).limit(300)
  if (s !== 'all') q = q.eq('status', s)
  const { data: rows } = await q
  const uids = Array.from(new Set((rows || []).map((r) => r.user_id)))
  const [{ data: members }, { data: profiles }] = await Promise.all([
    admin.from('rg_members').select('user_id, display_name').in('user_id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000']),
    admin.from('profiles').select('id, email').in('id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000']),
  ])
  const nameOf = (uid: string) => members?.find((m) => m.user_id === uid)?.display_name || profiles?.find((p) => p.id === uid)?.email || uid.slice(0, 8)

  return (
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        <Link href="/admin" className="rg-chip">‹ 管理者画面</Link>
        {FILTERS.map((f) => (
          <Link key={f.k} href={`/admin/charges?s=${f.k}`} className={'rg-chip' + (s === f.k ? ' on' : '')}>{f.label}</Link>
        ))}
      </div>
      {(rows || []).length === 0 && <Card><p className="sub">該当する精算はありません</p></Card>}
      {(rows || []).map((c) => {
        const overdue = c.status === 'due' && c.due_at && new Date(c.due_at).getTime() < Date.now()
        return (
          <Card key={c.id} tone={c.status === 'due' ? (overdue ? 'alert' : 'strong') : ''}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="mincho" style={{ fontWeight: 700, fontSize: 15 }}>{nameOf(c.user_id)}</span>
              <span className="num sub">{c.settle_date}</span>
              <span className={'rg-badge ' + (c.status === 'due' ? 'event' : c.status === 'paid' ? 'report' : 'general')} style={{ marginLeft: 'auto' }}>
                {STATUS_JA[c.status]}{overdue ? '・期限切れ' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              <span className="sub" style={{ fontSize: 12 }}>
                利益 <span className={'num ' + pnlClass(c.daily_pnl)}>{signedUsd(c.daily_pnl)}</span>
                {Number(c.carry_in) < 0 && <> 繰越 <span className="num lose">{signedUsd(c.carry_in)}</span></>}
                {' '}× {(Number(c.rate) * 100).toFixed(0)}%
                {Number(c.carry_out) < 0 && <> · 翌日へ <span className="num lose">{signedUsd(c.carry_out)}</span></>}
                {c.due_at && <> · 期限 <span className="num">{fmtJst(c.due_at)}</span></>}
              </span>
              <span className="num win" style={{ fontSize: 26 }}>{usd(c.charge_amount)}</span>
            </div>
            {c.paid_at && <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>支払い確認 {fmtJst(c.paid_at)}{c.payment_ref ? ` · ${c.payment_ref}` : ''}</div>}
            {c.status === 'due' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 12 }}>
                <form action={markPaid} style={{ display: 'grid', gap: 8 }}>
                  <input type="hidden" name="charge_id" value={c.id} />
                  <input name="payment_ref" className="rg-input" placeholder="入金の控え (取引 ID など・任意)" style={{ fontSize: 13, padding: '8px 10px' }} />
                  <button className="rg-btn rg-btn-sm">支払い済みにする</button>
                </form>
                <form action={waive} style={{ display: 'grid', gap: 8, alignContent: 'end' }}>
                  <input type="hidden" name="charge_id" value={c.id} />
                  <button className="rg-btn-sub rg-btn-sm">免除</button>
                </form>
              </div>
            )}
            {(c.status === 'paid' || c.status === 'waived') && (
              <form action={reopen} style={{ marginTop: 10 }}>
                <input type="hidden" name="charge_id" value={c.id} />
                <button className="rg-btn-sub rg-btn-sm">お支払い待ちに戻す</button>
              </form>
            )}
          </Card>
        )
      })}
    </div>
  )
}
