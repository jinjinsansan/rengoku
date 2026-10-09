import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Member = {
  user_id: string
  role: 'member' | 'staff' | 'owner'
  staff_label: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  title: string | null
  joined_at: string
  salon_seen_at: string | null
  settings: Record<string, unknown>
  can_master: boolean
}

/**
 * 会員だけが入れる画面の入口。
 * - ログインしていなければ /login へ
 * - Rengoku で登録した人 (user_metadata.team = 'rengoku') は、初回に rg_members の行を作る
 * - それ以外 (bafather.uk だけの会員) は、運営が rg_members に登録するまで入れない
 */
export const requireMember = cache(loadMember)

// ★cache: 1 回の画面の表示の中で、layout と page が何度呼んでも問い合わせは 1 度だけ。
async function loadMember(): Promise<{ userId: string; email: string; member: Member }> {
  const supabase = await createClient()
  // ★getClaims = 署名を手元で確かめる (ES256)。中身に sub・email・user_metadata が入っている。
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { sub?: string; email?: string; user_metadata?: Record<string, unknown> } | undefined
  if (!claims?.sub) redirect('/login')
  const user = { id: claims.sub, email: claims.email || '', user_metadata: claims.user_metadata || {} }

  const admin = createAdminClient()
  let { data: member } = await admin.from('rg_members').select('*').eq('user_id', user.id).maybeSingle()
  if (!member && user.user_metadata?.team === 'rengoku') {
    const display = String(user.user_metadata?.display_name || '').slice(0, 24) || null
    await admin.from('rg_members').insert({ user_id: user.id, role: 'member', display_name: display })
    // ★bafather.uk 側の課金は「無料・0%」にしておく。初期値 (有料・30%) のままだと、bafather.uk の 0:05 の締めが
    //   残高から引き、足りないと停止 (= 受け子が止まる) してしまう。Rengoku のチャージは rg_daily_charges で別に行う。
    //   ほかの列 (bot_paid・suspended など) は触らない。
    await admin
      .from('billing')
      .upsert({ user_id: user.id, is_free: true, profit_share_rate: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    ;({ data: member } = await admin.from('rg_members').select('*').eq('user_id', user.id).maybeSingle())
  }
  if (!member) redirect('/login?e=not_member')
  return { userId: user.id, email: user.email || '', member: member as Member }
}

export function isStaff(m: Pick<Member, 'role'>): boolean {
  return m.role === 'staff' || m.role === 'owner'
}

/** 管理者画面に入れる人 (運営)。それ以外はダッシュボードへ戻す。 */
export async function requireStaff() {
  const ctx = await requireMember()
  if (!isStaff(ctx.member)) redirect('/home')
  return ctx
}

/** マスター画面の入口 (田辺版のマスター)。ボタンは rg_members.can_master の人だけに出す。 */
export function masterUrl(): string {
  return (process.env.MASTER_URL || 'https://master.rengoku.net/master2').trim()
}

/** 緊急の予備: 前のデザインのマスター画面 (動きは同じ)。新しい画面に何かあった時に使う。 */
export function masterBackupUrl(): string {
  return (process.env.MASTER_BACKUP_URL || 'https://master.rengoku.net/master').trim()
}
