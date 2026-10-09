'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Background } from '@/components/background'
import type { PublicSupabase } from '@/lib/supabase/env'

// パスワードを忘れた方へ: メールアドレスに「決め直すリンク」を送る (2026-10-09)。
// メールの文面とリンク先は Supabase の「recovery」の雛形 (rengoku.net/reset-password?token_hash=…) で決まる。
// 登録の有無が分からないよう、送れても送れなくても同じ案内を出す。
export function ForgotForm({ cfg }: { cfg: PublicSupabase }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await createClient(cfg).auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://www.rengoku.net/reset-password',
    })
    setLoading(false)
    if (err && /rate|limit|seconds/i.test(err.message)) {
      setError('続けて送ることはできません。少し時間をおいてお試しください。')
      return
    }
    setSent(true)
  }

  return (
    <>
      <Background embers={10} side />
      <div className="rg-shell"><main className="rg-main" style={{ paddingTop: 56, maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.svg" alt="" width={72} height={72} style={{ filter: 'drop-shadow(0 0 14px rgba(255,120,31,.45))' }} />
          <div className="rg-logo" style={{ fontSize: 26 }}>RENGOKU</div>
        </div>
        {sent ? (
          <div className="rg-card rg-stack">
            <div className="rg-head"><span className="rg-head-ja">メールをお送りしました</span></div>
            <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              ご登録のメールアドレスであれば、「会員サポート」からパスワードを決め直すリンクが届きます。リンクは 1 時間・1 回だけ使えます。
            </p>
            <p className="faint" style={{ fontSize: 11, lineHeight: 1.7, margin: 0 }}>
              数分たっても届かない時は、迷惑メールのフォルダもご覧ください。それでも届かない時はサロンの運営までお声がけください。
            </p>
          </div>
        ) : (
          <form className="rg-card rg-stack" onSubmit={onSubmit}>
            <div className="rg-head"><span className="rg-head-ja">パスワードを忘れた方</span></div>
            <p className="sub" style={{ fontSize: 12, lineHeight: 1.7, margin: 0 }}>ご登録のメールアドレスを入れてください。パスワードを決め直すリンクをお送りします。</p>
            <input className="rg-input" type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <p className="rg-err">{error}</p>}
            <button className="rg-btn" disabled={loading}>{loading ? '送っています…' : 'リンクを送る'}</button>
          </form>
        )}
        <p className="sub" style={{ textAlign: 'center', fontSize: 13 }}>
          <Link href="/login" style={{ color: 'var(--rg-gold)' }}>ログインに戻る</Link>
        </p>
      </main></div>
    </>
  )
}
