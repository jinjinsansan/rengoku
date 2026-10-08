'use client'

import { useEffect, useRef, useState } from 'react'

function hms(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 残り時間 HH:MM:SS を 1 秒ずつ減らす。サーバーの時刻 (serverNow) と合わせ、端末の時計のずれを持ち込まない。
 */
export function Countdown({ target, serverNow }: { target: string; serverNow: string }) {
  const offset = useRef(0)
  const [left, setLeft] = useState(() => (new Date(target).getTime() - new Date(serverNow).getTime()) / 1000)
  useEffect(() => {
    offset.current = new Date(serverNow).getTime() - Date.now()
    const tick = () => setLeft((new Date(target).getTime() - (Date.now() + offset.current)) / 1000)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target, serverNow])
  return <span className="num">{hms(left)}</span>
}

function reduceMotion(): boolean {
  if (typeof window === 'undefined') return true
  return document.documentElement.dataset.reduceMotion === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 今日の利益: 開いて 0.5 秒後から 0 → 値まで 1.3 秒で転がり (ease-out の 3 乗)、止まったら 0.7 秒光る。
 */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const fmt = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}$${Math.abs(v).toFixed(2)}`
  const [shown, setShown] = useState(value)
  const [glow, setGlow] = useState(false)
  useEffect(() => {
    if (reduceMotion() || value === 0) {
      setShown(value)
      return
    }
    setShown(0)
    let raf = 0
    let t0 = 0
    const start = setTimeout(() => {
      const step = (t: number) => {
        if (!t0) t0 = t
        const p = Math.min(1, (t - t0) / 1300)
        setShown(value * (1 - Math.pow(1 - p, 3)))
        if (p < 1) raf = requestAnimationFrame(step)
        else {
          setGlow(true)
          setTimeout(() => setGlow(false), 700)
        }
      }
      raf = requestAnimationFrame(step)
    }, 500)
    return () => {
      clearTimeout(start)
      cancelAnimationFrame(raf)
    }
  }, [value])
  return <div className={`rg-hero-num ${value >= 0 ? 'win' : 'lose'} ${glow ? 'glow' : ''} ${className}`}>{fmt(shown)}</div>
}
