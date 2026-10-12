'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * ★2026-10-12: 画面に戻ってきた時だけ、ページの数字を新しくする (アプリの切り替え・別のタブから戻る・戻るボタン)。
 * 開いたままのホームで 21:10 の「今日の利益」を見て報告してしまったため (山口さん)。
 * 見ている間は何も通信しない。少しの間だけ離れた時は読み直さない (minAwayMs)。
 */
export function RefreshOnReturn({ minAwayMs = 20_000 }: { minAwayMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (hiddenAt && Date.now() - hiddenAt >= minAwayMs) {
        hiddenAt = 0
        router.refresh()
      }
    }
    // 戻るボタンで前の画面がそのまま出た時 (bfcache) も古い数字なので読み直す
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', onShow)
    }
  }, [router, minAwayMs])
  return null
}
