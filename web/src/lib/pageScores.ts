import type { ParitySnapshot } from '../types/parity'
import { missingMirrorKey } from './coverageMatrix'

export type LocaleCellScore = {
  /** null when mirror file is missing */
  score: number | null
  missing: boolean
  /** Count of metadata fields that differ in this snapshot (max 3: title, description, h1) */
  metadataMismatchCount: number
  stale: boolean
}

const PTS_PER_META = 20
const PTS_STALE = 25

/** Derive 0–100 from parity signals (transparent formula for the UI legend). */
export function computeLocaleScore(missing: boolean, metadataMismatchCount: number, stale: boolean): number | null {
  if (missing) return null
  let s = 100
  s -= Math.min(3, metadataMismatchCount) * PTS_PER_META
  if (stale) s -= PTS_STALE
  return Math.max(0, Math.round(s))
}

export function buildMetadataCountByLocalePath(snapshot: ParitySnapshot): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of snapshot.metadataIssues ?? []) {
    const k = missingMirrorKey(i.locale, i.path)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export function buildStaleLocalePathSet(snapshot: ParitySnapshot): Set<string> {
  const s = new Set<string>()
  for (const i of snapshot.freshnessIssues ?? []) {
    s.add(missingMirrorKey(i.locale, i.path))
  }
  return s
}

export function getLocaleCellScore(
  path: string,
  locale: string,
  missingSet: Set<string>,
  metaCounts: Map<string, number>,
  staleSet: Set<string>,
): LocaleCellScore {
  const k = missingMirrorKey(locale, path)
  const missing = missingSet.has(k)
  const metadataMismatchCount = metaCounts.get(k) ?? 0
  const stale = staleSet.has(k)
  return {
    score: computeLocaleScore(missing, metadataMismatchCount, stale),
    missing,
    metadataMismatchCount,
    stale,
  }
}

export function formatScoreTooltip(c: LocaleCellScore, locale: string): string {
  if (c.missing) return `No mirror file at ${locale}/… (same path as English)`
  const parts = [`Score ${c.score}/100`]
  if (c.metadataMismatchCount > 0) {
    parts.push(`metadata Δ: ${c.metadataMismatchCount}/3 fields`)
  }
  parts.push(c.stale ? 'stale: English newer than this mirror (ingest lag)' : 'stale: no')
  return parts.join(' · ')
}

/**
 * Mean over every configured locale column. Missing mirrors count as **0**, so the row average
 * only reaches 100 when every locale has a file and each scores 100.
 */
export function rowAverageScore(cells: LocaleCellScore[]): number | null {
  if (cells.length === 0) return null
  const sum = cells.reduce((acc, c) => acc + (c.score ?? 0), 0)
  return Math.round(sum / cells.length)
}

export type LocaleOverview = {
  locale: string
  /** Mean score over `pathCount` paths; missing mirrors count as 0 (same rule as row Avg). */
  averageScore: number | null
  presentCount: number
  missingCount: number
  pathCount: number
}

/** Per-locale column average for a path set (e.g. full matrix or filtered rows). */
export function computeLocaleOverviews(
  paths: string[],
  locales: string[],
  missingSet: Set<string>,
  metaCounts: Map<string, number>,
  staleSet: Set<string>,
): LocaleOverview[] {
  if (paths.length === 0) {
    return locales.map((locale) => ({
      locale,
      averageScore: null,
      presentCount: 0,
      missingCount: 0,
      pathCount: 0,
    }))
  }
  return locales.map((locale) => {
    let sum = 0
    let presentCount = 0
    let missingCount = 0
    for (const path of paths) {
      const c = getLocaleCellScore(path, locale, missingSet, metaCounts, staleSet)
      sum += c.score ?? 0
      if (c.missing) missingCount++
      else presentCount++
    }
    return {
      locale,
      averageScore: Math.round(sum / paths.length),
      presentCount,
      missingCount,
      pathCount: paths.length,
    }
  })
}

export function scoreCellClass(score: number | null, missing: boolean): string {
  if (missing) {
    return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }
  if (score == null) return 'bg-slate-100 text-slate-600 dark:bg-slate-800'
  if (score >= 95) return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
  if (score >= 75) return 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200'
  return 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200'
}
