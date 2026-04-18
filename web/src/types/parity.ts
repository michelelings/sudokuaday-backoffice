export type ParityIssueType = 'missing' | 'extra'

export type ParityIssue = {
  type: ParityIssueType
  locale: string
  path: string
}

export type LocaleSummary = {
  missing: number
  extra: number
}

export type ParitySnapshot = {
  generatedAt: string
  repoPath?: string
  defaultLocale: string
  locales: string[]
  nonDefaultLocales: string[]
  englishHtmlCount: number
  summary: Record<string, LocaleSummary>
  issues: ParityIssue[]
}
