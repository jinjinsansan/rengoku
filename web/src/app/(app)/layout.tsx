import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { Background } from '@/components/background'
import { Hud, TabBar } from '@/components/chrome'

// 会員の画面の骨組み: 篝火の背景・上の HUD・下のタブバー (説明書 4-2)。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireMember()
  const admin = createAdminClient()
  const [{ count: unread }, { count: due }] = await Promise.all([
    admin.from('rg_notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    admin.from('rg_daily_charges').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'due'),
  ])
  return (
    <>
      <Background embers={10} side />
      <div className="rg-shell">
        <Hud unread={unread || 0} />
        <main className="rg-main">{children}</main>
        <TabBar settlementDue={!!due} />
      </div>
    </>
  )
}
