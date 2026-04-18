import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchParitySnapshot } from '../api/parity'
import {
  downloadTextFile,
  filterIssues,
  getAllIssues,
  issuesToCsv,
  metadataTotal,
  type IssueCategory,
} from '../lib/issues'
import { isMetadataIssue, isPathIssue, isSitemapIssue } from '../types/parity'

export function ParityIssuesPage() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  const [localeFilter, setLocaleFilter] = useState<string>('')
  const [category, setCategory] = useState<IssueCategory>('all')
  const [pathType, setPathType] = useState<'' | 'missing' | 'extra'>('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!q.data) return []
    return filterIssues(q.data, category, localeFilter, search, pathType)
  }, [q.data, category, localeFilter, search, pathType])

  const exportCsv = () => {
    if (!q.data) return
    const rows =
      category === 'all' && !localeFilter && !search && !pathType
        ? getAllIssues(q.data)
        : filtered
    const csv = issuesToCsv(rows)
    const stamp = new Date(q.data.generatedAt).toISOString().slice(0, 10)
    downloadTextFile(`parity-issues-${stamp}.csv`, csv, 'text/csv;charset=utf-8')
  }

  if (q.isPending) {
    return <p className="text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return <p className="text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
  }

  const data = q.data
  const totalAll = getAllIssues(data).length
  const metaTotal = metadataTotal(data)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parity issues</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <strong>Path:</strong> missing or extra HTML mirrors. <strong>Metadata:</strong> different title, description,
          or main <code className="rounded bg-black/10 px-1">h1</code> vs English for the same file pair.{' '}
          <strong>Sitemap:</strong> URL in committed <code className="rounded bg-black/10 px-1">sitemap.xml</code> with
          no matching HTML file. With a <strong>locale</strong> filter, sitemap rows are hidden (they are not
          per-locale).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as IssueCategory)
              if (e.target.value !== 'all' && e.target.value !== 'path') setPathType('')
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All</option>
            <option value="path">Path only</option>
            <option value="metadata">Metadata only</option>
            <option value="sitemap">Sitemap only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Locale
          <select
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All</option>
            {data.nonDefaultLocales.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {(category === 'path' || category === 'all') && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            Path type
            <select
              value={pathType}
              onChange={(e) => setPathType(e.target.value as '' | 'missing' | 'extra')}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Both</option>
              <option value="missing">missing</option>
              <option value="extra">extra</option>
            </select>
          </label>
        )}
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Path / URL contains
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. sudoku-strategies"
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Export CSV
        </button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing{' '}
        <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{filtered.length}</span> rows
        {category === 'all' && !localeFilter && !search && !pathType ? (
          <>
            {' '}
            (of <span className="tabular-nums">{totalAll}</span> loaded; metadata mismatches total{' '}
            <span className="tabular-nums">{metaTotal}</span>
            {data.metadataIssuesCapped ? ', sample capped in JSON' : ''})
          </>
        ) : null}
        .
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Locale</th>
              <th className="px-3 py-2 font-medium">Path / URL</th>
              <th className="px-3 py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 5000).map((issue, idx) => {
              if (isPathIssue(issue)) {
                return (
                  <tr
                    key={`p-${issue.type}-${issue.locale}-${issue.path}-${idx}`}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={
                          issue.type === 'missing'
                            ? 'rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-900 dark:bg-red-950/60 dark:text-red-200'
                            : 'rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                        }
                      >
                        {issue.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{issue.locale}</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">{issue.path}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">—</td>
                  </tr>
                )
              }
              if (isMetadataIssue(issue)) {
                const to = `/diff?${new URLSearchParams({ locale: issue.locale, path: issue.path }).toString()}`
                return (
                  <tr
                    key={`m-${issue.locale}-${issue.path}-${issue.field}-${idx}`}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950/60 dark:text-violet-200">
                        metadata
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{issue.locale}</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">
                      <Link to={to} className="text-violet-800 underline decoration-violet-300 underline-offset-2 dark:text-violet-300">
                        {issue.path}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium">{issue.field}</span>:{' '}
                      <span className="line-clamp-2" title={issue.localeValue}>
                        {issue.localeValue.slice(0, 120)}
                        {issue.localeValue.length > 120 ? '…' : ''}
                      </span>
                    </td>
                  </tr>
                )
              }
              if (isSitemapIssue(issue)) {
                return (
                  <tr
                    key={`s-${issue.loc}-${idx}`}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                        sitemap
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">—</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">{issue.urlPath}</td>
                    <td className="px-3 py-2 text-xs break-all text-slate-500">{issue.loc}</td>
                  </tr>
                )
              }
              return null
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 5000 ? (
        <p className="text-xs text-slate-500">Showing first 5000 rows. Narrow filters or export CSV for the full filtered set.</p>
      ) : null}
    </div>
  )
}
