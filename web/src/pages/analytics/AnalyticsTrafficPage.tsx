import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'

export function AnalyticsTrafficPage() {
  const q = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: fetchAnalyticsSnapshot,
    staleTime: 60_000,
  })

  const data = q.data
  if (!data) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>

  if (!data.sources.ga4.configured || !data.traffic?.series?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No traffic data in the snapshot</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          When GA4 is connected, a scheduled job or BFF can write time series into{' '}
          <code className="rounded bg-black/10 px-1">traffic.series</code> and set{' '}
          <code className="rounded bg-black/10 px-1">sources.ga4.configured</code> to{' '}
          <code className="rounded bg-black/10 px-1">true</code>.
        </p>
      </div>
    )
  }

  return (
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
          {data.traffic.series.map((row, i) => (
            <tr key={`${row.metric_key}-${row.date}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2 font-mono text-xs">{row.metric_key}</td>
              <td className="px-3 py-2 text-xs">{row.date ?? '—'}</td>
              <td className="px-3 py-2 tabular-nums">{row.value}</td>
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
  )
}
