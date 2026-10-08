import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rengoku',
  description: 'Rengoku — チーム専用の会員アプリ',
  appleWebApp: { capable: true, title: 'Rengoku', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = { themeColor: '#140A06', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&family=Saira+Condensed:wght@700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
