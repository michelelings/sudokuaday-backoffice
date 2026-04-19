/** Europe/Amsterdam; matches e.g. `18-4-2026, 15:16:12` (no leading zeros on day/month). */
export function formatSnapshotInstantAmsterdam(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const v = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${v('day')}-${v('month')}-${v('year')}, ${v('hour')}:${v('minute')}:${v('second')}`
}

export function formatNextIngestInstantAmsterdam(date: Date): string {
  return formatSnapshotInstantAmsterdam(date.toISOString())
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
