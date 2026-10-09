import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { fmtJst } from '@/lib/jst'
import { Card } from '@/components/card'
import { markAllRead } from '../actions'

const HREF: Record<string, (id: string | null) => string> = {
  post: (id) => (id ? `/salon/${id}` : '/salon'),
  report: (id) => (id ? `/salon/${id}` : '/salon'),
  event: (id) => (id ? `/salon/${id}` : '/salon'),
  maintenance: (id) => (id ? `/salon/${id}` : '/salon'),
  charge_due: () => '/settlement',
  charge_paid: () => '/settlement',
  referral: () => '/referral',
  wallet_period: () => '/assets',
  wallet_override: () => '/admin/members',
}

export default async function Notifications() {
  await requireMember()
  const supabase = await createClient()
  const { data } = await supabase.from('rg_notifications').select('*').order('created_at', { ascending: false }).limit(100)
  return (
    <div className="rg-stack">
      <form action={markAllRead}><button className="rg-btn-sub rg-btn-sm">すべて既読にする</button></form>
      <Card en="NOTICE" ja="通知">
        {(data || []).length === 0 && <p className="sub">通知はありません</p>}
        {(data || []).map((n) => (
          <Link key={n.id} href={(HREF[n.kind] || (() => '/home'))(n.ref_id)} className="rg-row" style={{ justifyContent: 'flex-start' }}>
            {!n.read_at ? <span className="rg-unread" /> : <span style={{ width: 6 }} />}
            <span style={{ flex: 1 }}>
              <span className="rg-row-title">{n.title}</span>
              {n.body && <span className="faint" style={{ display: 'block', fontSize: 12 }}>{n.body}</span>}
            </span>
            <span className="num sub" style={{ fontSize: 12 }}>{fmtJst(n.created_at)}</span>
          </Link>
        ))}
      </Card>
    </div>
  )
}
