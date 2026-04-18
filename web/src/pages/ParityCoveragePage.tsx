import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchParitySnapshot } from '../api/parity'
import { buildMissingMirrorSet, getEnglishPathRows } from '../lib/coverageMatrix'

export function ParityCoveragePage() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  const [search, setSearch] = useState('')

  const missingSet = useMemo(() => (q.data ? buildMissingMirrorSet(q.data) : new Set<string>()), [q.data])

  const { rows, partial } = useMemo(
    () => (q.data ? getEnglishPathRows(q.data) : { rows: [] as string[], partial: false }),
    [q.data],
  )

  const filteredRows = useMemo(() => {
    const qv = search.trim().toLowerCase()
    if (!qv) return rows
    return rows.filter((p) => p.toLowerCase().includes(qv))
  }, [rows, search])

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
          Each row is an English HTML path (repo root). Columns are locales:{' '}
          <span className="text-green-700 dark:text-green-400">Present</span> means{' '}
          <code className="rounded bg-black/10 px-1">{`{locale}/`}</code>
          mirrors that path; <span className="text-red-700 dark:text-red-400">Missing</span> means no file at{' '}
          <code className="rounded bg-black/10 px-1">{`{locale}/…`}</code>. Open a{' '}
          <Link to="/parity" className="font-medium text-slate-900 underline dark:text-slate-100">
            Parity issues
          </Link>{' '}
          row for metadata or stale details.
        </p>
      </div>

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
                className="sticky left-0 z-20 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
              >
                English path
              </th>
              {locales.map((loc) => (
                <th
                  key={loc}
                  scope="col"
                  className="px-2 py-2 text-center font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                  title={loc}
                >
                  {loc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((path) => (
              <tr key={path} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[28rem] truncate border-r border-slate-200 bg-white px-3 py-1.5 font-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  title={path}
                >
                  {path}
                </th>
                {locales.map((loc) => {
                  const isMissing = missingSet.has(`${loc}\0${path}`)
                  return (
                    <td key={loc} className="px-1 py-1 text-center">
                      <span
                        className={
                          isMissing
                            ? 'inline-flex min-w-[2rem] justify-center rounded bg-red-100 px-1 py-0.5 font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200'
                            : 'inline-flex min-w-[2rem] justify-center rounded bg-emerald-100 px-1 py-0.5 font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                        }
                        aria-label={isMissing ? `Missing in ${loc}` : `Present in ${loc}`}
                      >
                        {isMissing ? '—' : '✓'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
