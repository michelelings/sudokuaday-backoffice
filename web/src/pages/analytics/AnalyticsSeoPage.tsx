import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'

export function AnalyticsSeoPage() {
  const q = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: fetchAnalyticsSnapshot,
    staleTime: 60_000,
  })

  const data = q.data
  if (!data) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>

  const seo = data.seo
  const hasRows = Boolean(seo?.keywordsSample?.length)

  if (!data.sources.seo.configured || !hasRows) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No SEO vendor data in the snapshot</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Pick one vendor (Ahrefs or Semrush) in the connector, set{' '}
          <code className="rounded bg-black/10 px-1">sources.seo.vendor</code> and{' '}
          <code className="rounded bg-black/10 px-1">sources.seo.configured</code>, then fill{' '}
          <code className="rounded bg-black/10 px-1">seo.keywordsSample</code> (and expand the schema as needed).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Vendor: <span className="font-semibold capitalize">{seo!.vendor}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Keyword</th>
              <th className="px-3 py-2 font-medium">Volume</th>
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-3 py-2 font-medium">URL</th>
            </tr>
          </thead>
          <tbody>
            {seo!.keywordsSample.map((r, i) => (
              <tr key={`${r.keyword}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2">{r.keyword}</td>
                <td className="px-3 py-2 tabular-nums">{r.volume ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums">{r.position ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{r.url ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {seo?.note ? <p className="text-xs text-slate-500 dark:text-slate-400">{seo.note}</p> : null}
    </div>
  )
}
