'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import type { PublicSupabase } from '@/lib/supabase/env'
import { Background } from '@/components/background'

// パスワードを決め直す画面。運営が作った 1 回きりのリンク (または「パスワードを忘れた」のメール) から開く。
// リンクの # のあとにログインの印が付いてくるので、それでログインしてから新しいパスワードを保存する。
export function ResetForm({ cfg }: { cfg: PublicSupabase }) {
  const [ready, setReady] = useState<'wait' | 'ok' | 'bad' | 'tap'>('wait')
  const [why, setWhy] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createClient(cfg)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const q = new URLSearchParams(window.location.search)
    const at = h.get('access_token')
    const rt = h.get('refresh_token')
    ;(async () => {
      // ★運営が作るリンクは ?token_hash=… の形。LINE などのプレビューが開いても印を使い切らないよう、
      //   本人が「続ける」を押した時に初めて確かめる。
      if (q.get('token_hash')) {
        setReady('tap')
        return
      }
      if (h.get('error') || q.get('error')) {
        setWhy(h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error') || '')
        setReady('bad')
        return
      }
      if (q.get('code')) {
        const { error } = await supabase.auth.exchangeCodeForSession(q.get('code') as string)
        history.replaceState(null, '', window.location.pathname)
        setWhy(error?.message || '')
        setReady(error ? 'bad' : 'ok')
        return
      }
      if (at && rt) {
        const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
        history.replaceState(null, '', window.location.pathname) // 印を画面の住所から消す
        setReady(error ? 'bad' : 'ok')
        return
      }
      const { data } = await supabase.auth.getSession()
      setReady(data.session ? 'ok' : 'bad')
    })()
  }, [cfg])

  async function onContinue() {
    setBusy(true)
    const q = new URLSearchParams(window.location.search)
    const { error } = await createClient(cfg).auth.verifyOtp({ token_hash: q.get('token_hash') as string, type: 'recovery' })
    setBusy(false)
    history.replaceState(null, '', window.location.pathname)
    if (error) {
      setWhy(error.message)
      setReady('bad')
      return
    }
    setReady('ok')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (pw.length < 8) return setErr('8 文字以上にしてください')
    if (pw !== pw2) return setErr('2 回の入力が違います')
    setBusy(true)
    const { error } = await createClient(cfg).auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr('保存できませんでした。もう一度お試しください (' + error.message + ')')
    setDone(true)
  }

  return (
    <>
      <Background embers={10} side />
      <div className="rg-shell">
        <main className="rg-main" style={{ paddingTop: 56, maxWidth: 420 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/emblem.svg" alt="" width={72} height={72} style={{ filter: 'drop-shadow(0 0 14px rgba(255,120,31,.45))' }} />
            <div className="rg-logo" style={{ fontSize: 26 }}>RENGOKU</div>
          </div>
          <div className="rg-card rg-stack">
            <div className="rg-head"><span className="rg-head-ja">パスワードを決め直す</span></div>
            {ready === 'wait' && <p className="sub">確かめています…</p>}
            {ready === 'tap' && (
              <>
                <p className="sub" style={{ fontSize: 12, lineHeight: 1.7 }}>下のボタンを押すと、新しいパスワードを決める画面に進みます。</p>
                <button type="button" className="rg-btn" disabled={busy} onClick={onContinue}>{busy ? '確かめています…' : '続ける'}</button>
              </>
            )}
            {ready === 'bad' && (
              <>
                <p className="rg-err">このリンクは使えません (使い済みか、時間が過ぎています)。運営に新しいリンクをお願いしてください。</p>
                {why && <p className="faint" style={{ fontSize: 11 }}>理由: {why}</p>}
              </>
            )}
            {ready === 'ok' && !done && (
              <form onSubmit={onSubmit} className="rg-stack">
                <p className="sub" style={{ fontSize: 12, lineHeight: 1.7 }}>
                  新しいパスワードを決めてください。bafather.uk のログインも、このパスワードに変わります。
                </p>
                <input className="rg-input" type="password" autoComplete="new-password" placeholder="新しいパスワード (8 文字以上)" value={pw} onChange={(e) => setPw(e.target.value)} required />
                <input className="rg-input" type="password" autoComplete="new-password" placeholder="もう一度" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
                {err && <p className="rg-err">{err}</p>}
                <button className="rg-btn" disabled={busy}>{busy ? '保存しています…' : '保存する'}</button>
              </form>
            )}
            {done && (
              <>
                <p>新しいパスワードを保存しました。</p>
                <Link href="/home" className="rg-btn">ダッシュボードへ</Link>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
