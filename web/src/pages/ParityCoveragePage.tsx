import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchParitySnapshot } from '../api/parity'
import { buildMissingMirrorSet, getEnglishPathRows } from '../lib/coverageMatrix'
import {
  buildMetadataCountByLocalePath,
  buildStaleLocalePathSet,
  computeLocaleOverviews,
  formatScoreTooltip,
  getLocaleCellScore,
  rowAverageScore,
  scoreCellClass,
} from '../lib/pageScores'
import { englishLiveUrl, liveSiteLinkClassName, localeLiveUrl } from '../lib/siteUrls'

export function ParityCoveragePage() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  const [search, setSearch] = useState('')

  const missingSet = useMemo(() => (q.data ? buildMissingMirrorSet(q.data) : new Set<string>()), [q.data])

  const metaCounts = useMemo(
    () => (q.data ? buildMetadataCountByLocalePath(q.data) : new Map<string, number>()),
    [q.data],
  )

  const staleSet = useMemo(
    () => (q.data ? buildStaleLocalePathSet(q.data) : new Set<string>()),
    [q.data],
  )

  const { rows, partial } = useMemo(
    () => (q.data ? getEnglishPathRows(q.data) : { rows: [] as string[], partial: false }),
    [q.data],
  )

  const filteredRows = useMemo(() => {
    const qv = search.trim().toLowerCase()
    if (!qv) return rows
    return rows.filter((p) => p.toLowerCase().includes(qv))
  }, [rows, search])

  const localeOverviews = useMemo(
    () =>
      q.data
        ? computeLocaleOverviews(filteredRows, q.data.nonDefaultLocales, missingSet, metaCounts, staleSet)
        : [],
    [q.data, filteredRows, missingSet, metaCounts, staleSet],
  )

  if (q.isPending) {
    return <p className="text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return <p className="text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
  }

  const data = q.data
  const locales = data.nonDefaultLocales

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coverage matrix</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Each row is an English HTML path. Click the path for the live English page. Each locale column shows a{' '}
          <strong>0–100 score</strong> when the mirror exists: starts at 100, minus 20 per mismatched metadata field
          (title, description, <code className="rounded bg-black/10 px-1">h1</code>) found in this snapshot, minus 25 if
          the mirror is <strong>stale</strong> (English newer than locale past ingest lag).{' '}
          <span className="text-slate-500">“—”</span> means missing file. The sticky <strong>Avg</strong> column (after the
          path) is the <strong>mean score across all locales</strong> — missing mirrors count as 0, so 100 only if every
          translation exists and scores 100. Hover a cell for details.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-emerald-100 dark:bg-emerald-950/60" /> ≥95
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-amber-100 dark:bg-amber-950/50" /> 75–94
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-red-100 dark:bg-red-950/60" /> &lt;75
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-slate-100 dark:bg-slate-800" /> missing
          </span>
        </div>
      </div>

      <section aria-labelledby="coverage-locale-scores-heading" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="coverage-locale-scores-heading" className="text-lg font-semibold tracking-tight">
              Scores by language
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Average mirror score across the paths in the table below (same formula as each column: missing pages count
              as 0). {search.trim() ? 'Reflects the current path filter.' : null}
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

      {partial && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          This snapshot has no <code className="rounded bg-black/10 px-1">englishPaths</code> list. Showing{' '}
          <strong>{rows.length}</strong> paths that appear in issues only (English total:{' '}
          <strong>{data.englishHtmlCount}</strong>). Re-run{' '}
          <code className="rounded bg-black/10 px-1">npm run ingest</code> with a current ingest script to load the full
          matrix.
        </div>
      )}

      {data.metadataIssuesCapped && (
        <div
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100"
          role="status"
        >
          Metadata issues are <strong>capped</strong> in the JSON snapshot — some pages may show 100 while more metadata
          deltas exist. Re-ingest or raise the ingest cap for full scoring.
        </div>
      )}

      {data.freshnessIssuesCapped && (
        <div
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100"
          role="status"
        >
          Freshness (stale) issues are <strong>capped</strong> — some stale mirrors may be missing from the snapshot, so
          scores can look higher than reality. Re-ingest or raise the cap.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Filter path
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. blog/"
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredRows.length} of {rows.length} rows · {locales.length} locales
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80">
              <th
                scope="col"
                className="sticky left-0 z-30 w-[28rem] min-w-[28rem] max-w-[28rem] border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 shadow-[2px_0_6px_-4px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 dark:shadow-[2px_0_6px_-4px_rgba(0,0,0,0.4)]"
              >
                English path
              </th>
              <th
                scope="col"
                className="sticky left-[28rem] z-30 min-w-[3.5rem] border-r border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-600 shadow-[2px_0_6px_-4px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400 dark:shadow-[2px_0_6px_-4px_rgba(0,0,0,0.4)]"
                title="Mean over all locales; missing mirrors count as 0"
              >
                Avg
              </th>
              {locales.map((loc) => (
                <th
                  key={loc}
                  scope="col"
                  className="min-w-[3.5rem] px-1 py-2 text-center font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                  title={`Score for ${loc}`}
                >
                  {loc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((path) => {
              const localeCells = locales.map((loc) =>
                getLocaleCellScore(path, loc, missingSet, metaCounts, staleSet),
              )
              const avg = rowAverageScore(localeCells)
              return (
                <tr key={path} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-[28rem] min-w-[28rem] max-w-[28rem] truncate border-r border-slate-200 bg-white px-3 py-1.5 font-normal shadow-[2px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[2px_0_6px_-4px_rgba(0,0,0,0.35)] dark:group-hover:bg-slate-800/40"
                    title={path}
                  >
                    <a
                      href={englishLiveUrl(path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${liveSiteLinkClassName} block truncate font-mono text-xs text-slate-800 dark:text-slate-200`}
                    >
                      {path}
                    </a>
                  </th>
                  <td
                    className="sticky left-[28rem] z-10 border-r border-slate-200 bg-white px-1 py-1 text-center shadow-[2px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[2px_0_6px_-4px_rgba(0,0,0,0.35)] dark:group-hover:bg-slate-800/40"
                  >
                    {avg == null ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreCellClass(avg, false)}`}
                        title={`Mean over all ${locales.length} locales (missing = 0): ${avg}`}
                      >
                        {avg}
                      </span>
                    )}
                  </td>
                  {locales.map((loc, i) => {
                    const cell = localeCells[i]!
                    const href = localeLiveUrl(loc, path)
                    const tooltip = formatScoreTooltip(cell, loc)
                    if (cell.missing) {
                      return (
                        <td key={loc} className="px-1 py-1 text-center">
                          <span
                            className={`inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreCellClass(null, true)}`}
                            title={tooltip}
                          >
                            —
                          </span>
                        </td>
                      )
                    }
                    return (
                      <td key={loc} className="px-1 py-1 text-center">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${liveSiteLinkClassName} inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums`}
                          title={`${tooltip}\n${href}`}
                          aria-label={`${loc} score ${cell.score}`}
                        >
                          <span className={scoreCellClass(cell.score, false)}>{cell.score}</span>
                        </a>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
