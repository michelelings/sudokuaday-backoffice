import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchParitySnapshot } from '../api/parity'

export function DiffPage() {
  const [sp] = useSearchParams()
  const locale = sp.get('locale') ?? ''
  const filePath = sp.get('path') ?? ''

  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

  if (q.isPending) {
    return <p className="text-slate-600 dark:text-slate-400">Loading…</p>
  }

  if (q.isError) {
    return <p className="text-red-700 dark:text-red-400">{(q.error as Error).message}</p>
  }

  if (!locale || !filePath) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Metadata diff</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Open this page from a <Link to="/parity" className="underline">parity issue</Link> row (metadata link), or add{' '}
          <code className="rounded bg-black/10 px-1">?locale=de&amp;path=benefits-of-sudoku.html</code> to the URL.
        </p>
      </div>
    )
  }

  const rows =
    q.data.metadataIssues?.filter((i) => i.locale === locale && i.path === filePath) ?? []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">
          <Link to="/parity" className="font-medium text-slate-800 underline dark:text-slate-200">
            ← Parity issues
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Metadata diff</h1>
        <p className="mt-1 font-mono text-sm text-slate-600 dark:text-slate-400">
          <span className="text-slate-500">locale:</span> {locale}{' '}
          <span className="text-slate-500">path:</span> {filePath}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No metadata mismatches for this pair appear in the loaded snapshot (values may match, the page may be missing
          in that locale, or this row was outside the stored sample cap). Regenerate with{' '}
          <code className="rounded bg-black/10 px-1">npm run ingest</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">English</th>
                <th className="px-3 py-2 font-medium">{locale}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.field} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-3 py-3 align-top font-medium capitalize text-slate-700 dark:text-slate-300">
                    {r.field}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {r.enValue || '—'}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {r.localeValue || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
