'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
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
      <main className="app" style={{ paddingTop: 48 }}>
        <div className="panel hot">
          <h2>確認のメールを送りました</h2>
          <p>メールのリンクを押すと登録が完了します。届かない時は迷惑メールのフォルダもご確認ください。</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app" style={{ paddingTop: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span className="plate" style={{ fontSize: 24 }}>煉獄</span>
      </div>
      <form className="panel stack" onSubmit={onSubmit}>
        <h2>はじめる</h2>
        <input className="input" placeholder="表示名 (サロンで表示されます)" maxLength={24} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <input className="input" type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="パスワード (8 文字以上)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input" placeholder="招待コード" value={invite} onChange={(e) => setInvite(e.target.value)} required />
        {referral && <p className="ash" style={{ fontSize: 12 }}>紹介コード {referral} で登録します</p>}
        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={loading}>{loading ? '登録中…' : '登録する'}</button>
      </form>
    </main>
  )
}

export function SignupFormPage({ cfg }: { cfg: PublicSupabase }) {
  return (
    <Suspense>
      <SignupForm cfg={cfg} />
    </Suspense>
  )
}
