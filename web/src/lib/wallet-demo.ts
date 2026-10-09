// 資産の画面の見本 (運営だけ・/assets?demo=btc など)。README_WALLET.md の見本の数字そのまま。データベースは読まない。
import type { WalletView, WPeriod } from '@/lib/wallet-view'

export const DEMO_SCENARIOS = ['btc', 'usdt', 'new', 'doge', 'mismatch'] as const

function period(o: Partial<WPeriod> & Pick<WPeriod, 'id' | 'index' | 'currency' | 'kind'>): WPeriod {
  return {
    executorId: 'demo', startedAt: '', endedAt: null, days: 1, startCoins: 0, startPrice: null, principalCoins: 0, principalUsd: null,
    tradeUsd: 0, tradeCoins: 0, coins: 0, price: null, value: null, capital: null, endReason: '', bets: 1, series: [], marks: [], principalLine: 0,
    ...o,
  }
}

const P1 = period({
  id: 1, index: 1, currency: 'BTC', kind: 'priced', startedAt: '2026-09-30T15:00:00Z', endedAt: '2026-10-05T15:00:00Z', days: 5,
  startCoins: 0.02, startPrice: 60000, principalCoins: 0.02, principalUsd: 1200, tradeUsd: 90, tradeCoins: 0.0015, coins: 0.0215, price: 63000, value: 1354.5, capital: 64.5,
  endReason: '10/6 BTC を出金 · ETH に変更',
})
const P2 = period({
  id: 2, index: 2, currency: 'ETH', kind: 'priced', startedAt: '2026-10-05T15:00:00Z', endedAt: '2026-10-09T15:00:00Z', days: 4,
  startCoins: 0.5, startPrice: 2400, principalCoins: 0.5, principalUsd: 1200, tradeUsd: 43, tradeCoins: 0.018, coins: 0.518, price: 2350, value: 1217.3, capital: -25.7,
  endReason: '10/10 USDT に変更',
})
const P3 = period({
  id: 3, index: 3, currency: 'USDT', kind: 'pegged', startedAt: '2026-10-09T15:00:00Z', days: 4,
  startCoins: 1250, startPrice: 1, principalCoins: 1250, principalUsd: 1250, tradeUsd: 38, tradeCoins: 38, coins: 1288, price: 1, value: 1288, capital: null,
  series: [{ d: '10/10', v: 1250 }, { d: '10/11', v: 1262.4 }, { d: '10/12', v: 1258.1 }, { d: '10/13', v: 1288 }],
  marks: [{ i: 0, kind: 'change', text: 'USDT に変更' }], principalLine: 1250,
})
const BTC_NOW: WPeriod = {
  ...P1, endedAt: null, endReason: '', price: 63000,
  series: [{ d: '10/1', v: 0.02 }, { d: '10/2', v: 0.02046 }, { d: '10/3', v: 0.02079 }, { d: '10/4', v: 0.02068 }, { d: '10/5', v: 0.0215 }],
  marks: [{ i: 0, kind: 'start', text: '開始' }], principalLine: 0.02,
}
const notes = { prices: { BTC: 63000, ETH: 2410, at: '2026-10-05T09:45:00Z' } }

export function demoWallet(s: string): WalletView {
  const base = { detected: { currency: 'BTC', executorId: 'PC-01', at: '2026-10-01T00:12:00Z' }, declared: null, banners: [] as WalletView['banners'], isNew: false, ...notes }
  if (s === 'usdt') {
    return {
      ...base, current: P3, history: [P2, P1], prices: { BTC: 63800, ETH: 2372, at: '2026-10-13T09:45:00Z' },
      total: { tradeUsd: 171, marketUsd: 38.8, days: 13, periods: 3 },
      detected: { currency: 'USDT', executorId: 'PC-01', at: '2026-10-10T00:12:00Z' },
      banners: [{ text: '財布の通貨が USDT に変わったので、新しい期間を始めました。元本 $1,250.00', link: '違う場合 ›', href: '/me/wallet', tone: 'gold' }],
    }
  }
  if (s === 'new') {
    const cur = period({ id: 9, index: 1, currency: 'BTC', kind: 'priced', startedAt: '2026-10-09T15:00:00Z', startCoins: 0.02, startPrice: 63000, principalCoins: 0.02, principalUsd: 1260, coins: 0.02, price: 63000, value: 1260, capital: 0, bets: 0 })
    return { ...base, current: cur, history: [], total: { tradeUsd: 0, marketUsd: 0, days: 1, periods: 1 }, isNew: true }
  }
  if (s === 'doge') {
    const cur = period({
      id: 8, index: 1, currency: 'DOGE', kind: 'unsupported', startedAt: '2026-10-07T15:00:00Z', days: 3, startCoins: 5240, principalCoins: 5240, coins: 5420, tradeCoins: 180,
      series: [{ d: '10/8', v: 5240 }, { d: '10/9', v: 5296 }, { d: '10/10', v: 5420 }], marks: [{ i: 0, kind: 'start', text: '開始' }], principalLine: 5240,
    })
    return {
      ...base, current: cur, history: [], total: { tradeUsd: 0, marketUsd: 0, days: 3, periods: 1 }, detected: { currency: 'DOGE', executorId: 'PC-01', at: '2026-10-08T00:12:00Z' },
      banners: [{ text: 'DOGE は枚数だけ表示しています。ドルの換算と値上がり益は USDT・USDC・BTC・ETH だけです。', link: '', href: '', tone: 'grey' }],
    }
  }
  const btc = { ...base, current: BTC_NOW, history: [], total: { tradeUsd: 90, marketUsd: 64.5, days: 5, periods: 1 } }
  if (s === 'mismatch') {
    return {
      ...btc, detected: { currency: 'ETH', executorId: 'PC-01', at: '2026-10-05T00:12:00Z' }, declared: 'BTC',
      banners: [{ text: '自動の判定では ETH ですが、ご申告は BTC です。表示はご申告の BTC に合わせています。', link: '確かめる ›', href: '/me/wallet', tone: 'warn' }],
    }
  }
  return btc
}
