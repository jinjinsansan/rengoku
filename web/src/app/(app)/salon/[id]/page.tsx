import { notFound } from 'next/navigation'
import { isStaff, requireMember } from '@/lib/member'
import { createClient } from '@/lib/supabase/server'
import { fmtJst } from '@/lib/jst'
import { Card, KindBadge } from '@/components/card'
import { addComment, deletePost, setRsvp, togglePin, toggleReaction } from '../../actions'

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
    <div className="rg-stack">
      <Card tone={post.kind === 'maintenance' ? 'alert' : 'strong'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {post.pinned && <span className="win" style={{ fontSize: 11 }}>◆ 固定</span>}
          <KindBadge kind={post.kind} />
          <span className="sub num" style={{ marginLeft: 'auto', fontSize: 12 }}>{fmtJst(post.published_at)}</span>
        </div>
        <h1 className="mincho" style={{ fontSize: 20, margin: '12px 0 6px', letterSpacing: '.04em' }}>{post.title}</h1>
        <div className="sub" style={{ fontSize: 12, marginBottom: 14 }}>{nameOf(post.author_id)}</div>
        {post.kind === 'event' && post.event_at && (
          <div className="rg-notice" style={{ marginBottom: 14 }}>
            <span className="rg-notice-diamond" style={{ animation: 'none' }} />
            <span>日時 <b className="num win">{fmtJst(post.event_at)}</b></span>
            <span className="rg-notice-more">参加 {yes}{post.event_capacity ? ` / 定員 ${post.event_capacity}` : ''}</span>
          </div>
        )}
        {post.kind === 'maintenance' && post.starts_at && (
          <div className="num" style={{ color: '#FF9A5A', fontSize: 20, marginBottom: 14 }}>
            {fmtJst(post.starts_at)}{post.ends_at ? ` 〜 ${fmtJst(post.ends_at)}` : ''}
          </div>
        )}
        <div className="rg-body">{post.body}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {REACTIONS.map((e) => {
            const n = (reactions || []).filter((r) => r.emoji === e).length
            const on = (reactions || []).some((r) => r.emoji === e && r.user_id === userId)
            return (
              <form key={e} action={toggleReaction}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="emoji" value={e} />
                <button className={'rg-chip' + (on ? ' on' : '')} style={{ background: on ? undefined : 'transparent', cursor: 'pointer' }}>
                  {e} <span className="num">{n}</span>
                </button>
              </form>
            )
          })}
        </div>

        {post.kind === 'event' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
            {(['yes', 'maybe', 'no'] as const).map((s) => (
              <form key={s} action={setRsvp}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="status" value={s} />
                <button className={(mine === s ? 'rg-btn' : 'rg-btn-sub') + ' rg-btn-sm'}>{RSVP_JA[s]}</button>
              </form>
            ))}
          </div>
        )}

        {isStaff(member) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <form action={togglePin}><input type="hidden" name="post_id" value={post.id} /><button className="rg-btn-sub rg-btn-sm">{post.pinned ? '固定を外す' : '一番上に固定'}</button></form>
            <form action={deletePost}><input type="hidden" name="post_id" value={post.id} /><button className="rg-btn-sub rg-btn-sm">削除</button></form>
          </div>
        )}
      </Card>

      <Card en="COMMENT" ja="コメント" aside={`${(comments || []).length} 件`}>
        {(comments || []).map((c) => (
          <div key={c.id} className="rg-row" style={{ display: 'block' }}>
            <div className="faint" style={{ fontSize: 11 }}>{nameOf(c.user_id)} · <span className="num">{fmtJst(c.created_at)}</span></div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginTop: 2 }}>{c.body}</div>
          </div>
        ))}
        <form action={addComment} className="rg-stack" style={{ marginTop: 12 }}>
          <input type="hidden" name="post_id" value={post.id} />
          <textarea name="body" className="rg-input" placeholder="コメントを書く" maxLength={2000} required />
          <button className="rg-btn-sub rg-btn-sm">送信する</button>
        </form>
      </Card>
    </div>
  )
}
