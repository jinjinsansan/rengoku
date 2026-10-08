// カード共通: 英字ラベル + 日本語の見出し + 右端の補足 (説明書 4-2「カード共通」)
export function Card({
  en, ja, aside, tone = '', className = '', children,
}: {
  en?: string; ja?: string; aside?: React.ReactNode; tone?: '' | 'strong' | 'alert' | 'ok' | 'hero'; className?: string; children: React.ReactNode
}) {
  return (
    <section className={`rg-card ${tone} ${className}`}>
      {(en || ja || aside) && (
        <div className="rg-head">
          {en && <span className="rg-head-en">{en}</span>}
          {ja && <span className="rg-head-ja">{ja}</span>}
          {aside && <span className="rg-head-aside">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="rg-stat-label">{label}</div>
      <div className="rg-stat-value">{children}</div>
    </div>
  )
}

export const KIND_JA: Record<string, string> = { report: '活動報告', event: '懇親会', maintenance: 'メンテナンス', general: 'お知らせ' }

export function KindBadge({ kind }: { kind: string }) {
  return <span className={`rg-badge ${kind}`}>{KIND_JA[kind] || kind}</span>
}
