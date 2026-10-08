import Link from 'next/link'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, jstDate } from '@/lib/jst'
import { Card } from '@/components/card'
import { runSettle, saveSettings } from '../actions'

// 設定: チャージの率・支払いの期限・紹介報酬。変えられるのはオーナーだけ (運営は見るだけ)。
export default async function AdminSettings() {
  const { member } = await requireStaff()
  const owner = member.role === 'owner'
  const { data } = await createAdminClient().from('rg_settings').select('key, value')
  const get = (k: string) => data?.find((s) => s.key === k)?.value
  const rate = Number(get('charge_rate') ?? 0.3)
  const hours = Number(get('charge_due_hours') ?? 24)
  const ref = (get('referral') || { mode: 'off', rate: 0 }) as { mode?: string; rate?: number }

  return (
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        <Link href="/admin" className="rg-chip">‹ 管理者画面</Link>
        <span className="rg-chip on">設定</span>
      </div>
      <Card en="SETTINGS" ja="チャージと紹介" aside={owner ? '' : '見るだけ (変更はオーナー)'}>
        <form action={saveSettings} className="rg-stack">
          <label><span className="rg-label">チャージの率 (%) — その日の利益に対して</span>
            <input name="charge_rate" type="number" min={0} max={100} step={1} className="rg-input" defaultValue={Math.round(rate * 100)} disabled={!owner} /></label>
          <label><span className="rg-label">支払いの期限 (締めから何時間)</span>
            <input name="charge_due_hours" type="number" min={1} max={168} className="rg-input" defaultValue={hours} disabled={!owner} /></label>
          <label><span className="rg-label">紹介報酬の方式</span>
            <select name="referral_mode" className="rg-input" defaultValue={ref.mode || 'off'} disabled={!owner}>
              <option value="off">なし (準備中)</option>
              <option value="charge_pct">紹介した方のチャージの %</option>
            </select></label>
          <label><span className="rg-label">紹介報酬の率 (%)</span>
            <input name="referral_rate" type="number" min={0} max={100} step={1} className="rg-input" defaultValue={Math.round(Number(ref.rate || 0) * 100)} disabled={!owner} /></label>
          {owner && <button className="rg-btn rg-btn-sm">保存する</button>}
          <p className="faint" style={{ fontSize: 11, margin: 0 }}>変えた率は、次の締め (毎日 0:15) から使われます。もう作った精算の額は変わりません。</p>
        </form>
      </Card>
      {owner && (
        <Card en="SETTLE" ja="締めを手動で実行">
          <form action={runSettle} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input name="date" type="date" className="rg-input" defaultValue={addDays(jstDate(), -1)} />
            <button className="rg-btn-sub rg-btn-sm" style={{ padding: '0 16px' }}>実行</button>
          </form>
          <p className="faint" style={{ fontSize: 11, marginBottom: 0 }}>毎日 0:15 に自動で行います。失敗した日だけ使ってください。同じ日を 2 回実行しても二重にはなりません。</p>
        </Card>
      )}
    </div>
  )
}
