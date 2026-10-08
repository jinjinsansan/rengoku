import Link from 'next/link'
import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { dueCharges, receiverStatuses, referralSummary, todaySummary, weekPnl } from '@/lib/data'
import { fmtDuration, fmtJst, jstDate, secondsToNextCutoff } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'

const KIND_JA: Record<string, string> = { report: '活動報告', event: '懇親会', maintenance: 'メンテナンス', general: 'お知らせ' }

function online(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 150_000
}

// ダッシュボード (brief/02_screens.md の 2)。上から: 今日の利益 → 受け子 → 精算 → サロン → 今週 → 紹介
export default async function Home() {
  const { userId, member } = await requireMember()
  const admin = createAdminClient()
  const [today, receivers, charges, week, ref, posts] = await Promise.all([
    todaySummary(userId),
    receiverStatuses(userId),
    dueCharges(userId),
    weekPnl(userId),
    referralSummary(userId),
    admin.from('rg_posts').select('id, kind, title, published_at, pinned').is('deleted_at', null).order('published_at', { ascending: false }).limit(3),
  ])
  const winRate = today.wins + today.losses > 0 ? ((today.wins / (today.wins + today.losses)) * 100).toFixed(1) : '-'
  const seenAt = member.salon_seen_at ? new Date(member.salon_seen_at).getTime() : 0
  const maxAbs = Math.max(1, ...week.map((w) => Math.abs(w.pnl || 0)))

  return (
    <div>
      {charges.length > 0 && (
        <Link href="/settlement" className="panel hot" style={{ display: 'block' }}>
          🔔 {charges[0].settle_date} の精算 <b className="num">{usd(charges[0].charge_amount)}</b> のお支払いをお願いします
        </Link>
      )}

      <section className="panel">
        <h2>今日の利益 <span className="ash" style={{ fontSize: 11 }}>{jstDate()} · 0:00 に締め</span></h2>
        <div className={'num big ' + pnlClass(today.pnl)}>{signedUsd(today.pnl)}</div>
        <div className="ash num" style={{ marginTop: 8, fontSize: 14 }}>
          {today.wins}-{today.losses}-{today.ties} · {today.bets} 回 · 勝率 {winRate}% · ローリング {usd(today.rolling)}
        </div>
        <div className="ash" style={{ marginTop: 4, fontSize: 12 }}>締めまで <span className="num">{fmtDuration(secondsToNextCutoff())}</span></div>
      </section>

      <section className="panel">
        <h2>受け子 (あなたの PC)</h2>
        {receivers.length === 0 && <p className="ash">まだ受け子の報告がありません。PC のアプリを起動するとここに出ます。</p>}
        {receivers.map((r) => {
          const on = online(r.last_seen_at)
          return (
            <div key={r.executor_id} className="row">
              <span>
                <span style={{ color: on ? 'var(--rg-ok)' : 'var(--rg-ash)' }}>●</span> {r.executor_id}
                <span className="ash" style={{ fontSize: 12 }}> {r.table_name || ''}</span>
              </span>
              <span className="num">{r.balance != null ? usd(r.balance) : '-'}</span>
            </div>
          )
        })}
      </section>

      <section className="panel">
        <h2>精算</h2>
        {charges.length === 0 ? (
          <p>精算はすべて完了しています 🔥</p>
        ) : (
          <Link href="/settlement" className="btn">
            送金する<small>{charges.length} 件 · 合計 {usd(charges.reduce((a, c) => a + Number(c.charge_amount), 0))}</small>
          </Link>
        )}
      </section>

      <section className="panel">
        <h2>サロンの新着</h2>
        {(posts.data || []).length === 0 && <p className="ash">まだ投稿はありません</p>}
        {(posts.data || []).map((p) => (
          <Link key={p.id} href={`/salon/${p.id}`} className="row">
            <span>
              <span className={'badge ' + p.kind}>{KIND_JA[p.kind] || p.kind}</span> {p.title}
              {new Date(p.published_at).getTime() > seenAt && <span style={{ color: 'var(--rg-flame)' }}> ●</span>}
            </span>
            <span className="ash" style={{ fontSize: 11 }}>{fmtJst(p.published_at)}</span>
          </Link>
        ))}
      </section>

      <section className="panel">
        <h2>今週の推移</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'end', height: 90 }}>
          {week.map((w) => (
            <div key={w.date} style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: `${Math.round((Math.abs(w.pnl || 0) / maxAbs) * 64)}px`,
                  background: (w.pnl || 0) >= 0 ? 'var(--rg-gold)' : 'var(--rg-lose)',
                  borderRadius: 4,
                }}
              />
              <div className="ash num" style={{ fontSize: 10 }}>{w.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>紹介</h2>
        <div className="row"><span>紹介した人</span><span className="num">{ref.referred} 人</span></div>
        <div className="row"><span>今月の紹介報酬</span><span className="num">{usd(ref.month)}</span></div>
        <Link href="/referral" className="btn char sm" style={{ marginTop: 8 }}>紹介コードを送る</Link>
      </section>
    </div>
  )
}
