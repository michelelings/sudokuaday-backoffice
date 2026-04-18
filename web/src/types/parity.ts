export type PathIssueType = 'missing' | 'extra'

export type PathIssue = {
  type: PathIssueType
  locale: string
  path: string
}

export type MetaField = 'title' | 'description' | 'h1'

export type MetadataIssue = {
  type: 'metadata'
  locale: string
  path: string
  field: MetaField
  enValue: string
  localeValue: string
}

export type SitemapIssue = {
  type: 'sitemap_orphan'
  /** URL pathname, e.g. /de/foo/bar */
  urlPath: string
  loc: string
}

/** English source newer than locale mirror beyond lag threshold (see ingest STALE_LAG_HOURS) */
export type FreshnessIssue = {
  type: 'stale_mirror'
  locale: string
  path: string
  enModifiedAt: string
  localeModifiedAt: string
  /** Rounded hours English is ahead of locale */
  lagHours: number
}

export type ParityIssue = PathIssue | MetadataIssue | SitemapIssue | FreshnessIssue

export type LocaleSummary = {
  missing: number
  extra: number
  /** Present in snapshots from ingest v2+ */
  metadataMismatches?: number
  /** Locale file older than English beyond threshold (M3) */
  staleMirror?: number
}

export type RunHistoryEntry = {
  generatedAt: string
  repoSha?: string
  pathIssueCount: number
  metadataTotal: number
  /** M3+ ingest */
  staleMirrorTotal?: number
  englishHtmlCount: number
}

export type ParitySnapshot = {
  generatedAt: string
  repoPath?: string
  /** Git commit SHA when SUDOKUADAY_REPO_SHA is set during ingest */
  repoSha?: string
  /** Hours English must be newer than locale to flag stale (ingest) */
  staleLagHours?: number
  defaultLocale: string
  locales: string[]
  nonDefaultLocales: string[]
  englishHtmlCount: number
  /** All English HTML paths (ingest vNext+). Omitted in older snapshots; UI falls back to paths seen in issues. */
  englishPaths?: string[]
  summary: Record<string, LocaleSummary>
  /** Path parity (missing/extra) */
  issues: PathIssue[]
  metadataIssues: MetadataIssue[]
  /** Total metadata mismatches (may exceed metadataIssues.length when capped) */
  metadataIssuesTotal?: number
  metadataIssuesCapped?: boolean
  sitemap?: {
    file: string
    urlCount: number
  }
  sitemapIssues?: SitemapIssue[]
  /** English newer than locale mirror (capped list; see staleMirrorTotal) */
  freshnessIssues?: FreshnessIssue[]
  staleMirrorTotal?: number
  freshnessIssuesCapped?: boolean
  /** Rolling history of ingest runs (from previous snapshots, M3) */
  runHistory?: RunHistoryEntry[]
}

export function isPathIssue(i: ParityIssue): i is PathIssue {
  return i.type === 'missing' || i.type === 'extra'
}

export function isMetadataIssue(i: ParityIssue): i is MetadataIssue {
  return i.type === 'metadata'
}

export function isSitemapIssue(i: ParityIssue): i is SitemapIssue {
  return i.type === 'sitemap_orphan'
}

export function isFreshnessIssue(i: ParityIssue): i is FreshnessIssue {
  return i.type === 'stale_mirror'
}
