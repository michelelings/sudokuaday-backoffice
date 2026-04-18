import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'
import { buildPageScoreboard, type PageScoreboardRow } from '../../lib/analyticsPageMatrix'
import { pageScoreboardToCsv } from '../../lib/analyticsCsv'
import { downloadTextFile } from '../../lib/issues'
import { hrefFromSnapshotPathOrUrl, liveSiteLinkClassName } from '../../lib/siteUrls'

function formatGaCell(ga4: NonNullable<PageScoreboardRow['ga4']>): string {
  return ga4.metricTotals.map((m) => `${m.metric_key} ${m.value.toLocaleString()}`).join(' · ')
}

function formatGscCell(gsc: NonNullable<PageScoreboardRow['gsc']>): string {
  return `${gsc.clicks.toLocaleString()} clicks · ${gsc.impressions.toLocaleString()} impr.`
}

function formatSeoCell(seo: NonNullable<PageScoreboardRow['seo']>, vendorLabel: string): string {
  const pos = seo.bestPosition != null ? `best pos. ${seo.bestPosition}` : 'pos. —'
  const vol =
    seo.volumeSum > 0 ? ` · vol. ${seo.volumeSum.toLocaleString()}` : ''
  return `${vendorLabel}: ${pos} · ${seo.keywordCount} kw${vol}`
}

export function AnalyticsPagesPage() {
  const q = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: fetchAnalyticsSnapshot,
    staleTime: 60_000,
  })

  const [localeFilter, setLocaleFilter] = useState('')

  const series = q.data?.traffic?.series ?? []

  const localeOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of series) {
      if (row.source !== 'ga4') continue
      if (typeof row.dimensions.pagePath !== 'string' || !row.dimensions.pagePath) continue
      const loc = row.dimensions.locale
      if (typeof loc === 'string' && loc) set.add(loc)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [series])

  const rows = useMemo(() => {
    if (!q.data) return []
    return buildPageScoreboard(q.data, { localeFilter: localeFilter || undefined })
  }, [q.data, localeFilter])

  if (q.isPending) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return <p className="text-sm text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
  }

  const data = q.data!
  const seoVendor = data.sources.seo.vendor
  const seoLabel =
    seoVendor === 'ahrefs' || seoVendor === 'semrush'
      ? seoVendor.charAt(0).toUpperCase() + seoVendor.slice(1)
      : 'SEO vendor'

  const anySource =
    data.sources.ga4.configured ||
    data.sources.gsc.configured ||
    data.sources.seo.configured

  if (!anySource || !rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No per-page data to merge yet</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This view lists every path that appears in{' '}
          <code className="rounded bg-black/10 px-1">traffic.series</code> (GA4 rows with{' '}
          <code className="rounded bg-black/10 px-1">dimensions.pagePath</code>),{' '}
          <code className="rounded bg-black/10 px-1">searchConsole.topPages</code>, or keyword{' '}
          <code className="rounded bg-black/10 px-1">url</code> values in the SEO sample. Configure
          sources and republish <code className="rounded bg-black/10 px-1">analytics-snapshot.json</code>{' '}
          to populate the table.
        </p>
      </div>
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const gaDateNote = rows.find((r) => r.ga4?.asOfDate)?.ga4?.asOfDate

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        One row per path found across GA4 (page path), Search Console (top pages), and the SEO vendor
        sample (keyword URLs). GA4 numbers use the latest date present in{' '}
        <code className="rounded bg-black/10 px-1">traffic.series</code>
        {gaDateNote ? ` (${gaDateNote})` : ''} so daily rows are not summed across multiple days.
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Locale (GA4 only)
          <select
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
            className="min-w-[10rem] rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All</option>
            {localeOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {rows.length} page{rows.length === 1 ? '' : 's'}
            {localeFilter ? ` · GA4 ${localeFilter}` : ''}
          </p>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `analytics-pages-${stamp}.csv`,
                pageScoreboardToCsv(rows, seoLabel),
                'text/csv;charset=utf-8',
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Page</th>
              <th className="px-3 py-2 font-medium">Google Analytics</th>
              <th className="px-3 py-2 font-medium">Search Console</th>
              <th className="px-3 py-2 font-medium">{seoLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-mono text-xs break-all align-top">
                  <a
                    href={hrefFromSnapshotPathOrUrl(r.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={liveSiteLinkClassName}
                  >
                    {r.path}
                  </a>
                </td>
                <td className="px-3 py-2 align-top text-slate-700 dark:text-slate-300">
                  {r.ga4 ? formatGaCell(r.ga4) : '—'}
                </td>
                <td className="px-3 py-2 align-top text-slate-700 dark:text-slate-300">
                  {r.gsc ? formatGscCell(r.gsc) : '—'}
                </td>
                <td className="px-3 py-2 align-top text-slate-700 dark:text-slate-300">
                  {r.seo ? formatSeoCell(r.seo, seoLabel) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
