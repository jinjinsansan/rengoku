import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TapFeedback } from '@/components/tap-feedback'

export const metadata: Metadata = {
  title: 'Rengoku',
  description: 'Rengoku — チーム専用の会員アプリ',
  appleWebApp: { capable: true, title: 'Rengoku', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = { themeColor: '#140A06', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

// 「動きを止める」(マイページの設定・この端末だけ) を、描画の前に反映する
const MOTION_INIT = `try{if(localStorage.getItem('rg-reduce-motion')==='1')document.documentElement.dataset.reduceMotion='1'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_INIT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Saira+Condensed:wght@600;700&family=Zen+Kaku+Gothic+New:wght@500;700&family=Zen+Old+Mincho:wght@500;700&display=swap"
        />
      </head>
      <body>
        <TapFeedback />
        {children}
      </body>
    </html>
  )
}
