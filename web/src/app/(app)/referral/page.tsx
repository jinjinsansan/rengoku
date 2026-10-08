import { headers } from 'next/headers'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { referralSummary } from '@/lib/data'
import { usd } from '@/lib/money'

// 紹介 (brief/02_screens.md の 8)。紹介コードは bafather.uk と同じ (profiles.referral_code)。
// 報酬の率と方式は rg_settings.referral で後から決める (今は土台だけ)。
export default async function Referral() {
  const { userId } = await requireMember()
  const ref = await referralSummary(userId)
  const { data: setting } = await createAdminClient().from('rg_settings').select('value').eq('key', 'referral').maybeSingle()
  const mode = (setting?.value as { mode?: string; rate?: number } | null)?.mode || 'off'
  const rate = Number((setting?.value as { rate?: number } | null)?.rate || 0)
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`
  const link = ref.code ? `${origin}/signup?ref=${encodeURIComponent(ref.code)}` : ''

  return (
    <div>
      <section className="panel">
        <h2>あなたの紹介コード</h2>
        <div className="num big win" style={{ fontSize: 32 }}>{ref.code || '-'}</div>
        {link && <p className="ash" style={{ wordBreak: 'break-all', fontSize: 12 }}>{link}</p>}
        <p className="ash" style={{ fontSize: 12 }}>登録には招待コードも必要です。紹介する方には、運営から招待コードをお渡しします。</p>
      </section>
      <section className="panel">
        <h2>紹介報酬</h2>
        <div className="row"><span>紹介した人</span><span className="num">{ref.referred} 人</span></div>
        <div className="row"><span>今月</span><span className="num">{usd(ref.month)}</span></div>
        <div className="row"><span>これまで</span><span className="num">{usd(ref.total)}</span></div>
        <p className="ash" style={{ fontSize: 12 }}>
          {mode === 'charge_pct' ? `紹介した方のチャージの ${(rate * 100).toFixed(0)}% が報酬になります。` : '報酬の決まりは準備中です。決まり次第サロンでお知らせします。'}
        </p>
      </section>
    </div>
  )
}
