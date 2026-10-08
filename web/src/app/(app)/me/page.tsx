import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { receiverStatuses } from '@/lib/data'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { signOut, updateProfile } from '../actions'

// マイページ (brief/02_screens.md の 7)。
export default async function Me() {
  const { userId, email, member } = await requireMember()
  const admin = createAdminClient()
  const [{ data: logs }, receivers] = await Promise.all([
    admin.from('daily_pnl_log').select('bet_pnl').eq('user_id', userId).gte('date', member.joined_at.slice(0, 10)),
    receiverStatuses(userId),
  ])
  const total = (logs || []).reduce((a, r) => a + Number(r.bet_pnl || 0), 0)
  const days = (logs || []).length

  return (
    <div>
      <section className="panel" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔥</div>
        <div style={{ fontSize: 20 }}>{member.display_name || '会員'}</div>
        <div className="ash" style={{ fontSize: 12 }}>
          {member.staff_label || member.title || 'メンバー'} · 入会 {member.joined_at.slice(0, 10)}
        </div>
        {member.bio && <p style={{ fontWeight: 500 }}>{member.bio}</p>}
      </section>

      <section className="panel">
        <h2>通算</h2>
        <div className="row"><span>累計の利益</span><span className={'num ' + pnlClass(total)}>{signedUsd(total)}</span></div>
        <div className="row"><span>稼働した日</span><span className="num">{days} 日</span></div>
      </section>

      <section className="panel">
        <h2>受け子</h2>
        {receivers.map((r) => (
          <div key={r.executor_id} className="row"><span>{r.executor_id}</span><span className="num">{r.balance != null ? usd(r.balance) : '-'}</span></div>
        ))}
        {receivers.length === 0 && <p className="ash">まだありません</p>}
      </section>

      <form action={updateProfile} className="panel stack">
        <h2>プロフィールを直す</h2>
        <input name="display_name" className="input" defaultValue={member.display_name || ''} maxLength={24} placeholder="表示名" />
        <textarea name="bio" className="input" defaultValue={member.bio || ''} maxLength={300} placeholder="ひとこと" />
        <button className="btn sm">保存</button>
      </form>

      <section className="panel stack">
        <div className="ash" style={{ fontSize: 12 }}>ログイン中: {email}</div>
        <Link href="/referral" className="btn char sm">紹介</Link>
        <form action={signOut}><button className="btn char sm">ログアウト</button></form>
      </section>
    </div>
  )
}
