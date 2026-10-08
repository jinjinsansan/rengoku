'use client'

import { useEffect, useState } from 'react'

// この端末だけの設定 (音・振動・動きを止める)。初期設定はどれもオフ (説明書 5 章)。
const ITEMS = [
  { key: 'rg-haptics', label: '振動', note: '押した瞬間に短く震える (対応する端末のみ)' },
  { key: 'rg-sound', label: '音', note: '押した瞬間に短い音 (お知らせでは鳴らしません)' },
  { key: 'rg-reduce-motion', label: '動きを止める', note: '火の粉・炎のゆらぎ・数字の転がりを止める' },
]

export function DeviceSettings() {
  const [state, setState] = useState<Record<string, boolean>>({})
  useEffect(() => {
    const s: Record<string, boolean> = {}
    for (const it of ITEMS) {
      try {
        s[it.key] = localStorage.getItem(it.key) === '1'
      } catch {}
    }
    setState(s)
  }, [])
  function toggle(key: string) {
    const v = !state[key]
    setState({ ...state, [key]: v })
    try {
      localStorage.setItem(key, v ? '1' : '0')
    } catch {}
    if (key === 'rg-reduce-motion') document.documentElement.dataset.reduceMotion = v ? '1' : '0'
    if (key === 'rg-haptics' && v) navigator.vibrate?.(10)
  }
  return (
    <div>
      {ITEMS.map((it) => (
        <button key={it.key} type="button" className="rg-row" style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer' }} onClick={() => toggle(it.key)}>
          <span>
            <span style={{ fontWeight: 700 }}>{it.label}</span>
            <span className="faint" style={{ display: 'block', fontSize: 11 }}>{it.note}</span>
          </span>
          <span
            aria-hidden
            style={{
              width: 44, height: 24, borderRadius: 12, flex: 'none', position: 'relative',
              border: '1px solid rgba(255,200,61,.6)', background: state[it.key] ? 'rgba(255,200,61,.25)' : 'rgba(20,10,6,.6)',
            }}
          >
            <span style={{ position: 'absolute', top: 3, left: state[it.key] ? 23 : 3, width: 16, height: 16, borderRadius: '50%', background: state[it.key] ? 'var(--rg-gold-text)' : '#6b5d52', transition: 'left .15s' }} />
          </span>
        </button>
      ))}
    </div>
  )
}
