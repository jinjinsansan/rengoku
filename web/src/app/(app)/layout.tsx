import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { TabBar } from './tabbar'

// 会員の画面の骨組み: 上の HUD・下のタブバー (brief/02_screens.md の「全体の骨組み」)。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, member } = await requireMember()
  const admin = createAdminClient()
  const [{ count: unread }, { count: due }] = await Promise.all([
    admin.from('rg_notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    admin.from('rg_daily_charges').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'due'),
  ])
  return (
    <>
      <header className="hud">
        <Link href="/home" className="plate">煉獄</Link>
        <span className="ash" style={{ fontSize: 13 }}>{member.display_name || '会員'}</span>
        <Link href="/notifications" aria-label="通知" style={{ position: 'relative', fontSize: 22 }}>
          🔔
          {!!unread && (
            <span className="num" style={{ position: 'absolute', top: -6, right: -10, background: 'var(--rg-crimson)', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 6px' }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      </header>
      <main className="app">{children}</main>
      <TabBar settlementDue={!!due} />
    </>
  )
}
