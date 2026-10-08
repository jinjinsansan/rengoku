'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/home', label: 'ホーム', icon: '🔥' },
  { href: '/salon', label: 'サロン', icon: '📜' },
  { href: '/bets', label: '履歴', icon: '📊' },
  { href: '/settlement', label: '精算', icon: '💰' },
  { href: '/me', label: 'マイページ', icon: '👤' },
]

export function TabBar({ settlementDue }: { settlementDue: boolean }) {
  const path = usePathname()
  return (
    <nav className="tabbar" aria-label="メニュー">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={'tab' + (path.startsWith(t.href) ? ' on' : '')}
          onClick={() => {
            try {
              navigator.vibrate?.(10)
            } catch {}
          }}
        >
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          {t.label}
          {t.href === '/settlement' && settlementDue && <span className="dot" />}
        </Link>
      ))}
    </nav>
  )
}
