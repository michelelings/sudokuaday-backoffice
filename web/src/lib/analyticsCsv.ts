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
