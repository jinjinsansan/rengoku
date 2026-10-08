'use client'

import { useEffect, useState } from 'react'

// 紋章〜コピーのまとまり。初めて開いた時だけ下から浮かび上がる (rgRise 1.6 秒)。押せば飛ばせる。
export function TopHero() {
  const [rise, setRise] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem('rg-top-seen')) {
        setRise(true)
        localStorage.setItem('rg-top-seen', '1')
      }
    } catch {}
  }, [])
  return (
    <div className={'rg-top-hero' + (rise ? ' rise' : '')} onClick={() => setRise(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/emblem.svg" alt="" width={112} height={112} style={{ filter: 'drop-shadow(0 0 18px rgba(255,120,31,.45))' }} />
      <div className="rg-logo">RENGOKU</div>
      <div className="rg-rule" />
      <div className="rg-catch">心を燃やせ。</div>
      <div className="rg-catch-sub">仲間と、毎日を積み上げる。</div>
    </div>
  )
}
