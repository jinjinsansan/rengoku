import type { MetadataRoute } from 'next'

// PWA (ホーム画面に置く)。アイコンはデザイン完成後に public/icons/ へ入れる (brief/04_pwa_icon.md)。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rengoku',
    short_name: 'Rengoku',
    start_url: '/home',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#140A06',
    theme_color: '#140A06',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
