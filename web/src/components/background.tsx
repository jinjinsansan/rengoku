'use client'

import { useEffect, useState } from 'react'

type Ember = { left: number; size: number; dur: number; delay: number; dx: number; rise: number; gold: boolean }

// 火の粉: 直径 2〜5px・7〜15 秒で下から上へ・左右 ±35px・約 6 割が #FF8A1F (説明書 5 章)
function makeEmbers(n: number): Ember[] {
  return Array.from({ length: n }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 3,
    dur: 7 + Math.random() * 8,
    delay: -Math.random() * 15,
    dx: (Math.random() * 2 - 1) * 35,
    rise: -(60 + Math.random() * 40),
    gold: Math.random() > 0.6,
  }))
}

/** 篝火の背景 (光・ゆらぐ炎・火の粉)。設定「動きを止める」や OS の設定では火の粉を出さない。 */
export function Background({ embers = 14, side = false }: { embers?: number; side?: boolean }) {
  const [list, setList] = useState<Ember[]>([])
  useEffect(() => {
    setList(makeEmbers(embers)) // サーバーとの描画の食い違いを避けるため、ブラウザで作る
  }, [embers])
  return (
    <>
      {side && (
        <div className="rg-side" aria-hidden>
          <div className="rg-side-text">RENGOKU · MEMBERS</div>
        </div>
      )}
      <div className="rg-bg" aria-hidden>
        <div className="rg-flame" />
        {list.map((e, i) => (
          <span
            key={i}
            className="rg-ember"
            style={{
              left: `${e.left}%`, width: e.size, height: e.size,
              background: e.gold ? '#FFC83D' : '#FF8A1F',
              boxShadow: `0 0 ${e.size * 3}px ${e.size * 0.8}px rgba(255,110,31,.5)`,
              ['--dur' as string]: `${e.dur}s`, ['--delay' as string]: `${e.delay}s`,
              ['--dx' as string]: `${e.dx}px`, ['--rise' as string]: `${e.rise}vh`,
            }}
          />
        ))}
      </div>
    </>
  )
}
