'use client'

import { useState } from 'react'

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="rg-btn-sub rg-btn-sm"
      style={{ marginTop: 6 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {}
      }}
    >
      {done ? 'コピーしました' : label}
    </button>
  )
}
