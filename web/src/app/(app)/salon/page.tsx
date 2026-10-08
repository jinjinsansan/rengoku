import Link from 'next/link'
import { isStaff, requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { createPost } from '../actions'

const KIND_JA: Record<string, string> = { report: '活動報告', event: '懇親会', maintenance: 'メンテナンス', general: 'お知らせ' }
const FILTERS = [
  { k: '', label: 'すべて' },
  { k: 'report', label: '活動報告' },
  { k: 'event', label: '懇親会' },
  { k: 'maintenance', label: 'メンテナンス' },
]

// Rengoku サロン (brief/02_screens.md の 3)。ピン留めが上・新しい順。書けるのは運営だけ。
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
    supabase.from('rg_members').select('user_id, display_name, staff_label').in('user_id', authorIds.length ? authorIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('rg_comments').select('post_id').in('post_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('rg_reactions').select('post_id').in('post_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
  ])
  const authorBy = new Map((authors || []).map((a) => [a.user_id, a]))
  const count = (rows: { post_id: string }[] | null, id: string) => (rows || []).filter((r) => r.post_id === id).length
  const seenAt = member.salon_seen_at ? new Date(member.salon_seen_at).getTime() : 0
  // 見た印 (次から新着の点が消える)
  await createAdminClient().from('rg_members').update({ salon_seen_at: new Date().toISOString() }).eq('user_id', userId)

  return (
    <div>
      <div className="chips">
        {FILTERS.map((f) => (
          <Link key={f.k} href={f.k ? `/salon?kind=${f.k}` : '/salon'} className={'chip' + (kind === f.k ? ' on' : '')}>{f.label}</Link>
        ))}
      </div>

      {isStaff(member) && (
        <details className="panel">
          <summary style={{ cursor: 'pointer', color: 'var(--rg-gold)' }}>＋ 投稿する (運営)</summary>
          <form action={createPost} className="stack" style={{ marginTop: 10 }}>
            <select name="kind" className="input" defaultValue="report">
              <option value="report">活動報告</option>
              <option value="event">懇親会</option>
              <option value="maintenance">メンテナンス</option>
              <option value="general">お知らせ</option>
            </select>
            <input name="title" className="input" placeholder="題名" maxLength={120} required />
            <textarea name="body" className="input textarea" placeholder="本文" />
            <label className="ash" style={{ fontSize: 12 }}>懇親会の日時 <input name="event_at" type="datetime-local" className="input" /></label>
            <input name="event_capacity" type="number" min={1} className="input" placeholder="懇親会の定員 (任意)" />
            <label className="ash" style={{ fontSize: 12 }}>メンテナンスの開始 <input name="starts_at" type="datetime-local" className="input" /></label>
            <label className="ash" style={{ fontSize: 12 }}>メンテナンスの終了 <input name="ends_at" type="datetime-local" className="input" /></label>
            <label><input type="checkbox" name="pinned" /> 一番上に固定する</label>
            <button className="btn">投稿する<small>会員全員に通知します</small></button>
          </form>
        </details>
      )}

      {(posts || []).length === 0 && <p className="ash">まだ投稿はありません</p>}
      {(posts || []).map((p) => {
        const a = authorBy.get(p.author_id)
        const isNew = new Date(p.published_at).getTime() > seenAt
        return (
          <Link key={p.id} href={`/salon/${p.id}`} className={'panel' + (p.kind === 'maintenance' ? ' hot' : '')} style={{ display: 'block' }}>
            <div className="row" style={{ borderBottom: 0, padding: 0 }}>
              <span>
                {p.pinned && '📌 '}<span className={'badge ' + p.kind}>{KIND_JA[p.kind]}</span>
                {isNew && <span style={{ color: 'var(--rg-flame)' }}> ● 新着</span>}
              </span>
              <span className="ash" style={{ fontSize: 11 }}>{fmtJst(p.published_at)}</span>
            </div>
            <div style={{ fontSize: 17, margin: '8px 0 4px' }}>{p.title}</div>
            {p.kind === 'event' && p.event_at && <div className="win" style={{ fontSize: 13 }}>📅 {fmtJst(p.event_at)}</div>}
            {p.kind === 'maintenance' && p.starts_at && <div style={{ color: 'var(--rg-flame)', fontSize: 13 }}>🔧 {fmtJst(p.starts_at)} から</div>}
            <div className="ash" style={{ fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{p.body}</div>
            <div className="ash" style={{ fontSize: 12, marginTop: 6 }}>
              {a?.display_name || '運営'}{a?.staff_label ? ` · ${a.staff_label}` : ''} · 🔥 {count(reactions, p.id)} · 💬 {count(comments, p.id)}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
