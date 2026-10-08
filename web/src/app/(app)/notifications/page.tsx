import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { fmtJst } from '@/lib/jst'
import { markAllRead } from '../actions'

const HREF: Record<string, (id: string | null) => string> = {
  post: (id) => (id ? `/salon/${id}` : '/salon'),
  report: (id) => (id ? `/salon/${id}` : '/salon'),
  event: (id) => (id ? `/salon/${id}` : '/salon'),
  maintenance: (id) => (id ? `/salon/${id}` : '/salon'),
  charge_due: () => '/settlement',
  charge_paid: () => '/settlement',
  referral: () => '/referral',
}

export default async function Notifications() {
  await requireMember()
  const supabase = await createClient()
  const { data } = await supabase.from('rg_notifications').select('*').order('created_at', { ascending: false }).limit(100)
  return (
    <div>
      <form action={markAllRead} style={{ marginBottom: 12 }}>
        <button className="btn char sm">すべて既読にする</button>
      </form>
      {(data || []).length === 0 && <p className="ash">通知はありません</p>}
      {(data || []).map((n) => (
        <Link key={n.id} href={(HREF[n.kind] || (() => '/home'))(n.ref_id)} className="panel" style={{ display: 'block' }}>
          <div className="row" style={{ borderBottom: 0, padding: 0 }}>
            <span>{!n.read_at && <span style={{ color: 'var(--rg-flame)' }}>● </span>}{n.title}</span>
            <span className="ash" style={{ fontSize: 11 }}>{fmtJst(n.created_at)}</span>
          </div>
          {n.body && <div className="ash" style={{ fontSize: 13 }}>{n.body}</div>}
        </Link>
      ))}
    </div>
  )
}
