import type { PageScoreboardRow } from './analyticsPageMatrix'
import type { GscPageRow, GscQueryRow, MetricRow, SeoKeywordRow } from '../types/analytics'

function esc(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function trafficSeriesToCsv(rows: MetricRow[]): string {
  const headers = ['metric_key', 'date', 'value', 'source', 'dimensions_json']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        esc(r.metric_key),
        esc(r.date ?? ''),
        String(r.value),
        esc(r.source),
        esc(JSON.stringify(r.dimensions)),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function gscQueriesToCsv(rows: GscQueryRow[]): string {
  const headers = ['query', 'clicks', 'impressions', 'ctr', 'position', 'path']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        esc(r.query),
        String(r.clicks),
        String(r.impressions),
        r.ctr != null ? String(r.ctr) : '',
        r.position != null ? String(r.position) : '',
        esc(r.path ?? ''),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function gscPagesToCsv(rows: GscPageRow[]): string {
  const headers = ['path', 'clicks', 'impressions']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([esc(r.path), String(r.clicks), String(r.impressions)].join(','))
  }
  return lines.join('\n')
}

/** One row per English file; columns `en_ga`, `en_gsc`, `en_seo`, … per locale (seo = text summary). */
export function pageScoreboardMatrixToCsv(
  matrix: { englishRepoPath: string; byLocale: Map<string, PageScoreboardRow> }[],
  locales: string[],
  seoVendorLabel: string,
): string {
  const gaCell = (r?: PageScoreboardRow): string =>
    r?.ga4?.metricTotals.map((m) => `${m.metric_key}=${m.value}`).join('; ') ?? ''
  const gscCell = (r?: PageScoreboardRow): string =>
    r?.gsc ? `${r.gsc.clicks}/${r.gsc.impressions}` : ''
  const seoCell = (r?: PageScoreboardRow): string => {
    if (!r?.seo) return ''
    const pos = r.seo.bestPosition != null ? String(r.seo.bestPosition) : ''
    const vol = r.seo.volumeSum > 0 ? String(r.seo.volumeSum) : ''
    return [pos, String(r.seo.keywordCount), vol].filter(Boolean).join('|')
  }

  const headers = ['english_repo_path']
  for (const loc of locales) {
    const safe = loc.replace(/[^\w-]+/g, '_')
    headers.push(`${safe}_ga`, `${safe}_gsc`, `${safe}_seo`)
  }
  headers.push('seo_vendor')
  const lines = [headers.join(',')]

  for (const { englishRepoPath, byLocale } of matrix) {
    const cells = [esc(englishRepoPath)]
    for (const loc of locales) {
      const r = byLocale.get(loc)
      cells.push(esc(gaCell(r)), esc(gscCell(r)), esc(seoCell(r)))
    }
    cells.push(esc(seoVendorLabel))
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

export function pageScoreboardToCsv(rows: PageScoreboardRow[], seoVendorLabel: string): string {
  const hasParityCols = rows.some((r) => r.siteLocale != null || r.englishRepoPath != null)
  const headers = [
    ...(hasParityCols ? (['site_locale', 'english_repo_path'] as const) : []),
    'path',
    'ga4_metrics',
    'gsc_clicks',
    'gsc_impressions',
    'seo_best_position',
    'seo_keyword_count',
    'seo_volume_sum',
    'seo_vendor',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const ga =
      r.ga4?.metricTotals.map((m) => `${m.metric_key}=${m.value}`).join('; ') ?? ''
    const parityPrefix = hasParityCols
      ? [esc(r.siteLocale ?? ''), esc(r.englishRepoPath ?? '')]
      : []
    lines.push(
      [
        ...parityPrefix,
        esc(r.path),
        esc(ga),
        r.gsc ? String(r.gsc.clicks) : '',
        r.gsc ? String(r.gsc.impressions) : '',
        r.seo?.bestPosition != null ? String(r.seo.bestPosition) : '',
        r.seo ? String(r.seo.keywordCount) : '',
        r.seo && r.seo.volumeSum > 0 ? String(r.seo.volumeSum) : '',
        esc(seoVendorLabel),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function seoKeywordsToCsv(rows: SeoKeywordRow[]): string {
  const headers = ['keyword', 'volume', 'position', 'url']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        esc(r.keyword),
        r.volume != null ? String(r.volume) : '',
        r.position != null ? String(r.position) : '',
        esc(r.url ?? ''),
      ].join(','),
    )
  }
  return lines.join('\n')
}
