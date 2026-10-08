import Link from 'next/link'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { Card } from '@/components/card'
import { addMember, updateMember } from '../actions'

const ROLE_JA: Record<string, string> = { owner: 'オーナー', staff: '運営', member: '会員' }

// 会員の管理: 一覧・受け子の状態・肩書きと称号。役割とマスター画面の権限はオーナーだけが変えられる。
export default async function AdminMembers() {
  const { member: me } = await requireStaff()
  const owner = me.role === 'owner'
  const admin = createAdminClient()
  const { data: members } = await admin.from('rg_members').select('*').order('joined_at')
  const uids = (members || []).map((m) => m.user_id)
  const none = ['00000000-0000-0000-0000-000000000000']
  const [{ data: profiles }, { data: rs }, { data: due }] = await Promise.all([
    admin.from('profiles').select('id, email').in('id', uids.length ? uids : none),
    admin.from('receiver_status').select('user_id, executor_id, last_seen_at').in('user_id', uids.length ? uids : none),
    admin.from('rg_daily_charges').select('user_id').eq('status', 'due').in('user_id', uids.length ? uids : none),
  ])

  return (
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        <Link href="/admin" className="rg-chip">‹ 管理者画面</Link>
        <span className="rg-chip on">会員 {(members || []).length} 人</span>
      </div>

      {owner && (
        <Card en="ADD" ja="bafather.uk の会員を加える">
          <form action={addMember} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input name="email" type="email" className="rg-input" placeholder="メールアドレス" required />
            <button className="rg-btn rg-btn-sm" style={{ padding: '0 16px' }}>加える</button>
          </form>
          <p className="faint" style={{ fontSize: 11, marginBottom: 0 }}>加えると、bafather.uk 側の課金は自動で「無料・0%」になります (Rengoku のチャージで精算するため)。</p>
        </Card>
      )}

      {(members || []).map((m) => {
        const email = profiles?.find((p) => p.id === m.user_id)?.email || ''
        const recv = (rs || []).filter((r) => r.user_id === m.user_id)
        const dueN = (due || []).filter((d) => d.user_id === m.user_id).length
        return (
          <Card key={m.user_id} tone={dueN ? 'strong' : ''}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="mincho" style={{ fontWeight: 700, fontSize: 15 }}>{m.display_name || '(名前なし)'}</span>
              <span className={'rg-badge ' + (m.role === 'owner' ? 'maintenance' : m.role === 'staff' ? 'report' : 'general')}>{ROLE_JA[m.role]}</span>
              {m.can_master && <span className="rg-badge event">マスター</span>}
              {dueN > 0 && <span className="win" style={{ fontSize: 12 }}>未払い {dueN} 件</span>}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>{email} · 入会 <span className="num">{String(m.joined_at).slice(0, 10)}</span></div>
            {recv.map((r) => {
              const on = Date.now() - new Date(r.last_seen_at).getTime() < 150_000
              return (
                <div key={r.executor_id} className={'rg-online' + (on ? '' : ' off')} style={{ marginTop: 6 }}>
                  <i />{r.executor_id} · 最後の通信 <span className="num">{fmtJst(r.last_seen_at)}</span>
                </div>
              )
            })}
            <details style={{ marginTop: 10 }}>
              <summary className="win" style={{ cursor: 'pointer', fontSize: 12 }}>編集する</summary>
              <form action={updateMember} className="rg-stack" style={{ marginTop: 10 }}>
                <input type="hidden" name="user_id" value={m.user_id} />
                <label><span className="rg-label">肩書き (運営のみ表示)</span><input name="staff_label" className="rg-input" defaultValue={m.staff_label || ''} maxLength={24} /></label>
                <label><span className="rg-label">称号</span><input name="title" className="rg-input" defaultValue={m.title || ''} maxLength={24} /></label>
                {owner && (
                  <>
                    <label>
                      <span className="rg-label">役割</span>
                      <select name="role" className="rg-input" defaultValue={m.role}>
                        <option value="member">会員</option>
                        <option value="staff">運営</option>
                        <option value="owner">オーナー</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 13 }}><input type="checkbox" name="can_master" defaultChecked={!!m.can_master} /> ダッシュボードにマスター画面のボタンを出す</label>
                  </>
                )}
                <button className="rg-btn-sub rg-btn-sm">保存する</button>
              </form>
            </details>
          </Card>
        )
      })}
    </div>
  )
}
