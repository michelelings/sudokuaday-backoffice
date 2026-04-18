import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'
import { gscPagesToCsv, gscQueriesToCsv } from '../../lib/analyticsCsv'
import { downloadTextFile } from '../../lib/issues'
import { hrefFromSnapshotPathOrUrl, liveSiteLinkClassName } from '../../lib/siteUrls'

export function AnalyticsSearchConsolePage() {
  const q = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: fetchAnalyticsSnapshot,
    staleTime: 60_000,
  })

  if (q.isPending) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return <p className="text-sm text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
  }

  const data = q.data!
  const sc = data.searchConsole
  const hasQueries = Boolean(sc?.topQueries?.length)
  const hasPages = Boolean(sc?.topPages?.length)
  const hasData = hasQueries || hasPages

  if (!data.sources.gsc.configured || !hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-600 dark:bg-slate-900/50">
        <p className="font-medium text-slate-800 dark:text-slate-200">No Search Console data in the snapshot</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          When GSC is connected, populate <code className="rounded bg-black/10 px-1">searchConsole.topQueries</code> and{' '}
          <code className="rounded bg-black/10 px-1">topPages</code>, and set{' '}
          <code className="rounded bg-black/10 px-1">sources.gsc.configured</code> to true.
        </p>
      </div>
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-8">
      {hasQueries ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Top queries</h2>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `analytics-gsc-queries-${stamp}.csv`,
                  gscQueriesToCsv(sc!.topQueries),
                  'text/csv;charset=utf-8',
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Query</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                  <th className="px-3 py-2 font-medium">Impr.</th>
                  <th className="px-3 py-2 font-medium">CTR</th>
                  <th className="px-3 py-2 font-medium">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {sc!.topQueries.map((r, i) => (
                  <tr key={`${r.query}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">{r.query}</td>
                    <td className="px-3 py-2 tabular-nums">{r.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{r.impressions.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{r.ctr != null ? `${(r.ctr * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{r.position != null ? r.position.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {hasPages ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Top pages</h2>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `analytics-gsc-pages-${stamp}.csv`,
                  gscPagesToCsv(sc!.topPages),
                  'text/csv;charset=utf-8',
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                  <th className="px-3 py-2 font-medium">Impr.</th>
                </tr>
              </thead>
              <tbody>
                {sc!.topPages.map((r, i) => (
                  <tr key={`${r.path}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-mono text-xs break-all">
                      <a
                        href={hrefFromSnapshotPathOrUrl(r.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={liveSiteLinkClassName}
                      >
                        {r.path}
                      </a>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{r.impressions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {sc?.note ? <p className="text-xs text-slate-500 dark:text-slate-400">{sc.note}</p> : null}
    </div>
  )
}
