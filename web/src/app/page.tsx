import Link from 'next/link'

// TOP (ログイン前)。スクロールしない 1 画面・ボタンは 2 つだけ (brief/02_screens.md の 1)。
export default function Top() {
  return (
    <main
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 18, maxWidth: 420, margin: '0 auto', textAlign: 'center',
      }}
    >
      <div className="plate" style={{ fontSize: 40, padding: '10px 26px' }}>煉獄</div>
      <div style={{ letterSpacing: '0.4em', color: 'var(--rg-gold)' }}>RENGOKU</div>
      <p style={{ margin: '8px 0 24px' }}>心を燃やせ。仲間と、毎日を積み上げる。</p>
      <Link href="/signup" className="btn">はじめる</Link>
      <Link href="/login" className="btn char">ログイン</Link>
      <p className="ash" style={{ fontSize: 12, marginTop: 12 }}>招待制のチーム専用サイトです</p>
    </main>
  )
}
