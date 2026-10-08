import { headers } from 'next/headers'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { referralSummary } from '@/lib/data'
import { usd } from '@/lib/money'
import { Card, Stat } from '@/components/card'
import { CopyButton } from '../settlement/copy'

// 紹介: 紹介コードは bafather.uk と同じ (profiles.referral_code)。報酬の率と方式は rg_settings.referral で後から決める。
export default async function Referral() {
  const { userId } = await requireMember()
  const ref = await referralSummary(userId)
  const { data: setting } = await createAdminClient().from('rg_settings').select('value').eq('key', 'referral').maybeSingle()
  const v = (setting?.value || {}) as { mode?: string; rate?: number }
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`
  const link = ref.code ? `${origin}/signup?ref=${encodeURIComponent(ref.code)}` : ''

  return (
    <div className="rg-grid">
      <Card tone="hero" en="CODE" ja="あなたの紹介コード" className="full">
        <div className="rg-hero-num win" style={{ fontSize: 44 }}>{ref.code || '-'}</div>
        {link && (
          <>
            <div className="faint" style={{ wordBreak: 'break-all', fontSize: 12, margin: '6px 0 12px' }}>{link}</div>
            <CopyButton text={link} label="紹介リンクをコピー" />
          </>
        )}
        <p className="sub" style={{ fontSize: 12, lineHeight: 1.7 }}>ご登録には招待コードも必要です。紹介される方には、運営から招待コードをお渡しします。</p>
      </Card>

      <Card en="REWARD" ja="紹介報酬">
        <div className="rg-stats">
          <Stat label="紹介した人">{ref.referred} 人</Stat>
          <Stat label="今月">{usd(ref.month)}</Stat>
          <Stat label="これまで">{usd(ref.total)}</Stat>
        </div>
        <p className="sub" style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>
          {v.mode === 'charge_pct' ? `紹介した方のチャージの ${(Number(v.rate || 0) * 100).toFixed(0)}% が報酬になります。` : '報酬の決まりは準備中です。決まり次第サロンでお知らせいたします。'}
        </p>
      </Card>
    </div>
  )
}
