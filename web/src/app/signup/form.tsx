'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Background } from '@/components/background'
import type { PublicSupabase } from '@/lib/supabase/env'

// 登録は招待制 (bafather.uk と同じ招待コード・同じ DB の検証)。
// user_metadata.team = 'rengoku' を付けておくと、初回ログイン時に Rengoku の会員の行が作られる。
function SignupForm({ cfg }: { cfg: PublicSupabase }) {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [invite, setInvite] = useState(params.get('invite') || '')
  const [referral] = useState(params.get('ref') || '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const code = invite.trim().toUpperCase()
    const chk = await fetch('/api/auth/invite-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => null)
    if (!chk || !chk.ok) {
      setError(chk && chk.status === 503 ? 'いまは登録を受け付けられません。少し時間をおいてお試しください。' : '招待コードが正しくありません')
      setLoading(false)
      return
    }
    const { error: err } = await createClient(cfg).auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        data: { team: 'rengoku', display_name: displayName.trim(), invite_code: code, referred_by: referral || null },
      },
    })
    if (err) {
      setError(/invite code/i.test(err.message) ? '招待コードが正しくありません' : err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="rg-shell"><main className="rg-main" style={{ paddingTop: 56, maxWidth: 420 }}>
        <div className="rg-card strong">
          <div className="rg-head"><span className="rg-head-ja">確認のメールを送りました</span></div>
          <p>メールのリンクを押すと登録が完了します。届かない時は迷惑メールのフォルダもご確認ください。</p>
        </div>
      </main></div>
    )
  }

  return (
    <div className="rg-shell"><main className="rg-main" style={{ paddingTop: 56, maxWidth: 420 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.svg" alt="" width={72} height={72} style={{ filter: 'drop-shadow(0 0 14px rgba(255,120,31,.45))' }} />
        <div className="rg-logo" style={{ fontSize: 26 }}>RENGOKU</div>
      </div>
      <form className="rg-card rg-stack" onSubmit={onSubmit}>
        <div className="rg-head"><span className="rg-head-ja">はじめる</span></div>
        <input className="rg-input" placeholder="表示名 (サロンで表示されます)" maxLength={24} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <input className="rg-input" type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rg-input" type="password" autoComplete="new-password" placeholder="パスワード (8 文字以上)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="rg-input" placeholder="招待コード" value={invite} onChange={(e) => setInvite(e.target.value)} required />
        {referral && <p className="sub" style={{ fontSize: 12 }}>紹介コード {referral} で登録します</p>}
        {error && <p className="rg-err">{error}</p>}
        <button className="rg-btn" disabled={loading}>{loading ? '登録中…' : '登録する'}</button>
      </form>
    </main></div>
  )
}

export function SignupFormPage({ cfg }: { cfg: PublicSupabase }) {
  return (
    <Suspense>
      <Background embers={10} side />
      <SignupForm cfg={cfg} />
    </Suspense>
  )
}
