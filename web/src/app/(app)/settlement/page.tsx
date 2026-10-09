import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card } from '@/components/card'
import { Countdown } from '@/components/timers'
import { IconCheck } from '@/components/icons'
import { PayPanel } from './pay'

const STATUS_JA: Record<string, string> = { due: 'お支払い待ち', paid: '支払い済み', none: 'チャージなし', waived: '免除' }

// 精算: 毎日 0:00 に前日の利益を締め、24 時間以内に送金。期限を過ぎても案内だけ (止めるのは運営が手で)。
// 言葉づかいは丁寧に・責めない (説明書 6 章)。
export default async function Settlement() {
  const { userId } = await requireMember()
  const { data } = await createAdminClient()
    .from('rg_daily_charges')
    .select('*')
    .eq('user_id', userId)
    .order('settle_date', { ascending: false })
    .limit(60)
  const rows = data || []
  const due = rows.filter((c) => c.status === 'due').sort((a, b) => String(a.settle_date).localeCompare(String(b.settle_date)))
  const now = new Date().toISOString()

  return (
    <div className="rg-stack">
      {due.length === 0 && (
        <Card en="SETTLEMENT" ja="いまのお支払い" tone="ok">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--rg-ok)' }}>
            <IconCheck />
            <div>
              <div style={{ color: 'var(--rg-text)', fontWeight: 700 }}>精算はすべて完了しています</div>
              <div className="sub" style={{ fontSize: 12 }}>いつもありがとうございます。</div>
            </div>
          </div>
        </Card>
      )}

      {due.length > 0 && (() => {
        const total = Math.round(due.reduce((a, c) => a + Number(c.charge_amount), 0) * 100) / 100
        const oldest = due[0]
        const open = oldest.due_at && new Date(oldest.due_at).getTime() > Date.now()
        return (
          <Card en="SETTLEMENT" ja={due.length > 1 ? `未払い ${due.length} 件の精算` : `${oldest.settle_date.slice(5).replace('-', '/')} 分の精算`} tone="strong">
            {due.map((c) => (
              <div key={c.id} className="rg-row" style={{ fontSize: 12 }}>
                <span className="num" style={{ width: 52 }}>{c.settle_date.slice(5).replace('-', '/')}</span>
                <span className="sub">
                  利益 <span className={'num ' + pnlClass(c.daily_pnl)}>{signedUsd(c.daily_pnl)}</span>
                  {Number(c.carry_in) < 0 && <> − 繰越 <span className="num lose">{usd(-Number(c.carry_in))}</span></>}
                  {' '}× {(Number(c.rate) * 100).toFixed(0)}%
                </span>
                <span className="num win" style={{ fontSize: 15 }}>{usd(c.charge_amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
              <div className="sub" style={{ fontSize: 12 }}>お支払いの合計</div>
              <div className="num win" style={{ fontSize: 38, lineHeight: 1 }}>{usd(total)}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8 }}>
              {open ? (
                <>お手数ですが、あと <Countdown target={oldest.due_at} serverNow={now} /> 以内のご送金をお願いいたします。</>
              ) : (
                <>お手すきの時にご送金をお願いいたします。ご不明な点はサロンの運営までお気軽にどうぞ。</>
              )}
            </p>
            <PayPanel count={due.length} total={total} />
            <p className="faint" style={{ fontSize: 11, lineHeight: 1.7, marginTop: 8 }}>
              「送金する」を押すと、お支払い用の金額 (USDT・TRC-20) と送金先が出ます。その金額ちょうどで送ると、数分で自動で「支払い済み」になります。
            </p>
          </Card>
        )
      })()}

      <Card en="HISTORY" ja="これまでの精算">
        {rows.length === 0 && <p className="sub">まだ精算はありません。毎日 0:00 に前日の分が締められます。</p>}
        {rows.map((c) => (
          <div key={c.id} className="rg-row" style={{ fontSize: 12 }}>
            <span className="num" style={{ width: 82 }}>{c.settle_date}</span>
            <span className={'num ' + pnlClass(c.daily_pnl)} style={{ fontSize: 15 }}>
              {signedUsd(c.daily_pnl)}
              {Number(c.carry_out) < 0 && <span className="faint" style={{ fontSize: 10, display: 'block' }}>翌日へ繰越 {signedUsd(c.carry_out)}</span>}
            </span>
            <span className="num" style={{ fontSize: 15 }}>{Number(c.charge_amount) > 0 ? usd(c.charge_amount) : '本日のチャージはありません'}</span>
            <span className={c.status === 'due' ? 'win' : 'sub'}>{STATUS_JA[c.status] || c.status}{c.paid_at ? ` ${fmtJst(c.paid_at)}` : ''}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
