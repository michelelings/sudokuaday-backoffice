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

export type ParityIssue = PathIssue | MetadataIssue | SitemapIssue

export type LocaleSummary = {
  missing: number
  extra: number
  /** Present in snapshots from ingest v2+ */
  metadataMismatches?: number
}

export type ParitySnapshot = {
  generatedAt: string
  repoPath?: string
  /** Git commit SHA when SUDOKUADAY_REPO_SHA is set during ingest */
  repoSha?: string
  defaultLocale: string
  locales: string[]
  nonDefaultLocales: string[]
  englishHtmlCount: number
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
