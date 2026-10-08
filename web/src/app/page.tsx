import Link from 'next/link'
import { Background } from '@/components/background'
import { TopHero } from './top-hero'

// TOP (ログイン前・説明書 4-1)。1 画面でスクロールしない。ボタンは「はじめる」「ログイン」の 2 つだけ。
export default function Top() {
  return (
    <>
      <Background embers={16} side />
      <div className="rg-shell">
        <main className="rg-top">
          <TopHero />
          <div className="rg-top-actions">
            <Link href="/signup" className="rg-btn">はじめる</Link>
            <Link href="/login" className="rg-btn-sub">ログイン</Link>
            <div className="rg-top-note">招待制のチーム専用サイトです</div>
          </div>
        </main>
      </div>
    </>
  )
}
