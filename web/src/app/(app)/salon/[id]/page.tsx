import { notFound } from 'next/navigation'
import { isStaff, requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { fmtJst } from '@/lib/jst'
import { addComment, deletePost, setRsvp, togglePin, toggleReaction } from '../../actions'

const KIND_JA: Record<string, string> = { report: '活動報告', event: '懇親会', maintenance: 'メンテナンス', general: 'お知らせ' }
const REACTIONS = ['🔥', '👏', '💪', '🙏']
const RSVP_JA: Record<string, string> = { yes: '参加する', maybe: '未定', no: '不参加' }

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId, member } = await requireMember()
  const supabase = await createClient()
  const { data: post } = await supabase.from('rg_posts').select('*').eq('id', id).maybeSingle()
  if (!post) notFound()
  const [{ data: comments }, { data: reactions }, { data: rsvps }] = await Promise.all([
    supabase.from('rg_comments').select('id, user_id, body, created_at').eq('post_id', id).order('created_at'),
    supabase.from('rg_reactions').select('user_id, emoji').eq('post_id', id),
    supabase.from('rg_event_rsvps').select('user_id, status').eq('post_id', id),
  ])
  const people = Array.from(new Set([post.author_id, ...(comments || []).map((c) => c.user_id)]))
  const { data: members } = await supabase.from('rg_members').select('user_id, display_name, staff_label').in('user_id', people)
  const nameOf = (uid: string) => {
    const m = (members || []).find((x) => x.user_id === uid)
    return (m?.display_name || '会員') + (m?.staff_label ? ` · ${m.staff_label}` : '')
  }
  const mine = (rsvps || []).find((r) => r.user_id === userId)?.status
  const yes = (rsvps || []).filter((r) => r.status === 'yes').length

  return (
    <div>
      <article className={'panel' + (post.kind === 'maintenance' ? ' hot' : '')}>
        <div className="row" style={{ borderBottom: 0, padding: 0 }}>
          <span>{post.pinned && '📌 '}<span className={'badge ' + post.kind}>{KIND_JA[post.kind]}</span></span>
          <span className="ash" style={{ fontSize: 11 }}>{fmtJst(post.published_at)}</span>
        </div>
        <h1 style={{ fontSize: 20, margin: '10px 0' }}>{post.title}</h1>
        <div className="ash" style={{ fontSize: 12, marginBottom: 10 }}>{nameOf(post.author_id)}</div>
        {post.kind === 'event' && post.event_at && (
          <div className="win" style={{ marginBottom: 10 }}>📅 {fmtJst(post.event_at)}{post.event_capacity ? ` · 参加 ${yes} / 定員 ${post.event_capacity}` : ` · 参加 ${yes}`}</div>
        )}
        {post.kind === 'maintenance' && post.starts_at && (
          <div style={{ color: 'var(--rg-flame)', fontSize: 18, marginBottom: 10 }}>🔧 {fmtJst(post.starts_at)}{post.ends_at ? ` 〜 ${fmtJst(post.ends_at)}` : ''}</div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontWeight: 500 }}>{post.body}</div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {REACTIONS.map((e) => {
            const n = (reactions || []).filter((r) => r.emoji === e).length
            const on = (reactions || []).some((r) => r.emoji === e && r.user_id === userId)
            return (
              <form key={e} action={toggleReaction}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="emoji" value={e} />
                <button className={'chip' + (on ? ' on' : '')} style={{ background: on ? undefined : 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }}>{e} {n}</button>
              </form>
            )
          })}
        </div>

        {post.kind === 'event' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {(['yes', 'maybe', 'no'] as const).map((s) => (
              <form key={s} action={setRsvp}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="status" value={s} />
                <button className={'btn sm ' + (mine === s ? 'gold' : 'char')}>{RSVP_JA[s]}</button>
              </form>
            ))}
          </div>
        )}

        {isStaff(member) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <form action={togglePin}><input type="hidden" name="post_id" value={post.id} /><button className="btn char sm">{post.pinned ? '固定を外す' : '一番上に固定'}</button></form>
            <form action={deletePost}><input type="hidden" name="post_id" value={post.id} /><button className="btn char sm">削除</button></form>
          </div>
        )}
      </article>

      <section className="panel">
        <h2>コメント ({(comments || []).length})</h2>
        {(comments || []).map((c) => (
          <div key={c.id} className="row" style={{ display: 'block' }}>
            <div className="ash" style={{ fontSize: 11 }}>{nameOf(c.user_id)} · {fmtJst(c.created_at)}</div>
            <div style={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>{c.body}</div>
          </div>
        ))}
        <form action={addComment} className="stack" style={{ marginTop: 10 }}>
          <input type="hidden" name="post_id" value={post.id} />
          <textarea name="body" className="input" placeholder="コメントを書く" maxLength={2000} required />
          <button className="btn sm">送信</button>
        </form>
      </section>
    </div>
  )
}
