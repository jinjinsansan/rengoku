'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconBell, IconCoin, IconHistory, IconHome, IconMenu, IconPerson, IconSalon } from './icons'

const TITLES: [string, string][] = [
  ['/assets', '資産'], ['/me/wallet', '財布の通貨'],
  ['/home', 'ホーム'], ['/salon', 'サロン'], ['/bets', 'BET 履歴'], ['/settlement', '精算'],
  ['/me', 'マイページ'], ['/referral', '紹介'], ['/notifications', '通知'], ['/admin', '管理者画面'],
]

// 戻るボタンで開く画面 (タブバーは出さない・README_WALLET.md W2)。戻る先。
const BACK: [string, string][] = [['/assets', '/home'], ['/me/wallet', '/me']]
export function backOf(path: string): string | null {
  return BACK.find(([p]) => path.startsWith(p))?.[1] || null
}

/** 上部 HUD: 左 = 紋章 + RENGOKU (戻る画面では ‹) / 中央 = 画面名 / 右 = ベル (未読数) とメニュー (説明書 4-2)。 */
export function Hud({ unread }: { unread: number }) {
  const path = usePathname()
  const title = TITLES.find(([p]) => path.startsWith(p))?.[1] || ''
  const back = backOf(path)
  return (
    <header className="rg-hud">
      {back ? (
        <div style={{ flex: 1, display: 'flex' }}>
          <Link href={back} className="rg-hud-back" aria-label="戻る">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2C463" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
        </div>
      ) : (
        <Link href="/home" className="rg-hud-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.svg" alt="" width={30} height={30} />
          RENGOKU
        </Link>
      )}
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
  if (backOf(path)) return null
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
