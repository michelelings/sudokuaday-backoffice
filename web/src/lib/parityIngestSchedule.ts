/**
 * UTC hours when `.github/workflows/ingest-parity.yml` runs (minute 0).
 * Keep in sync with that workflow’s cron.
 */
export const PARITY_INGEST_HOURS_UTC = [7, 11, 15, 19] as const

/** Next cron slot strictly after `from` (GitHub Actions; deploy may trail by a few minutes). */
export function getNextParityIngestUtc(from: Date = new Date()): Date {
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth()
  const d = from.getUTCDate()
  const t = from.getTime()
  for (const hour of PARITY_INGEST_HOURS_UTC) {
    const candidate = new Date(Date.UTC(y, m, d, hour, 0, 0, 0))
    if (candidate.getTime() > t) return candidate
  }
  return new Date(Date.UTC(y, m, d + 1, PARITY_INGEST_HOURS_UTC[0], 0, 0, 0))
}
