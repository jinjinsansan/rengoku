import { requireMember } from '@/lib/member'
import { loadWallet } from '@/lib/wallet-view'
import { CurBadge } from '@/components/wallet'
import { WalletPicker } from './picker'

// マイページ · 財布の通貨 (README_WALLET.md W5)。自動で見つけた通貨と、手で直す選択肢。
export default async function WalletCurrency() {
  const { userId } = await requireMember()
  const w = await loadWallet(userId)
  const detected = w.detected?.currency || ''
  const at = w.detected?.at ? new Date(new Date(w.detected.at).getTime() + 9 * 3600_000) : null
  const atStr = at ? `${at.getUTCMonth() + 1}/${at.getUTCDate()} ${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}` : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rg-w-card" style={{ padding: '14px 18px' }}>
        <span style={{ fontSize: 11, color: '#A89078' }}>自動で見つけた通貨</span>
        {detected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CurBadge cur={detected} size="lg" />
            <span style={{ fontSize: 12, color: '#C9B8A6', lineHeight: 1.5 }}>
              受け子 {w.detected?.executorId} から<br />{atStr} に見つけました
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#C9B8A6' }}>まだ見つかっていません。受け子が動き始めると自動で見つけます。</span>
        )}
      </div>
      <WalletPicker detected={detected} declared={w.declared || ''} />
    </div>
  )
}
