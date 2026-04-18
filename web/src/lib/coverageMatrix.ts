import type { ParitySnapshot } from '../types/parity'

/** Key for a missing mirror: locale + English-relative path */
export function missingMirrorKey(locale: string, path: string): string {
  return `${locale}\0${path}`
}

export function buildMissingMirrorSet(snapshot: ParitySnapshot): Set<string> {
  const s = new Set<string>()
  for (const i of snapshot.issues) {
    if (i.type === 'missing') s.add(missingMirrorKey(i.locale, i.path))
  }
  return s
}

export type EnglishPathRowsResult = {
  rows: string[]
  /** True when `englishPaths` was not in the snapshot and rows were inferred from issues only */
  partial: boolean
}

/**
 * Rows for the English × locale matrix. Prefer `englishPaths` from ingest; otherwise union paths
 * that appear in path/metadata/freshness issue lists (omits English pages with no reported issues).
 */
export function getEnglishPathRows(snapshot: ParitySnapshot): EnglishPathRowsResult {
  if (snapshot.englishPaths && snapshot.englishPaths.length > 0) {
    return { rows: snapshot.englishPaths, partial: false }
  }
  const u = new Set<string>()
  for (const i of snapshot.issues) {
    if (i.type === 'missing') u.add(i.path)
  }
  for (const i of snapshot.metadataIssues ?? []) u.add(i.path)
  for (const i of snapshot.freshnessIssues ?? []) u.add(i.path)
  const rows = Array.from(u).sort((a, b) => a.localeCompare(b))
  return { rows, partial: true }
}
