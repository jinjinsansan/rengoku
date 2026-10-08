import Link from 'next/link'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, jstDate } from '@/lib/jst'
import { usd } from '@/lib/money'
import { Card, Stat } from '@/components/card'

// 管理者画面のトップ: 会員・精算の状況と、各画面への入口。運営だけが入れる。
export default async function AdminHome() {
  const { member } = await requireStaff()
  const admin = createAdminClient()
  const yesterday = addDays(jstDate(), -1)
  const [{ count: members }, { data: due }, { data: y }] = await Promise.all([
    admin.from('rg_members').select('user_id', { count: 'exact', head: true }),
    admin.from('rg_daily_charges').select('charge_amount, due_at').eq('status', 'due'),
    admin.from('rg_daily_charges').select('charge_amount, status').eq('settle_date', yesterday),
  ])
  const dueSum = (due || []).reduce((a, c) => a + Number(c.charge_amount), 0)
  const overdue = (due || []).filter((c) => c.due_at && new Date(c.due_at).getTime() < Date.now()).length
  const ySum = (y || []).reduce((a, c) => a + Number(c.charge_amount), 0)

  return (
    <div className="rg-grid">
      <Card tone="hero" en="ADMIN" ja="管理者画面" aside={member.role === 'owner' ? 'オーナー' : '運営'} className="full">
        <div className="rg-stats">
          <Stat label="会員">{members || 0} 人</Stat>
          <Stat label="お支払い待ち">{(due || []).length} 件</Stat>
          <Stat label="うち期限切れ"><span className={overdue ? 'lose' : ''}>{overdue} 件</span></Stat>
        </div>
        <div className="rg-sep" />
        <div className="rg-stats two">
          <Stat label="お支払い待ちの合計">{usd(dueSum)}</Stat>
          <Stat label={`${yesterday.slice(5).replace('-', '/')} の締め`}>{usd(ySum)}</Stat>
        </div>
      </Card>
      <Card en="CHARGES" ja="精算">
        <p className="sub" style={{ fontSize: 12 }}>入金を確かめて「支払い済み」に。免除・取り消しもここで。</p>
        <Link href="/admin/charges" className="rg-btn rg-btn-sm">精算を見る</Link>
      </Card>
      <Card en="MEMBERS" ja="会員">
        <p className="sub" style={{ fontSize: 12 }}>会員の一覧・肩書き・役割・マスター画面の権限。</p>
        <Link href="/admin/members" className="rg-btn-sub rg-btn-sm">会員を見る</Link>
      </Card>
      <Card en="SETTINGS" ja="設定">
        <p className="sub" style={{ fontSize: 12 }}>チャージの率・期限・紹介報酬・締めの手動実行。</p>
        <Link href="/admin/settings" className="rg-btn-sub rg-btn-sm">設定を見る</Link>
      </Card>
      <Card en="SALON" ja="サロンへの投稿">
        <p className="sub" style={{ fontSize: 12 }}>活動報告・懇親会・メンテナンスはサロンの画面から投稿します。</p>
        <Link href="/salon" className="rg-btn-sub rg-btn-sm">サロンへ</Link>
      </Card>
    </div>
  )
}
