import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchParitySnapshot } from '../api/parity'
import type { ParityIssueType } from '../types/parity'

export function ParityIssuesPage() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  const [localeFilter, setLocaleFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<ParityIssueType | ''>('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!q.data) return []
    let rows = q.data.issues
    if (localeFilter) rows = rows.filter((i) => i.locale === localeFilter)
    if (typeFilter) rows = rows.filter((i) => i.type === typeFilter)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      rows = rows.filter((i) => i.path.toLowerCase().includes(s))
    }
    return rows
  }, [q.data, localeFilter, typeFilter, search])

  if (q.isPending) {
    return <p className="text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return (
      <p className="text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
    )
  }

  const data = q.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parity issues</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Missing = English path has no <code className="rounded bg-black/10 px-1">{`{locale}/`}</code> mirror. Extra =
          locale-only HTML with no English counterpart.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ParityIssueType | '')}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All</option>
            <option value="missing">missing</option>
            <option value="extra">extra</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Path contains
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. sudoku-strategies"
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{filtered.length}</span>{' '}
        of <span className="tabular-nums">{data.issues.length}</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Locale</th>
              <th className="px-3 py-2 font-medium">Path</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 5000).map((issue, idx) => (
              <tr
                key={`${issue.type}-${issue.locale}-${issue.path}-${idx}`}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 5000 ? (
        <p className="text-xs text-slate-500">Showing first 5000 rows. Narrow filters to export or inspect the rest.</p>
      ) : null}
    </div>
  )
}
