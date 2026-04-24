import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'
import { fetchParitySnapshot } from '../../api/parity'
import {
  buildPageScoreboard,
  buildParityInventoryScoreboard,
  type PageScoreboardRow,
} from '../../lib/analyticsPageMatrix'
import { getEnglishPathRows } from '../../lib/coverageMatrix'
import { pageScoreboardMatrixToCsv, pageScoreboardToCsv } from '../../lib/analyticsCsv'
import { formControlClassName, secondaryButtonClassName } from '../../lib/formControls'
import { downloadTextFile } from '../../lib/issues'
import { englishLiveUrl, hrefFromSnapshotPathOrUrl, liveSiteLinkClassName } from '../../lib/siteUrls'

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
  const parityQ = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
    staleTime: 60_000,
  })

  const analyticsQ = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: fetchAnalyticsSnapshot,
    staleTime: 60_000,
  })

  const [ga4LocaleFilter, setGa4LocaleFilter] = useState('')
  const [siteLocaleFilter, setSiteLocaleFilter] = useState('')

  const series = analyticsQ.data?.traffic?.series ?? []

  const ga4LocaleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of series) {
      if (row.source !== 'ga4') continue
      if (typeof row.dimensions.pagePath !== 'string' || !row.dimensions.pagePath) continue
      const loc = row.dimensions.locale
      if (typeof loc === 'string' && loc) set.add(loc)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [series])

  const inventory = useMemo(() => {
    if (!analyticsQ.data) return { mode: 'pending' as const, rows: [] as PageScoreboardRow[], partialInventory: false }

    const parity = parityQ.data
    if (parity) {
      const { rows: englishPaths } = getEnglishPathRows(parity)
      if (englishPaths.length > 0) {
        const { rows, partialInventory } = buildParityInventoryScoreboard(parity, analyticsQ.data, {
          ga4LocaleFilter: ga4LocaleFilter || undefined,
          siteLocaleFilter: siteLocaleFilter || undefined,
        })
        return { mode: 'parity' as const, rows, partialInventory }
      }
    }

    const rows = buildPageScoreboard(analyticsQ.data, { localeFilter: ga4LocaleFilter || undefined })
    return { mode: 'analytics' as const, rows, partialInventory: false }
  }, [parityQ.data, analyticsQ.data, ga4LocaleFilter, siteLocaleFilter])

  const rows = inventory.rows

  const visibleLocales = useMemo(() => {
    if (!parityQ.data) return [] as string[]
    if (siteLocaleFilter) return [siteLocaleFilter]
    return parityQ.data.locales
  }, [parityQ.data, siteLocaleFilter])

  const parityMatrix = useMemo(() => {
    if (inventory.mode !== 'parity') return [] as { englishRepoPath: string; byLocale: Map<string, PageScoreboardRow> }[]
    const byEn = new Map<string, Map<string, PageScoreboardRow>>()
    for (const r of rows) {
      const en = r.englishRepoPath ?? ''
      if (!en) continue
      if (!byEn.has(en)) byEn.set(en, new Map())
      byEn.get(en)!.set(r.siteLocale ?? '', r)
    }
    const orderedKeys = [...new Set(rows.map((r) => r.englishRepoPath).filter(Boolean) as string[])]
    return orderedKeys.map((englishRepoPath) => ({
      englishRepoPath,
      byLocale: byEn.get(englishRepoPath)!,
    }))
  }, [inventory.mode, rows])

  if (parityQ.isPending || analyticsQ.isPending) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (analyticsQ.isError) {
    return (
      <p className="text-sm text-red-700 dark:text-red-400">{(analyticsQ.error as Error).message}</p>
    )
  }

  const data = analyticsQ.data!
  const seoVendor = data.sources.seo.vendor
  const seoLabel =
    seoVendor === 'ahrefs' || seoVendor === 'semrush'
      ? seoVendor.charAt(0).toUpperCase() + seoVendor.slice(1)
      : 'SEO vendor'

  const parityError = parityQ.isError ? (parityQ.error as Error).message : null
  const showParityColumns = inventory.mode === 'parity'
  const englishPathCount = parityQ.data ? getEnglishPathRows(parityQ.data).rows.length : 0

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No pages to list</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Load <code className="rounded bg-black/10 px-1">parity-snapshot.json</code> (from ingest) so English HTML paths
          and locale mirrors are enumerated, or add analytics rows with{' '}
          <code className="rounded bg-black/10 px-1">dimensions.pagePath</code>, GSC{' '}
          <code className="rounded bg-black/10 px-1">topPages</code>, or SEO keyword URLs.
        </p>
        {parityError ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Parity snapshot failed to load ({parityError}) — fix hosting or run ingest so the full inventory is
            available.
          </p>
        ) : null}
      </div>
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const gaDateNote = rows.find((r) => r.ga4?.asOfDate)?.ga4?.asOfDate

  const exportCsv = () => {
    if (showParityColumns && visibleLocales.length) {
      downloadTextFile(
        `analytics-pages-${stamp}.csv`,
        pageScoreboardMatrixToCsv(parityMatrix, visibleLocales, seoLabel),
        'text/csv;charset=utf-8',
      )
    } else {
      downloadTextFile(
        `analytics-pages-${stamp}.csv`,
        pageScoreboardToCsv(rows, seoLabel),
        'text/csv;charset=utf-8',
      )
    }
  }

  const stickyFirst =
    'sticky left-0 z-20 border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
  const stickyFirstCell =
    'sticky left-0 z-10 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'

  return (
    <div className="space-y-4">
      {parityError && inventory.mode === 'analytics' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Parity snapshot could not be loaded ({parityError}), so only URLs seen in{' '}
          <code className="rounded bg-black/10 px-1">analytics-snapshot.json</code> are listed — not the full site.
        </p>
      ) : null}

      {inventory.partialInventory ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          This parity file has no <code className="rounded bg-black/10 px-1">englishPaths</code> array; rows are inferred
          from issues only and may omit pages with no reported problems. Re-run ingest to publish a complete list.
        </p>
      ) : null}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {showParityColumns ? (
          <>
            <strong>{englishPathCount}</strong> English page{englishPathCount === 1 ? '' : 's'}. Each language is a column
            group with <strong>GA</strong>, <strong>GSC</strong>, and <strong>{seoLabel}</strong> underneath. The first
            column is the repo file linking to the English URL. GA4 uses the latest date in{' '}
            <code className="rounded bg-black/10 px-1">traffic.series</code>
            {gaDateNote ? ` (${gaDateNote})` : ''}.
          </>
        ) : (
          <>
            One row per path found only in analytics (GSC / GA4 / SEO). For the full static site inventory, fix parity
            snapshot loading. GA4 uses the latest date in{' '}
            <code className="rounded bg-black/10 px-1">traffic.series</code>
            {gaDateNote ? ` (${gaDateNote})` : ''}.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          {showParityColumns ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Site locale (columns)
              <select
                value={siteLocaleFilter}
                onChange={(e) => setSiteLocaleFilter(e.target.value)}
                className={`min-w-[10rem] ${formControlClassName}`}
              >
                <option value="">All</option>
                {(parityQ.data?.locales ?? []).map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            GA4 locale (metrics filter)
            <select
              value={ga4LocaleFilter}
              onChange={(e) => setGa4LocaleFilter(e.target.value)}
              className={`min-w-[10rem] ${formControlClassName}`}
            >
              <option value="">All</option>
              {ga4LocaleOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {showParityColumns ? (
              <>
                {parityMatrix.length} page{parityMatrix.length === 1 ? '' : 's'} · {visibleLocales.length} language
                column group{visibleLocales.length === 1 ? '' : 's'}
              </>
            ) : (
              <>
                {rows.length} row{rows.length === 1 ? '' : 's'}
              </>
            )}
            {siteLocaleFilter ? ` · ${siteLocaleFilter} only` : ''}
            {ga4LocaleFilter ? ` · GA4 ${ga4LocaleFilter}` : ''}
          </p>
          <button type="button" onClick={exportCsv} className={secondaryButtonClassName}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-max text-left text-sm">
          {showParityColumns ? (
            <>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th
                    rowSpan={2}
                    scope="col"
                    className={`${stickyFirst} px-3 py-2 align-bottom font-medium normal-case`}
                  >
                    Page (EN file)
                  </th>
                  {visibleLocales.map((loc) => (
                    <th
                      key={loc}
                      scope="colgroup"
                      colSpan={3}
                      className="border-l border-slate-200 px-2 py-2 text-center font-medium dark:border-slate-700"
                    >
                      {loc}
                    </th>
                  ))}
                </tr>
                <tr>
                  {visibleLocales.flatMap((loc) => [
                    <th
                      key={`${loc}-ga`}
                      scope="col"
                      className="border-l border-slate-200 px-2 py-1.5 text-center text-[0.65rem] font-normal normal-case dark:border-slate-700"
                    >
                      GA
                    </th>,
                    <th
                      key={`${loc}-gsc`}
                      scope="col"
                      className="px-2 py-1.5 text-center text-[0.65rem] font-normal normal-case"
                    >
                      GSC
                    </th>,
                    <th
                      key={`${loc}-seo`}
                      scope="col"
                      className="px-2 py-1.5 text-center text-[0.65rem] font-normal normal-case"
                    >
                      {seoLabel}
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {parityMatrix.map(({ englishRepoPath, byLocale }) => (
                  <tr key={englishRepoPath} className="border-b border-slate-100 dark:border-slate-800">
                    <th
                      scope="row"
                      className={`${stickyFirstCell} px-3 py-2 align-top text-left font-normal`}
                    >
                      <a
                        href={englishLiveUrl(englishRepoPath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${liveSiteLinkClassName} font-mono text-xs break-all`}
                      >
                        {englishRepoPath}
                      </a>
                    </th>
                    {visibleLocales.flatMap((loc) => {
                      const r = byLocale.get(loc)
                      return [
                        <td
                          key={`${englishRepoPath}-${loc}-ga`}
                          className="max-w-[14rem] border-l border-slate-100 px-2 py-2 align-top text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300"
                        >
                          {r?.ga4 ? formatGaCell(r.ga4) : '—'}
                        </td>,
                        <td
                          key={`${englishRepoPath}-${loc}-gsc`}
                          className="max-w-[14rem] px-2 py-2 align-top text-xs text-slate-700 dark:text-slate-300"
                        >
                          {r?.gsc ? formatGscCell(r.gsc) : '—'}
                        </td>,
                        <td
                          key={`${englishRepoPath}-${loc}-seo`}
                          className="max-w-[14rem] px-2 py-2 align-top text-xs text-slate-700 dark:text-slate-300"
                        >
                          {r?.seo ? formatSeoCell(r.seo, seoLabel) : '—'}
                        </td>,
                      ]
                    })}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
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
            </>
          )}
        </table>
      </div>
    </div>
  )
}
