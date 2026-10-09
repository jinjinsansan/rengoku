'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CurBadge } from '@/components/wallet'
import { setWalletCurrency } from '../../actions'

const OPTS = ['USDT', 'USDC', 'BTC', 'ETH'] as const
const DESC: Record<string, string> = {
  USDT: 'テザー · ドルのまま',
  USDC: 'USD コイン · ドルのまま',
  BTC: 'ビットコイン · 枚数と値上がり益',
  ETH: 'イーサリアム · 枚数と値上がり益',
}

export function WalletPicker({ detected, declared }: { detected: string; declared: string }) {
  const router = useRouter()
  const effective = declared || detected
  const [pick, setPick] = useState(effective)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const changed = !!pick && pick !== effective
  const backToAuto = !!declared && pick === detected

  function save() {
    if (!changed) return
    setMsg('')
    start(async () => {
      const r = await setWalletCurrency(backToAuto ? 'AUTO' : pick)
      if (!r.ok) return setMsg(r.error || 'うまくいきませんでした')
      setMsg(backToAuto ? '自動の判定に戻しました。' : `${pick} にしました。次の記録 (10 分ごと) で新しい期間が始まります。`)
      router.refresh()
    })
  }

  const label = changed ? (backToAuto ? '自動の判定に戻す' : `${pick} にする`) : declared ? `${declared} にしています` : '自動の判定のまま'
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 2px' }}>
          <span className="mincho" style={{ fontWeight: 700, fontSize: 15 }}>手で直す</span>
          <span style={{ fontSize: 11, color: '#A89078' }}>違う時だけ選んでください</span>
        </div>
        {OPTS.map((k) => (
          <button key={k} type="button" className={'rg-w-opt' + (pick === k ? ' on' : '')} onClick={() => setPick(k)} aria-pressed={pick === k}>
            <span className="rg-w-radio" />
            <CurBadge cur={k} />
            <span style={{ flex: 1, fontSize: 12, color: '#A89078' }}>{DESC[k]}</span>
            {k === detected && <span className="rg-w-tag">自動</span>}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: '#A89078' }}>直すと、その日から新しい期間を始め、運営にも知らせます。これまでの期間の成績は変わりません。</div>
      <button
        type="button"
        onClick={save}
        disabled={!changed || pending}
        style={{
          height: 60, borderRadius: 12, border: '1px solid #140A06', fontFamily: 'var(--rg-font-heading)', fontWeight: 700, fontSize: 17, letterSpacing: '.2em',
          cursor: changed ? 'pointer' : 'default',
          background: changed ? 'linear-gradient(180deg,#E8822E,#C8441A 55%,#8E1015)' : 'linear-gradient(180deg,#5a4f48,#3f3530)',
          boxShadow: changed ? 'inset 0 0 0 1px rgba(255,222,150,.55),inset 0 1px 0 rgba(255,255,255,.35),0 4px 0 #0A0503,0 12px 22px rgba(150,40,10,.3)' : 'none',
          color: changed ? '#FFF4E2' : '#A89078',
        }}
      >
        {pending ? '保存しています…' : label}
      </button>
      {msg && <p className="sub" style={{ fontSize: 12, margin: 0 }}>{msg}</p>}
    </>
  )
}
