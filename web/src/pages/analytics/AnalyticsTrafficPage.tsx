import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'
import { trafficSeriesToCsv } from '../../lib/analyticsCsv'
import { downloadTextFile } from '../../lib/issues'

export function AnalyticsTrafficPage() {
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
      const loc = row.dimensions.locale
      if (typeof loc === 'string' && loc) set.add(loc)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [series])

  const filteredSeries = useMemo(() => {
    if (!localeFilter) return series
    return series.filter((row) => row.dimensions.locale === localeFilter)
  }, [series, localeFilter])

  if (q.isPending) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return (
      <p className="text-sm text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
    )
  }

  const data = q.data!

  if (!data.sources.ga4.configured || !data.traffic?.series?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No traffic data in the snapshot</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          When GA4 is connected, a scheduled job or BFF can write time series into{' '}
          <code className="rounded bg-black/10 px-1">traffic.series</code> and set{' '}
          <code className="rounded bg-black/10 px-1">sources.ga4.configured</code> to{' '}
          <code className="rounded bg-black/10 px-1">true</code>. Use{' '}
          <code className="rounded bg-black/10 px-1">dimensions.locale</code> for per-language breakdowns.
        </p>
      </div>
    )
  }

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadTextFile(`analytics-traffic-${stamp}.csv`, trafficSeriesToCsv(filteredSeries), 'text/csv;charset=utf-8')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Locale (GA4 dimension)
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
            {filteredSeries.length} row{filteredSeries.length === 1 ? '' : 's'}
            {localeFilter ? ` · ${localeFilter}` : ''}
          </p>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Metric</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Dimensions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSeries.map((row, i) => (
              <tr key={`${row.metric_key}-${row.date}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-mono text-xs">{row.metric_key}</td>
                <td className="px-3 py-2 text-xs">{row.date ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums">{row.value.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                  {Object.entries(row.dimensions)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.traffic.note ? (
          <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
            {data.traffic.note}
          </p>
        ) : null}
      </div>
    </div>
  )
}
