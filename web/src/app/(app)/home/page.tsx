import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { dueCharges, receiverStatuses, referralSummary, todaySummary, weekPnl } from '@/lib/data'
import { addDays, jstDate } from '@/lib/jst'
import { signedUsd, usd } from '@/lib/money'
import { Card, KindBadge, Stat } from '@/components/card'
import { CountUp, Countdown } from '@/components/timers'
import { IconCheck } from '@/components/icons'

const WD = ['日', '月', '火', '水', '木', '金', '土']

function wd(dateStr: string): string {
  return WD[new Date(`${dateStr}T12:00:00+09:00`).getUTCDay()]
}

function hm(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
}

function minutesAgo(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
}

// ダッシュボード (説明書 4-2)。上から: お知らせの帯 → 今日の利益 → 受け子 → 精算 → サロン → 今週 → 紹介
export default async function Home() {
  const { userId, member } = await requireMember()
  const admin = createAdminClient()
  const [today, receivers, charges, week, ref, posts] = await Promise.all([
    todaySummary(userId),
    receiverStatuses(userId),
    dueCharges(userId),
    weekPnl(userId),
    referralSummary(userId),
    admin.from('rg_posts').select('id, kind, title, published_at').is('deleted_at', null).order('published_at', { ascending: false }).limit(3),
  ])
  const now = new Date().toISOString()
  const todayStr = jstDate()
  const closeAt = new Date(`${addDays(todayStr, 1)}T00:00:00+09:00`).toISOString()
  const winRate = today.wins + today.losses > 0 ? ((today.wins / (today.wins + today.losses)) * 100).toFixed(1) : '-'
  const seenAt = member.salon_seen_at ? new Date(member.salon_seen_at).getTime() : 0
  const unpaid = charges[0]
  const rcv = receivers[0]
  const online = rcv?.last_seen_at ? Date.now() - new Date(rcv.last_seen_at).getTime() < 150_000 : false // 受け子は 1 分ごとに報告・2.5 分来なければオフライン
  const weekSum = week.reduce((a, w) => a + (w.pnl || 0), 0)
  const maxAbs = Math.max(1, ...week.map((w) => Math.abs(w.pnl || 0)))

  return (
    <div className="rg-grid">
      {unpaid && (
        <Link href="/settlement" className="rg-notice full">
          <span className="rg-notice-diamond" />
          <span>{unpaid.settle_date.slice(5).replace('-', '/')} 分の精算のご案内があります</span>
          <span className="rg-notice-more">見る ›</span>
        </Link>
      )}

      <Card tone="hero" en="TODAY" ja="今日の利益" aside={`${todayStr.slice(5).replace('-', '/')}(${wd(todayStr)}) · 0:00 締め`} className="full">
        <CountUp value={today.pnl} />
        <div className="sub" style={{ fontSize: 12 }}>
          締めまで <span style={{ fontSize: 17, color: 'var(--rg-text)' }}><Countdown target={closeAt} serverNow={now} /></span>
        </div>
        <div className="rg-sep" />
        <div className="rg-stats">
          <Stat label="勝-負-引分">
            <span className="win">{today.wins}</span>-<span className="lose">{today.losses}</span>-<span className="draw">{today.ties}</span>
          </Stat>
          <Stat label="BET 回数">{today.bets}</Stat>
          <Stat label="勝率">{winRate}%</Stat>
        </div>
      </Card>

      <Card
        en="AGENT"
        ja={`受け子 ${rcv?.executor_id || ''}`}
        tone={rcv && !online ? 'alert' : ''}
        aside={<span className={'rg-online' + (online ? '' : ' off')}><i />{online ? 'オンライン' : 'オフライン'}</span>}
      >
        {!rcv && <p className="sub">PC のアプリを起動すると、ここに受け子の状態が出ます。</p>}
        {rcv && !online && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FF9A5A' }}>止まっています — 最後の通信 {minutesAgo(rcv.last_seen_at)} 分前</div>
            <div className="sub" style={{ fontSize: 12 }}>PC の電源とネットワークをご確認ください。</div>
          </div>
        )}
        {rcv && (
          <div className="rg-stats">
            <Stat label="卓"><span style={{ fontSize: 15 }}>{rcv.table_name || '-'}</span></Stat>
            <Stat label="残高">{rcv.balance != null ? usd(rcv.balance) : '-'}</Stat>
            <Stat label="最後の BET">{hm(rcv.last_bet_at)}</Stat>
          </div>
        )}
      </Card>

      {unpaid ? (
        <Card en="SETTLEMENT" ja="精算" tone="strong">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
            <div className="sub" style={{ fontSize: 12 }}>
              利益 <span className="num">{signedUsd(unpaid.daily_pnl)}</span> × {(Number(unpaid.rate) * 100).toFixed(0)}%
            </div>
            <div className="num win" style={{ fontSize: 38, lineHeight: 1 }}>{usd(unpaid.charge_amount)}</div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            {unpaid.due_at && new Date(unpaid.due_at).getTime() > Date.now() ? (
              <>お手数ですが、あと <Countdown target={unpaid.due_at} serverNow={now} /> 以内のご送金をお願いいたします。</>
            ) : (
              <>お手すきの時にご送金をお願いいたします。ご不明な点はサロンの運営までお気軽にどうぞ。</>
            )}
          </p>
          <Link href="/settlement" className="rg-btn">
            送金する<small>{Number(unpaid.charge_amount).toFixed(2)} USDT · 24 時間以内</small>
          </Link>
        </Card>
      ) : (
        <Card en="SETTLEMENT" ja="精算" tone="ok">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--rg-ok)' }}>
            <IconCheck />
            <div>
              <div style={{ color: 'var(--rg-text)', fontWeight: 700 }}>精算はすべて完了しています</div>
              <div className="sub" style={{ fontSize: 12 }}>いつもありがとうございます。</div>
            </div>
          </div>
        </Card>
      )}

      <Card en="SALON" ja="Rengoku サロン" aside={<Link href="/salon" className="win">すべて ›</Link>}>
        {(posts.data || []).length === 0 && <p className="sub">まだ投稿はありません</p>}
        {(posts.data || []).map((p) => (
          <Link key={p.id} href={`/salon/${p.id}`} className="rg-row" style={{ justifyContent: 'flex-start' }}>
            <KindBadge kind={p.kind} />
            <span className="rg-row-title" style={{ flex: 1 }}>{p.title}</span>
            {new Date(p.published_at).getTime() > seenAt && <span className="rg-unread" />}
          </Link>
        ))}
      </Card>

      <Card en="WEEK" ja="今週の推移" aside={<span className={'num ' + (weekSum >= 0 ? 'win' : 'lose')} style={{ fontSize: 14 }}>{signedUsd(weekSum)}</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'stretch' }}>
          {week.map((w) => {
            const v = w.pnl || 0
            const h = Math.round((Math.abs(v) / maxAbs) * 38)
            const isToday = w.date === todayStr
            return (
              <div key={w.date} style={{ textAlign: 'center' }}>
                <div className="num sub" style={{ fontSize: 10, height: 14 }}>{w.pnl == null ? '' : v.toFixed(0)}</div>
                <div style={{ position: 'relative', height: 90 }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 45, height: 1, background: 'rgba(255,200,61,.25)' }} />
                  {w.pnl != null && v !== 0 && (
                    <div
                      style={{
                        position: 'absolute', left: '32%', width: '36%', height: h, borderRadius: 2,
                        top: v > 0 ? 45 - h : 46,
                        background: v > 0 ? 'linear-gradient(180deg,#FFE9A8,#E0A93A)' : '#6F9FE6',
                      }}
                    />
                  )}
                </div>
                <div className="mincho" style={{ fontSize: 12, color: isToday ? 'var(--rg-gold-text)' : 'var(--rg-sub)' }}>{wd(w.date)}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card en="REFERRAL" ja="紹介">
        <div className="rg-stats two" style={{ marginBottom: 14 }}>
          <Stat label="紹介した人数">{ref.referred} 人</Stat>
          <Stat label="今月の紹介報酬">{usd(ref.month)}</Stat>
        </div>
        <Link href="/referral" className="rg-btn-sub">紹介コードを送る</Link>
      </Card>
    </div>
  )
}
