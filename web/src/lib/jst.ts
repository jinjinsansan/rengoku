// 日本時間の日付まわり。締めは日本時間の 0:00。

export function jstDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

/** 日本時間のその日の 0:00 を UTC の ISO で返す。 */
export function jstMidnightUtc(dateStr: string = jstDate()): string {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString()
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 次の日本時間 0:00 までの残り秒。 */
export function secondsToNextCutoff(now: Date = new Date()): number {
  const next = new Date(`${addDays(jstDate(now), 1)}T00:00:00+09:00`)
  return Math.max(0, Math.round((next.getTime() - now.getTime()) / 1000))
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function fmtJst(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
