'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconBell, IconCoin, IconHistory, IconHome, IconMenu, IconPerson, IconSalon } from './icons'

const TITLES: [string, string][] = [
  ['/home', 'ホーム'], ['/salon', 'サロン'], ['/bets', 'BET 履歴'], ['/settlement', '精算'],
  ['/me', 'マイページ'], ['/referral', '紹介'], ['/notifications', '通知'], ['/admin', '管理者画面'],
]

/** 上部 HUD: 左 = 紋章 + RENGOKU / 中央 = 画面名 / 右 = ベル (未読数) とメニュー (説明書 4-2)。 */
export function Hud({ unread }: { unread: number }) {
  const path = usePathname()
  const title = TITLES.find(([p]) => path.startsWith(p))?.[1] || ''
  return (
    <header className="rg-hud">
      <Link href="/home" className="rg-hud-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.svg" alt="" width={30} height={30} />
        RENGOKU
      </Link>
      <div className="rg-hud-title">{title}</div>
      <div className="rg-hud-actions">
        <Link href="/notifications" className="rg-round" aria-label="通知" style={{ color: 'var(--rg-gold-text)' }}>
          <IconBell />
          {unread > 0 && <span className="rg-round-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <Link href="/me" className="rg-round" aria-label="メニュー" style={{ color: 'var(--rg-gold-text)' }}>
          <IconMenu />
        </Link>
      </div>
    </header>
  )
}

const TABS = [
  { href: '/home', label: 'ホーム', Icon: IconHome },
  { href: '/salon', label: 'サロン', Icon: IconSalon },
  { href: '/bets', label: '履歴', Icon: IconHistory },
  { href: '/settlement', label: '精算', Icon: IconCoin },
  { href: '/me', label: 'マイページ', Icon: IconPerson },
]

/** 下部タブバー: 選ばれたタブは金色 + 光るひし形。未払いがある時は「精算」に炎色の点。 */
export function TabBar({ settlementDue }: { settlementDue: boolean }) {
  const path = usePathname()
  return (
    <nav className="rg-tabbar" aria-label="メニュー">
      <div className="rg-tabs">
        {TABS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={'rg-tab' + (path.startsWith(href) ? ' on' : '')}>
            <Icon />
            {label}
            {href === '/settlement' && settlementDue && <span className="rg-tab-dot" />}
          </Link>
        ))}
      </div>
    </nav>
  )
}
