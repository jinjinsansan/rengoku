import { requireMember } from '@/lib/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtDuration, fmtJst } from '@/lib/jst'
import { pnlClass, signedUsd, usd } from '@/lib/money'

const STATUS_JA: Record<string, string> = { due: 'お支払い待ち', paid: '支払い済み', none: 'チャージなし', waived: '免除' }

// 精算 (brief/02_screens.md の 6)。毎日 0:00 に前日の利益を締めてチャージが決まる・24 時間以内に送金。
// 期限を過ぎても自動で止めない。案内だけ (止めるのは運営が手で行う)。言葉づかいは丁寧に・責めない。
export default async function Settlement() {
  const { userId } = await requireMember()
  const admin = createAdminClient()
  const { data } = await admin.from('rg_daily_charges').select('*').eq('user_id', userId).order('settle_date', { ascending: false }).limit(60)
  const rows = data || []
  const due = rows.filter((c) => c.status === 'due').sort((a, b) => String(a.settle_date).localeCompare(String(b.settle_date)))
  const address = process.env.PAYMENT_USDT_TRC20_ADDRESS || ''

  return (
    <div>
      {due.length === 0 ? (
        <section className="panel">
          <h2>いまのお支払い</h2>
          <p>精算はすべて完了しています。いつもありがとうございます 🔥</p>
        </section>
      ) : (
        due.map((c) => {
          const left = c.due_at ? Math.round((new Date(c.due_at).getTime() - Date.now()) / 1000) : null
          return (
            <section key={c.id} className="panel hot">
              <h2>{c.settle_date} の精算</h2>
              <div className="row"><span>その日の利益</span><span className={'num ' + pnlClass(c.daily_pnl)}>{signedUsd(c.daily_pnl)}</span></div>
              <div className="row"><span>チャージの率</span><span className="num">{(Number(c.rate) * 100).toFixed(0)}%</span></div>
              <div className="row"><span>お支払い額</span><span className="num big win">{usd(c.charge_amount)}</span></div>
              {left !== null && left > 0 && (
                <p>あと <b className="num">{fmtDuration(left)}</b> 以内に送金をお願いします。</p>
              )}
              {left !== null && left <= 0 && (
                <p>お手すきの時に送金をお願いします。ご不明な点はサロンの運営までお気軽にどうぞ。</p>
              )}
              <div className="panel" style={{ marginTop: 10 }}>
                <h2>送金の手順 (USDT・TRC-20)</h2>
                <ol style={{ paddingLeft: 18, lineHeight: 1.8, fontWeight: 500, margin: 0 }}>
                  <li>送金先: <span className="num" style={{ wordBreak: 'break-all' }}>{address || '(運営から案内します)'}</span></li>
                  <li>送る金額: <b className="num">{Number(c.charge_amount).toFixed(2)} USDT</b> ちょうど</li>
                  <li>送金が確認できると、この画面が「支払い済み」に変わります</li>
                </ol>
              </div>
            </section>
          )
        })
      )}

      <section className="panel">
        <h2>これまでの精算</h2>
        {rows.length === 0 && <p className="ash">まだ精算はありません。毎日 0:00 に前日の分が締められます。</p>}
        {rows.map((c) => (
          <div key={c.id} className="row" style={{ fontSize: 13 }}>
            <span className="num">{c.settle_date}</span>
            <span className={'num ' + pnlClass(c.daily_pnl)}>{signedUsd(c.daily_pnl)}</span>
            <span className="num">{Number(c.charge_amount) > 0 ? usd(c.charge_amount) : '-'}</span>
            <span className={c.status === 'due' ? 'win' : 'ash'}>{STATUS_JA[c.status] || c.status}{c.paid_at ? ` ${fmtJst(c.paid_at)}` : ''}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
