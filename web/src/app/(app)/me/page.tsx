import Link from 'next/link'
import { isStaff, masterBackupUrl, masterUrl, requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { receiverStatuses } from '@/lib/data'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card, Stat } from '@/components/card'
import { signOut, updateProfile } from '../actions'
import { DeviceSettings } from './settings'

// マイページ: プロフィール・通算・受け子・プロフィールの編集・この端末の設定。
export default async function Me() {
  const { userId, email, member } = await requireMember()
  const [{ data: logs }, receivers] = await Promise.all([
    createAdminClient().from('daily_pnl_log').select('bet_pnl').eq('user_id', userId).gte('date', member.joined_at.slice(0, 10)),
    receiverStatuses(userId),
  ])
  const total = (logs || []).reduce((a, r) => a + Number(r.bet_pnl || 0), 0)

  return (
    <div className="rg-grid">
      <Card tone="hero" className="full">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.svg" alt="" width={64} height={64} style={{ filter: 'drop-shadow(0 0 12px rgba(255,120,31,.45))' }} />
          <div>
            <div className="mincho" style={{ fontSize: 20, fontWeight: 700 }}>{member.display_name || '会員'}</div>
            <div className="sub" style={{ fontSize: 12 }}>
              {member.staff_label || member.title || 'メンバー'} · 入会 <span className="num">{member.joined_at.slice(0, 10)}</span>
            </div>
          </div>
        </div>
        {member.bio && <p style={{ lineHeight: 1.7, marginBottom: 0 }}>{member.bio}</p>}
      </Card>

      <Card en="RECORD" ja="通算">
        <div className="rg-stats two">
          <Stat label="累計の利益"><span className={pnlClass(total)}>{signedUsd(total)}</span></Stat>
          <Stat label="稼働した日">{(logs || []).length} 日</Stat>
        </div>
      </Card>

      <Card en="AGENT" ja="受け子">
        {receivers.length === 0 && <p className="sub">まだありません</p>}
        {receivers.map((r) => (
          <div key={r.executor_id} className="rg-row">
            <span>{r.executor_id}</span>
            <span className="num" style={{ fontSize: 15 }}>{r.balance != null ? usd(r.balance) : '-'}</span>
          </div>
        ))}
      </Card>

      <Card en="PROFILE" ja="プロフィールを直す">
        <form action={updateProfile} className="rg-stack">
          <label><span className="rg-label">表示名</span><input name="display_name" className="rg-input" defaultValue={member.display_name || ''} maxLength={24} /></label>
          <label><span className="rg-label">ひとこと</span><textarea name="bio" className="rg-input" defaultValue={member.bio || ''} maxLength={300} /></label>
          <button className="rg-btn-sub rg-btn-sm">保存する</button>
        </form>
      </Card>

      <Card en="SETTINGS" ja="この端末の設定">
        <DeviceSettings />
      </Card>

      <Card en="ACCOUNT" ja="アカウント">
        <div className="faint" style={{ fontSize: 12, marginBottom: 12 }}>ログイン中: {email}</div>
        <div className="rg-stack">
          {member.can_master && <a href={masterUrl()} target="_blank" rel="noopener" className="rg-btn rg-btn-sm">マスター画面</a>}
          {member.can_master && <a href={masterBackupUrl()} target="_blank" rel="noopener" className="rg-btn-sub rg-btn-sm">マスター画面の予備 (前の画面)</a>}
          {isStaff(member) && <Link href="/admin" className="rg-btn-sub rg-btn-sm">管理者画面</Link>}
          <Link href="/referral" className="rg-btn-sub rg-btn-sm">紹介</Link>
          <form action={signOut}><button className="rg-btn-sub rg-btn-sm">ログアウト</button></form>
        </div>
      </Card>
    </div>
  )
}
