'use server'

// 管理者画面の操作。運営 (staff / owner) だけ。率・役割・マスター画面の権限はオーナーだけ。
// 書き込みはサーバー (service role) で行うので、入口で必ず役割を確かめる。
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCharges } from '@/lib/charges'

function str(v: FormDataEntryValue | null, max: number): string {
  return String(v ?? '').trim().slice(0, max)
}

async function requireOwner() {
  const ctx = await requireStaff()
  if (ctx.member.role !== 'owner') throw new Error('owner only')
  return ctx
}

/** チャージを「支払い済み」にする。紹介報酬があれば確定にし、会員にお礼の通知を出す。 */
export async function markPaid(form: FormData) {
  const { userId } = await requireStaff()
  const id = str(form.get('charge_id'), 64)
  const ref = str(form.get('payment_ref'), 120)
  const admin = createAdminClient()
  const { data: c } = await admin.from('rg_daily_charges').select('*').eq('id', id).single()
  if (!c || c.status === 'paid') return
  await admin
    .from('rg_daily_charges')
    .update({ status: 'paid', paid_at: new Date().toISOString(), payment_ref: ref || null, note: `confirmed by ${userId}` })
    .eq('id', id)
  await admin.from('rg_referral_rewards').update({ status: 'confirmed' }).eq('charge_id', id).eq('status', 'pending')
  await admin.from('rg_notifications').insert({
    user_id: c.user_id, kind: 'charge_paid', ref_id: id,
    title: `${c.settle_date} の精算を受け取りました`, body: 'ご送金ありがとうございました。',
  })
  revalidatePath('/admin/charges')
  revalidatePath('/admin')
}

/** チャージを免除する (運営の判断)。紹介報酬は取り消す。 */
export async function waive(form: FormData) {
  await requireStaff()
  const id = str(form.get('charge_id'), 64)
  const admin = createAdminClient()
  await admin.from('rg_daily_charges').update({ status: 'waived', note: str(form.get('note'), 200) || null }).eq('id', id)
  await admin.from('rg_referral_rewards').update({ status: 'cancelled' }).eq('charge_id', id).neq('status', 'paid')
  revalidatePath('/admin/charges')
  revalidatePath('/admin')
}

/** 間違えて「支払い済み」「免除」にした時に、お支払い待ちへ戻す。 */
export async function reopen(form: FormData) {
  await requireStaff()
  const id = str(form.get('charge_id'), 64)
  const admin = createAdminClient()
  await admin.from('rg_daily_charges').update({ status: 'due', paid_at: null, payment_ref: null }).eq('id', id)
  await admin.from('rg_referral_rewards').update({ status: 'pending' }).eq('charge_id', id).in('status', ['confirmed', 'cancelled'])
  revalidatePath('/admin/charges')
  revalidatePath('/admin')
}

/** 指定した日の締めを手動で実行する (cron が失敗した時など)。二重にはならない。 */
export async function runSettle(form: FormData) {
  await requireOwner()
  const date = str(form.get('date'), 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  await runCharges(date)
  revalidatePath('/admin/charges')
  revalidatePath('/admin')
}

/** 会員の肩書き・称号 (運営)。役割とマスター画面の権限はオーナーだけが変えられる。 */
export async function updateMember(form: FormData) {
  const { member } = await requireStaff()
  const uid = str(form.get('user_id'), 64)
  const patch: Record<string, unknown> = {
    staff_label: str(form.get('staff_label'), 24) || null,
    title: str(form.get('title'), 24) || null,
    updated_at: new Date().toISOString(),
  }
  if (member.role === 'owner') {
    const role = str(form.get('role'), 10)
    if (['member', 'staff', 'owner'].includes(role)) patch.role = role
    patch.can_master = form.get('can_master') === 'on'
  }
  await createAdminClient().from('rg_members').update(patch).eq('user_id', uid)
  revalidatePath('/admin/members')
}

/** bafather.uk の会員を Rengoku の会員にする (メールアドレスで探す)。bafather.uk 側の課金は無料・0% にする。 */
export async function addMember(form: FormData) {
  await requireOwner()
  const email = str(form.get('email'), 200).toLowerCase()
  if (!email) return
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (!p) throw new Error('そのメールアドレスの会員が bafather.uk にいません')
  await admin.from('rg_members').upsert({ user_id: p.id, role: 'member' }, { onConflict: 'user_id', ignoreDuplicates: true })
  await admin
    .from('billing')
    .upsert({ user_id: p.id, is_free: true, profit_share_rate: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  revalidatePath('/admin/members')
}

/** 率などの設定 (オーナーだけ)。 */
export async function saveSettings(form: FormData) {
  await requireOwner()
  const admin = createAdminClient()
  const pct = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, Number(v) || 0)) / 100
  const hours = Math.min(168, Math.max(1, Math.round(Number(form.get('charge_due_hours')) || 24)))
  const mode = String(form.get('referral_mode')) === 'charge_pct' ? 'charge_pct' : 'off'
  const now = new Date().toISOString()
  await admin.from('rg_settings').upsert([
    { key: 'charge_rate', value: pct(form.get('charge_rate')), updated_at: now },
    { key: 'charge_due_hours', value: hours, updated_at: now },
    { key: 'referral', value: { mode, rate: pct(form.get('referral_rate')) }, updated_at: now },
  ])
  revalidatePath('/admin/settings')
}
