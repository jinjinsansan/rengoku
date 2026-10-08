import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'
import { Card } from '@/components/card'
import { Countdown } from '@/components/timers'
import { IconCheck } from '@/components/icons'
import { CopyButton } from './copy'

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
  const address = process.env.PAYMENT_USDT_TRC20_ADDRESS || ''
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

      {due.map((c) => {
        const open = c.due_at && new Date(c.due_at).getTime() > Date.now()
        return (
          <Card key={c.id} en="SETTLEMENT" ja={`${c.settle_date.slice(5).replace('-', '/')} 分の精算`} tone="strong">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
              <div className="sub" style={{ fontSize: 12 }}>
                利益 <span className={'num ' + pnlClass(c.daily_pnl)}>{signedUsd(c.daily_pnl)}</span> × {(Number(c.rate) * 100).toFixed(0)}%
              </div>
              <div className="num win" style={{ fontSize: 38, lineHeight: 1 }}>{usd(c.charge_amount)}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8 }}>
              {open ? (
                <>お手数ですが、あと <Countdown target={c.due_at} serverNow={now} /> 以内のご送金をお願いいたします。</>
              ) : (
                <>お手すきの時にご送金をお願いいたします。ご不明な点はサロンの運営までお気軽にどうぞ。</>
              )}
            </p>
            <div className="rg-sep" />
            <div className="rg-head" style={{ marginBottom: 8 }}>
              <span className="rg-head-en">HOW TO PAY</span>
              <span className="rg-head-ja">送金の手順（USDT・TRC-20）</span>
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9, fontSize: 13 }}>
              <li>
                送金先
                <div className="num" style={{ wordBreak: 'break-all', fontSize: 15, color: 'var(--rg-gold-text)' }}>{address || '運営からご案内します'}</div>
                {address && <CopyButton text={address} label="送金先をコピー" />}
              </li>
              <li>
                送る金額は <b className="num win" style={{ fontSize: 17 }}>{Number(c.charge_amount).toFixed(2)} USDT</b> ちょうどでお願いいたします
                <div className="faint" style={{ fontSize: 11 }}>画面に出た金額ちょうどで、どなたからのご送金かを確かめています。</div>
              </li>
              <li>確認が取れると、この画面が「支払い済み」に変わります</li>
            </ol>
          </Card>
        )
      })}

      <Card en="HISTORY" ja="これまでの精算">
        {rows.length === 0 && <p className="sub">まだ精算はありません。毎日 0:00 に前日の分が締められます。</p>}
        {rows.map((c) => (
          <div key={c.id} className="rg-row" style={{ fontSize: 12 }}>
            <span className="num" style={{ width: 82 }}>{c.settle_date}</span>
            <span className={'num ' + pnlClass(c.daily_pnl)} style={{ fontSize: 15 }}>{signedUsd(c.daily_pnl)}</span>
            <span className="num" style={{ fontSize: 15 }}>{Number(c.charge_amount) > 0 ? usd(c.charge_amount) : '本日のチャージはありません'}</span>
            <span className={c.status === 'due' ? 'win' : 'sub'}>{STATUS_JA[c.status] || c.status}{c.paid_at ? ` ${fmtJst(c.paid_at)}` : ''}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
