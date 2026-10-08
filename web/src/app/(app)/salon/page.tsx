import Link from 'next/link'
import { isStaff, requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { Card, KindBadge } from '@/components/card'
import { createPost } from '../actions'

const FILTERS = [
  { k: '', label: 'すべて' },
  { k: 'report', label: '活動報告' },
  { k: 'event', label: '懇親会' },
  { k: 'maintenance', label: 'メンテナンス' },
]
const NONE = ['00000000-0000-0000-0000-000000000000']

// Rengoku サロン。ピン留めが上・新しい順。書けるのは運営だけ。
export default async function Salon({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { userId, member } = await requireMember()
  const { kind = '' } = await searchParams
  const supabase = await createClient()
  let q = supabase
    .from('rg_posts')
    .select('id, kind, title, body, pinned, published_at, event_at, starts_at, author_id')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(100)
  if (kind) q = q.eq('kind', kind)
  const { data: posts } = await q
  const ids = (posts || []).map((p) => p.id)
  const authorIds = Array.from(new Set((posts || []).map((p) => p.author_id)))
  const [{ data: authors }, { data: comments }, { data: reactions }] = await Promise.all([
    supabase.from('rg_members').select('user_id, display_name, staff_label').in('user_id', authorIds.length ? authorIds : NONE),
    supabase.from('rg_comments').select('post_id').in('post_id', ids.length ? ids : NONE),
    supabase.from('rg_reactions').select('post_id').in('post_id', ids.length ? ids : NONE),
  ])
  const authorBy = new Map((authors || []).map((a) => [a.user_id, a]))
  const count = (rows: { post_id: string }[] | null, id: string) => (rows || []).filter((r) => r.post_id === id).length
  const seenAt = member.salon_seen_at ? new Date(member.salon_seen_at).getTime() : 0
  await createAdminClient().from('rg_members').update({ salon_seen_at: new Date().toISOString() }).eq('user_id', userId)

  return (
    <div className="rg-stack">
      <div className="rg-chips" style={{ marginBottom: 0 }}>
        {FILTERS.map((f) => (
          <Link key={f.k} href={f.k ? `/salon?kind=${f.k}` : '/salon'} className={'rg-chip' + (kind === f.k ? ' on' : '')}>{f.label}</Link>
        ))}
      </div>

      {isStaff(member) && (
        <details className="rg-card">
          <summary className="mincho" style={{ cursor: 'pointer', color: 'var(--rg-gold-text)', fontWeight: 700 }}>＋ 投稿する（運営）</summary>
          <form action={createPost} className="rg-stack" style={{ marginTop: 14 }}>
            <select name="kind" className="rg-input" defaultValue="report">
              <option value="report">活動報告</option>
              <option value="event">懇親会</option>
              <option value="maintenance">メンテナンス</option>
              <option value="general">お知らせ</option>
            </select>
            <input name="title" className="rg-input" placeholder="題名" maxLength={120} required />
            <textarea name="body" className="rg-input" style={{ minHeight: 140 }} placeholder="本文" />
            <label><span className="rg-label">懇親会の日時</span><input name="event_at" type="datetime-local" className="rg-input" /></label>
            <input name="event_capacity" type="number" min={1} className="rg-input" placeholder="懇親会の定員（任意）" />
            <label><span className="rg-label">メンテナンスの開始</span><input name="starts_at" type="datetime-local" className="rg-input" /></label>
            <label><span className="rg-label">メンテナンスの終了</span><input name="ends_at" type="datetime-local" className="rg-input" /></label>
            <label style={{ fontSize: 13 }}><input type="checkbox" name="pinned" /> 一番上に固定する</label>
            <button className="rg-btn">投稿する<small>会員全員に通知します</small></button>
          </form>
        </details>
      )}

      {(posts || []).length === 0 && <Card><p className="sub">まだ投稿はありません</p></Card>}
      {(posts || []).map((p) => {
        const a = authorBy.get(p.author_id)
        const isNew = new Date(p.published_at).getTime() > seenAt
        return (
          <Link key={p.id} href={`/salon/${p.id}`} className={'rg-card' + (p.kind === 'maintenance' ? ' alert' : '')} style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.pinned && <span className="win" style={{ fontSize: 11 }}>◆ 固定</span>}
              <KindBadge kind={p.kind} />
              {isNew && <span className="rg-unread" />}
              <span className="sub num" style={{ marginLeft: 'auto', fontSize: 12 }}>{fmtJst(p.published_at)}</span>
            </div>
            <div className="mincho" style={{ fontSize: 16, fontWeight: 700, margin: '10px 0 6px' }}>{p.title}</div>
            {p.kind === 'event' && p.event_at && <div className="win" style={{ fontSize: 12, marginBottom: 4 }}>日時 <span className="num">{fmtJst(p.event_at)}</span></div>}
            {p.kind === 'maintenance' && p.starts_at && <div style={{ color: '#FF9A5A', fontSize: 12, marginBottom: 4 }}>開始 <span className="num">{fmtJst(p.starts_at)}</span></div>}
            <div className="sub" style={{ fontSize: 13, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{p.body}</div>
            <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              {a?.display_name || '運営'}{a?.staff_label ? ` · ${a.staff_label}` : ''} · 🔥 {count(reactions, p.id)} · コメント {count(comments, p.id)}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
