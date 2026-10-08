'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

function LoginForm() {
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
    const { error: err } = await createClient().auth.signInWithPassword({ email, password })
    if (err) {
      setError('メールアドレスかパスワードが違います')
      setLoading(false)
      return
    }
    router.replace('/home')
    router.refresh()
  }

  return (
    <main className="app" style={{ paddingTop: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span className="plate" style={{ fontSize: 24 }}>煉獄</span>
      </div>
      <form className="panel stack" onSubmit={onSubmit}>
        <h2>ログイン</h2>
        <input className="input" type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" autoComplete="current-password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={loading}>{loading ? '確認中…' : 'ログイン'}</button>
      </form>
      <p className="ash" style={{ textAlign: 'center', fontSize: 13 }}>
        はじめての方は <Link href="/signup" style={{ color: 'var(--rg-gold)' }}>登録</Link>
      </p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
