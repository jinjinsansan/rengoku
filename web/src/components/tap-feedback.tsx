'use client'

import { useEffect } from 'react'

// ボタン・リンクを押した瞬間の「カチッ」と短い振動 (どちらも設定でオンにした時だけ・初期はオフ)。
// star と同じく、画面全体で 1 つの見張り (capture) で拾う。data-no-tap を付けた所は鳴らさない。
export function TapFeedback() {
  useEffect(() => {
    let ctx: AudioContext | null = null
    const click = () => {
      try {
        ctx = ctx || new AudioContext()
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'triangle'
        o.frequency.setValueAtTime(1800, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04)
        g.gain.setValueAtTime(0.08, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
        o.connect(g).connect(ctx.destination)
        o.start()
        o.stop(ctx.currentTime + 0.07)
      } catch {}
    }
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest('button, a[href], [role="button"]')
      if (!el || el.closest('[data-no-tap]')) return
      try {
        if (localStorage.getItem('rg-haptics') === '1') navigator.vibrate?.(10)
        if (localStorage.getItem('rg-sound') === '1') click()
      } catch {}
    }
    document.addEventListener('pointerdown', onDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onDown, { capture: true })
  }, [])
  return null
}
