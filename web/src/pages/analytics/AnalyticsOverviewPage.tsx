import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'

function SourceCard({
  title,
  configured,
  detail,
  lastSyncedAt,
}: {
  title: string
  configured: boolean
  detail?: string
  lastSyncedAt?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {configured ? (
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Configured</span>
        ) : (
          <span>Not connected — snapshot marks this source as inactive.</span>
        )}
      </p>
      {lastSyncedAt ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Last synced (snapshot): {new Date(lastSyncedAt).toLocaleString()}
        </p>
      ) : configured ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No lastSyncedAt in snapshot yet.</p>
      ) : null}
      {detail ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p> : null}
    </div>
  )
}

export function AnalyticsOverviewPage() {
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
  const seoVendor = data.sources.seo.vendor
  const seoDetail =
    seoVendor === 'ahrefs' || seoVendor === 'semrush' ? `Vendor: ${seoVendor}` : 'No vendor selected in snapshot yet.'

  const trafficRows = data.traffic?.series?.length ?? 0
  const gscQueries = data.searchConsole?.topQueries?.length ?? 0
  const gscPages = data.searchConsole?.topPages?.length ?? 0
  const seoRows = data.seo?.keywordsSample?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SourceCard
          title="Google Analytics (GA4)"
          configured={data.sources.ga4.configured}
          lastSyncedAt={data.sources.ga4.lastSyncedAt}
        />
        <SourceCard
          title="Google Search Console"
          configured={data.sources.gsc.configured}
          lastSyncedAt={data.sources.gsc.lastSyncedAt}
        />
        <SourceCard
          title="SEO vendor (Ahrefs or Semrush)"
          configured={data.sources.seo.configured}
          detail={seoDetail}
          lastSyncedAt={data.sources.seo.lastSyncedAt}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Snapshot contents</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-400">
          <li>
            <Link to="/analytics/pages" className="font-medium text-slate-900 underline dark:text-slate-100">
              Pages
            </Link>
            : merged paths from GA4 / GSC / SEO (see table)
          </li>
          <li>
            <Link to="/analytics/traffic" className="font-medium text-slate-900 underline dark:text-slate-100">
              Traffic
            </Link>
            : {trafficRows} metric row{trafficRows === 1 ? '' : 's'}
          </li>
          <li>
            <Link to="/analytics/search-console" className="font-medium text-slate-900 underline dark:text-slate-100">
              Search Console
            </Link>
            : {gscQueries} quer{gscQueries === 1 ? 'y' : 'ies'}, {gscPages} page{gscPages === 1 ? '' : 's'}
          </li>
          <li>
            <Link to="/analytics/seo" className="font-medium text-slate-900 underline dark:text-slate-100">
              SEO vendor
            </Link>
            : {seoRows} keyword sample row{seoRows === 1 ? '' : 's'}
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Snapshot metadata</h2>
        <dl className="mt-3 grid gap-2 text-slate-600 dark:text-slate-400 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Schema version</dt>
            <dd className="font-mono text-slate-900 dark:text-slate-100">{data.schemaVersion}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Generated at</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '— (not produced yet)'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
