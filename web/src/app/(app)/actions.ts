'use server'

// 会員の操作 (サーバーで実行)。書き込みは RLS の効く本人のクライアントで行う。
// 運営だけの操作 (投稿) は RLS の rg_is_staff() でも守られている。
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStaff, requireMember } from '@/lib/member'

const KINDS = ['report', 'event', 'maintenance', 'general'] as const
const KIND_JA: Record<string, string> = { report: '活動報告', event: '懇親会', maintenance: 'メンテナンス', general: 'お知らせ' }

function str(v: FormDataEntryValue | null, max: number): string {
  return String(v ?? '').trim().slice(0, max)
}

function dt(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const d = new Date(`${s}:00+09:00`) // <input type="datetime-local"> は日本時間で入れる
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function createPost(form: FormData) {
  const { userId, member } = await requireMember()
  if (!isStaff(member)) throw new Error('forbidden')
  const kind = KINDS.includes(String(form.get('kind')) as (typeof KINDS)[number]) ? String(form.get('kind')) : 'report'
  const title = str(form.get('title'), 120)
  const body = str(form.get('body'), 10000)
  if (!title) throw new Error('title required')
  const supabase = await createClient()
  const { data: salon } = await supabase.from('rg_salons').select('id').eq('slug', 'rengoku').single()
  const { data: post, error } = await supabase
    .from('rg_posts')
    .insert({
      salon_id: salon!.id,
      author_id: userId,
      kind,
      title,
      body,
      pinned: form.get('pinned') === 'on',
      event_at: dt(form.get('event_at')),
      event_capacity: Number(form.get('event_capacity')) || null,
      starts_at: dt(form.get('starts_at')),
      ends_at: dt(form.get('ends_at')),
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  // 会員全員にサイト内の通知 (メールは送らない)
  const admin = createAdminClient()
  const { data: members } = await admin.from('rg_members').select('user_id')
  const rows = (members || [])
    .filter((m) => m.user_id !== userId)
    .map((m) => ({ user_id: m.user_id, kind: kind === 'general' ? 'post' : kind, ref_id: post.id, title: `【${KIND_JA[kind]}】${title}` }))
  if (rows.length) await admin.from('rg_notifications').insert(rows)
  revalidatePath('/salon')
  redirect(`/salon/${post.id}`)
}

export async function deletePost(form: FormData) {
  const { member } = await requireMember()
  if (!isStaff(member)) throw new Error('forbidden')
  const id = str(form.get('post_id'), 64)
  const supabase = await createClient()
  await supabase.from('rg_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/salon')
  redirect('/salon')
}

export async function togglePin(form: FormData) {
  const { member } = await requireMember()
  if (!isStaff(member)) throw new Error('forbidden')
  const id = str(form.get('post_id'), 64)
  const supabase = await createClient()
  const { data } = await supabase.from('rg_posts').select('pinned').eq('id', id).single()
  await supabase.from('rg_posts').update({ pinned: !data?.pinned, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/salon/${id}`)
  revalidatePath('/salon')
}

export async function addComment(form: FormData) {
  const { userId } = await requireMember()
  const postId = str(form.get('post_id'), 64)
  const body = str(form.get('body'), 2000)
  if (!body) return
  const supabase = await createClient()
  await supabase.from('rg_comments').insert({ post_id: postId, user_id: userId, body })
  revalidatePath(`/salon/${postId}`)
}

export async function toggleReaction(form: FormData) {
  const { userId } = await requireMember()
  const postId = str(form.get('post_id'), 64)
  const emoji = str(form.get('emoji'), 8) || '🔥'
  const supabase = await createClient()
  const { data } = await supabase.from('rg_reactions').select('emoji').eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji).maybeSingle()
  if (data) await supabase.from('rg_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
  else await supabase.from('rg_reactions').insert({ post_id: postId, user_id: userId, emoji })
  revalidatePath(`/salon/${postId}`)
}

export async function setRsvp(form: FormData) {
  const { userId } = await requireMember()
  const postId = str(form.get('post_id'), 64)
  const status = ['yes', 'maybe', 'no'].includes(String(form.get('status'))) ? String(form.get('status')) : 'maybe'
  const supabase = await createClient()
  await supabase.from('rg_event_rsvps').upsert({ post_id: postId, user_id: userId, status, updated_at: new Date().toISOString() })
  revalidatePath(`/salon/${postId}`)
}

export async function updateProfile(form: FormData) {
  const { userId } = await requireMember()
  const supabase = await createClient()
  await supabase
    .from('rg_members')
    .update({ display_name: str(form.get('display_name'), 24) || null, bio: str(form.get('bio'), 300) || null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  revalidatePath('/me')
}

export async function markAllRead() {
  const { userId } = await requireMember()
  const supabase = await createClient()
  await supabase.from('rg_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  revalidatePath('/notifications')
}

export async function markSalonSeen() {
  const { userId } = await requireMember()
  const supabase = await createClient()
  await supabase.from('rg_members').update({ salon_seen_at: new Date().toISOString() }).eq('user_id', userId)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

const WALLET_CURRENCIES = ['USDT', 'USDC', 'BTC', 'ETH'] as const

/**
 * 財布の通貨を手で直す (2026-10-10・README_WALLET.md W5)。'AUTO' = 自動の判定に戻す。
 * 次の記録 (10 分ごと) で、直した通貨の新しい期間が始まる。運営にも知らせる。
 */
export async function setWalletCurrency(cur: string): Promise<{ ok: boolean; error?: string }> {
  const { userId, member } = await requireMember()
  const c = String(cur || '').toUpperCase()
  const override = c === 'AUTO' ? null : (WALLET_CURRENCIES as readonly string[]).includes(c) ? c : undefined
  if (override === undefined) return { ok: false, error: '選べない通貨です' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('rg_members')
    .update({ wallet_currency_override: override, wallet_override_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) return { ok: false, error: error.message }
  const { data: staff } = await admin.from('rg_members').select('user_id').in('role', ['staff', 'owner'])
  const name = member.display_name || '会員'
  const rows = (staff || [])
    .filter((s) => s.user_id !== userId)
    .map((s) => ({
      user_id: s.user_id,
      kind: 'wallet_override',
      ref_id: null,
      title: override ? `${name} さんが財布の通貨を ${override} に直しました` : `${name} さんが財布の通貨を自動の判定に戻しました`,
      body: '資産の画面の新しい期間は、次の記録 (10 分ごと) で始まります。',
    }))
  if (rows.length) await admin.from('rg_notifications').insert(rows)
  revalidatePath('/me/wallet')
  revalidatePath('/assets')
  return { ok: true }
}
