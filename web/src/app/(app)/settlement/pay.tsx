'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CopyButton } from './copy'

type Order = { order_id: string; amount: number; expires_at: string; charge_count: number; total_due: number; address: string }

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 「送金する」→ 未払いをまとめた注文 (専用の額・60 分) を作り、送金先と額を出す。
 * 入金は VPS の見張りが数分ごとに確かめ、見つかると自動で「支払い済み」になる。この画面は 15 秒ごとに状態を見る。
 */
export function PayPanel({ count, total }: { count: number; total: number }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<'pending' | 'credited' | 'expired' | ''>('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)

  async function start() {
    setBusy(true)
    setErr('')
    const r = await fetch('/api/pay', { method: 'POST' }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (!r || !r.ok) return setErr((r && r.error) || 'うまくいきませんでした。少し時間をおいてお試しください。')
    if (r.none) return router.refresh()
    setOrder(r)
    setStatus('pending')
  }

  useEffect(() => {
    if (!order) return
    const tick = () => setLeft((new Date(order.expires_at).getTime() - Date.now()) / 1000)
    tick()
    const t1 = setInterval(tick, 1000)
    const t2 = setInterval(async () => {
      const r = await fetch('/api/pay?order=' + encodeURIComponent(order.order_id)).then((x) => x.json()).catch(() => null)
      if (r && r.ok) {
        setStatus(r.status)
        if (r.status === 'credited') {
          clearInterval(t2)
          setTimeout(() => router.refresh(), 2500)
        }
      }
    }, 15000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [order, router])

  if (!order) {
    return (
      <div className="rg-stack">
        <button type="button" className="rg-btn" disabled={busy} onClick={start}>
          {busy ? '準備しています…' : '送金する'}
          <small>{count} 件まとめて · ${total.toFixed(2)}</small>
        </button>
        {err && <p className="rg-err">{err}</p>}
      </div>
    )
  }

  if (status === 'credited') {
    return (
      <div className="rg-card ok" style={{ textAlign: 'center' }}>
        <div className="mincho" style={{ fontSize: 18, fontWeight: 700, color: 'var(--rg-ok)' }}>ご送金を受け取りました</div>
        <p className="sub" style={{ fontSize: 12 }}>ありがとうございました。精算は「支払い済み」になります。</p>
      </div>
    )
  }

  const expired = status === 'expired' || left <= 0
  return (
    <div className="rg-card strong rg-stack">
      <div className="rg-head" style={{ marginBottom: 0 }}>
        <span className="rg-head-en">PAY</span>
        <span className="rg-head-ja">この金額ちょうどで送金してください</span>
      </div>
      <div className="num win" style={{ fontSize: 44, lineHeight: 1.1, textAlign: 'center' }}>{order.amount.toFixed(2)} <span style={{ fontSize: 18 }}>USDT</span></div>
      <CopyButton text={order.amount.toFixed(2)} label="金額をコピー" />
      <p className="faint" style={{ fontSize: 11, margin: 0, lineHeight: 1.7 }}>
        未払い {order.charge_count} 件の合計 ${order.total_due.toFixed(2)}。どなたからのご送金かを金額の端数で確かめるため、少しだけ違う額になることがあります。
      </p>
      <div>
        <span className="rg-label">送金先 (USDT・TRC-20)</span>
        <div className="num" style={{ wordBreak: 'break-all', fontSize: 15, color: 'var(--rg-gold-text)' }}>{order.address || '運営からご案内します'}</div>
        {order.address && <CopyButton text={order.address} label="送金先をコピー" />}
      </div>
      {!expired ? (
        <p style={{ fontSize: 13, margin: 0 }}>
          あと <b className="num">{mmss(left)}</b> 以内にお送りください。届くと数分で自動で確認され、この画面が変わります。
        </p>
      ) : (
        <>
          <p className="rg-err" style={{ margin: 0 }}>この金額の受付時間 (60 分) が過ぎました。もう一度「送金する」を押してください。</p>
          <button type="button" className="rg-btn-sub rg-btn-sm" onClick={() => { setOrder(null); setStatus('') }}>もう一度</button>
        </>
      )}
    </div>
  )
}
