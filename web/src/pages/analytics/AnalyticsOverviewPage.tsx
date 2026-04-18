import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSnapshot } from '../../api/analytics'

function SourceCard({
  title,
  configured,
  detail,
}: {
  title: string
  configured: boolean
  detail?: string
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

  const data = q.data
  if (!data) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
  }

  const seoVendor = data.sources.seo.vendor
  const seoDetail =
    seoVendor === 'ahrefs' || seoVendor === 'semrush' ? `Vendor: ${seoVendor}` : 'No vendor selected in snapshot yet.'

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SourceCard title="Google Analytics (GA4)" configured={data.sources.ga4.configured} />
        <SourceCard title="Google Search Console" configured={data.sources.gsc.configured} />
        <SourceCard
          title="SEO vendor (Ahrefs or Semrush)"
          configured={data.sources.seo.configured}
          detail={seoDetail}
        />
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
