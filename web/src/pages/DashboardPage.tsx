import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchParitySnapshot } from '../api/parity'
import { buildMissingMirrorSet, getEnglishPathRows } from '../lib/coverageMatrix'
import {
  buildMetadataCountByLocalePath,
  buildStaleLocalePathSet,
  computeLocaleOverviews,
  scoreCellClass,
} from '../lib/pageScores'
import { liveSiteLinkClassName, localeLiveUrl } from '../lib/siteUrls'
import { metadataTotal, staleMirrorTotal } from '../lib/issues'
import { SnapshotScheduleDetails } from '../components/SnapshotScheduleDetails'
import { SyncParityButton } from '../components/SyncParityButton'

export function DashboardPage() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  const missingSet = useMemo(() => (q.data ? buildMissingMirrorSet(q.data) : new Set<string>()), [q.data])

  const metaCounts = useMemo(
    () => (q.data ? buildMetadataCountByLocalePath(q.data) : new Map<string, number>()),
    [q.data],
  )

  const staleSet = useMemo(
    () => (q.data ? buildStaleLocalePathSet(q.data) : new Set<string>()),
    [q.data],
  )

  const { rows } = useMemo(
    () => (q.data ? getEnglishPathRows(q.data) : { rows: [] as string[], partial: false }),
    [q.data],
  )

  const localeOverviews = useMemo(
    () =>
      q.data
        ? computeLocaleOverviews(rows, q.data.nonDefaultLocales, missingSet, metaCounts, staleSet)
        : [],
    [q.data, rows, missingSet, metaCounts, staleSet],
  )

  if (q.isPending) {
    return <p className="text-slate-600 dark:text-slate-400">Loading snapshot…</p>
  }

  if (q.isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">Could not load parity data</p>
        <p className="mt-1 text-sm opacity-90">
          {(q.error as Error).message}. Run{' '}
          <code className="rounded bg-black/10 px-1">npm run ingest</code> with{' '}
          <code className="rounded bg-black/10 px-1">SUDOKUADAY_REPO_PATH</code> set (see plan).
        </p>
      </div>
    )
  }

  const data = q.data
  const pathIssueCount = data.issues.length
  const metaCount = metadataTotal(data)
  const staleCount = staleMirrorTotal(data)
  const sitemapOrphans = data.sitemapIssues?.length ?? 0
  const history = (data.runHistory ?? []).slice(0, 12)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Translation parity vs English (static HTML mirror). Ingestion is read-only; nothing here modifies the live
          site.
        </p>
        {typeof data.staleLagHours === 'number' ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Stale mirrors: English version newer than locale by more than{' '}
            <span className="font-medium tabular-nums">{data.staleLagHours}</span>h (git commit time or file mtime).{' '}
            Override with <code className="rounded bg-black/10 px-1">STALE_LAG_HOURS</code> when running ingest.
          </p>
        ) : null}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">English HTML paths</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{data.englishHtmlCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Locales</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{data.nonDefaultLocales.length}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Snapshot</dt>
          <dd className="mt-1">
            <SnapshotScheduleDetails generatedAt={data.generatedAt} />
            <SyncParityButton />
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Path issues (missing/extra)</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-red-700 dark:text-red-400">{pathIssueCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Metadata mismatches</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-violet-700 dark:text-violet-400">{metaCount}</dd>
          {data.metadataIssuesCapped ? (
            <dd className="mt-1 text-xs text-slate-500">Issue table stores a sample; total above is full count.</dd>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Stale mirrors</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-cyan-800 dark:text-cyan-300">{staleCount}</dd>
          {data.freshnessIssuesCapped ? (
            <dd className="mt-1 text-xs text-slate-500">Stored list capped; total above is full count.</dd>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Sitemap</dt>
          <dd className="mt-1 text-sm font-medium">
            {data.sitemap ? (
              <>
                <span className="tabular-nums">{data.sitemap.urlCount.toLocaleString()}</span> URLs in{' '}
                <code className="rounded bg-black/5 px-1 text-xs dark:bg-white/10">{data.sitemap.file}</code>
              </>
            ) : (
              '—'
            )}
          </dd>
          <dd className="mt-1 text-xs text-slate-500">
            Orphan URLs (in sitemap, no matching HTML file):{' '}
            <span className="font-medium tabular-nums text-amber-800 dark:text-amber-300">{sitemapOrphans}</span>
          </dd>
        </div>
      </dl>

      <section
        aria-labelledby="dashboard-locale-scores-heading"
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="dashboard-locale-scores-heading" className="text-lg font-semibold tracking-tight">
              Scores by language
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Average mirror score across all English paths in the coverage matrix (same formula as each locale column:
              missing pages count as 0). See the{' '}
              <Link
                to="/coverage"
                className="font-medium text-slate-900 no-underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
              >
                coverage matrix
              </Link>{' '}
              for per-path detail.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
          {localeOverviews.map((o) => {
            const score = o.averageScore
            const title = `${o.presentCount} mirrored · ${o.missingCount} missing · ${o.pathCount} paths`
            return (
              <div
                key={o.locale}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={localeLiveUrl(o.locale, 'index.html')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${liveSiteLinkClassName} font-mono text-sm font-semibold`}
                    title={`Open ${o.locale} homepage`}
                  >
                    {o.locale}
                  </a>
                  {score == null ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <span
                      className={`inline-flex min-w-[2.75rem] justify-center rounded px-2 py-0.5 text-sm font-semibold tabular-nums ${scoreCellClass(score, false)}`}
                      title={title}
                    >
                      {score}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400" title={title}>
                  {o.pathCount === 0 ? (
                    'No paths in view'
                  ) : (
                    <>
                      <span className="tabular-nums text-slate-700 dark:text-slate-300">{o.presentCount}</span> present
                      · <span className="tabular-nums text-slate-700 dark:text-slate-300">{o.missingCount}</span> missing
                    </>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {data.repoPath ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Source checkout: <code className="rounded bg-black/5 px-1 dark:bg-white/10">{data.repoPath}</code>
          {data.repoSha ? (
            <>
              {' '}
              · <span className="font-mono">@{data.repoSha}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {history.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold">Recent ingest runs</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Rolled forward from previous <code className="rounded bg-black/10 px-1">parity-snapshot.json</code> files (up
            to 40 entries).
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Site SHA</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Meta</th>
                  <th className="px-3 py-2 font-medium">Stale</th>
                  <th className="px-3 py-2 font-medium">EN pages</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.generatedAt} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(row.generatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.repoSha ? row.repoSha.slice(0, 7) : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{row.pathIssueCount}</td>
                    <td className="px-3 py-2 tabular-nums">{row.metadataTotal}</td>
                    <td className="px-3 py-2 tabular-nums">{row.staleMirrorTotal ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{row.englishHtmlCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold">Per locale</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Locale</th>
                <th className="px-4 py-3 font-medium">Missing</th>
                <th className="px-4 py-3 font-medium">Extra</th>
                <th className="px-4 py-3 font-medium">Meta Δ</th>
                <th className="px-4 py-3 font-medium">Stale</th>
              </tr>
            </thead>
            <tbody>
              {data.nonDefaultLocales.map((loc) => {
                const s = data.summary[loc] ?? { missing: 0, extra: 0, metadataMismatches: 0, staleMirror: 0 }
                return (
                  <tr key={loc} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={localeLiveUrl(loc, 'index.html')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={liveSiteLinkClassName}
                        title={`Open ${loc} homepage`}
                      >
                        {loc}
                      </a>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-red-700 dark:text-red-400">{s.missing}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-700 dark:text-amber-400">{s.extra}</td>
                    <td className="px-4 py-3 tabular-nums text-violet-700 dark:text-violet-400">
                      {s.metadataMismatches ?? 0}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-cyan-800 dark:text-cyan-300">
                      {s.staleMirror ?? 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link
            to="/parity"
            className="text-sm font-medium text-slate-900 no-underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
          >
            Browse and export issues →
          </Link>
          <Link
            to="/analytics"
            className="text-sm font-medium text-slate-900 no-underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
          >
            Analytics and SEO (prep) →
          </Link>
        </p>
      </div>
    </div>
  )
}
