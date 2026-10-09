'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Background } from '@/components/background'
import type { PublicSupabase } from '@/lib/supabase/env'

function LoginForm({ cfg }: { cfg: PublicSupabase }) {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(params.get('e') === 'not_member' ? 'このアカウントは Rengoku の会員として登録されていません。運営にお問い合わせください。' : '')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await createClient(cfg).auth.signInWithPassword({ email, password })
    if (err) {
      setError('メールアドレスかパスワードが違います')
      setLoading(false)
      return
    }
    router.replace('/home')
    router.refresh()
  }

  return (
    <div className="rg-shell"><main className="rg-main" style={{ paddingTop: 56, maxWidth: 420 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.svg" alt="" width={72} height={72} style={{ filter: 'drop-shadow(0 0 14px rgba(255,120,31,.45))' }} />
        <div className="rg-logo" style={{ fontSize: 26 }}>RENGOKU</div>
      </div>
      <form className="rg-card rg-stack" onSubmit={onSubmit}>
        <div className="rg-head"><span className="rg-head-ja">ログイン</span></div>
        <input className="rg-input" type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rg-input" type="password" autoComplete="current-password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="rg-err">{error}</p>}
        <button className="rg-btn" disabled={loading}>{loading ? '確認中…' : 'ログイン'}</button>
        <Link href="/forgot-password" className="sub" style={{ fontSize: 12, textAlign: 'center' }}>パスワードを忘れた方</Link>
      </form>
      <p className="sub" style={{ textAlign: 'center', fontSize: 13 }}>
        はじめての方は <Link href="/signup" style={{ color: 'var(--rg-gold)' }}>登録</Link>
      </p>
    </main></div>
  )
}

export function LoginFormPage({ cfg }: { cfg: PublicSupabase }) {
  return (
    <Suspense>
      <Background embers={10} side />
      <LoginForm cfg={cfg} />
    </Suspense>
  )
}
