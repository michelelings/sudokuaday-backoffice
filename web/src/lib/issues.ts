import type { ParityIssue, ParitySnapshot, PathIssue } from '../types/parity'
import { isMetadataIssue, isPathIssue, isSitemapIssue } from '../types/parity'

export type IssueCategory = 'all' | 'path' | 'metadata' | 'sitemap'

export function getAllIssues(data: ParitySnapshot): ParityIssue[] {
  const path = data.issues ?? []
  const meta = data.metadataIssues ?? []
  const sm = data.sitemapIssues ?? []
  return [...path, ...meta, ...sm]
}

export function filterIssues(
  data: ParitySnapshot,
  category: IssueCategory,
  locale: string,
  pathContains: string,
  pathType: '' | 'missing' | 'extra',
): ParityIssue[] {
  let rows = getAllIssues(data)
  if (category === 'path') rows = rows.filter(isPathIssue)
  else if (category === 'metadata') rows = rows.filter(isMetadataIssue)
  else if (category === 'sitemap') rows = rows.filter(isSitemapIssue)

  if (locale) {
    rows = rows.filter((i) => {
      if (isSitemapIssue(i)) return false
      return i.locale === locale
    })
  }

  if (pathType) {
    if (category === 'path') {
      rows = rows.filter((i): i is PathIssue => isPathIssue(i) && i.type === pathType)
    } else if (category === 'all') {
      rows = rows.filter(
        (i) =>
          (isPathIssue(i) && i.type === pathType) || isMetadataIssue(i) || isSitemapIssue(i),
      )
    }
  }

  const q = pathContains.trim().toLowerCase()
  if (q) {
    rows = rows.filter((i) => {
      if (isSitemapIssue(i)) {
        return i.urlPath.toLowerCase().includes(q) || i.loc.toLowerCase().includes(q)
      }
      return i.path.toLowerCase().includes(q)
    })
  }

  return rows
}

export function metadataTotal(data: ParitySnapshot): number {
  if (typeof data.metadataIssuesTotal === 'number') return data.metadataIssuesTotal
  const fromSummary = data.nonDefaultLocales.reduce(
    (acc, loc) => acc + (data.summary[loc]?.metadataMismatches ?? 0),
    0,
  )
  if (fromSummary > 0) return fromSummary
  return data.metadataIssues?.length ?? 0
}

export function issuesToCsv(issues: ParityIssue[]): string {
  const lines: string[] = ['type,locale,path,field,enValue,localeValue,urlPath,loc']
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  for (const i of issues) {
    if (isPathIssue(i)) {
      lines.push([i.type, i.locale, i.path, '', '', '', '', ''].map(esc).join(','))
    } else if (isMetadataIssue(i)) {
      lines.push(
        [
          'metadata',
          i.locale,
          i.path,
          i.field,
          i.enValue,
          i.localeValue,
          '',
          '',
        ]
          .map(esc)
          .join(','),
      )
    } else if (isSitemapIssue(i)) {
      lines.push(['sitemap_orphan', '', '', '', '', '', i.urlPath, i.loc].map(esc).join(','))
    }
  }
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
