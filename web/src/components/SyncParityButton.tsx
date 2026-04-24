import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { PARITY_INGEST_WORKFLOW_URL, triggerParityIngest } from '../api/sync'
import { smallPrimaryButtonClassName } from '../lib/formControls'

export function SyncParityButton() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const onClick = useCallback(async () => {
    setNotice(null)
    setBusy(true)
    try {
      const r = await triggerParityIngest()
      if (r.mode === 'api') {
        setNotice({
          kind: 'ok',
          text: 'Ingest started on GitHub. This site will show new data after the workflow commits and Vercel deploys.',
        })
        void qc.invalidateQueries({ queryKey: ['parity-snapshot'] })
      } else {
        setNotice({
          kind: 'ok',
          text: 'Opened GitHub Actions — choose “Run workflow”, then wait for deploy.',
        })
      }
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }, [qc])

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={smallPrimaryButtonClassName}
      >
        {busy ? 'Starting…' : 'Sync snapshot now'}
      </button>
      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Runs the parity ingest on GitHub (read-only clone of the public site repo).{' '}
        <a
          href={PARITY_INGEST_WORKFLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-700 underline-offset-2 [@media(hover:hover)]:hover:underline dark:text-slate-300"
        >
          Open workflow
        </a>
        {import.meta.env.DEV ? (
          <>
            {' '}
            · Local data:{' '}
            <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">npm run ingest</code>
          </>
        ) : null}
      </p>
      {notice ? (
        <p
          className={
            notice.kind === 'ok'
              ? 'text-[11px] leading-snug text-emerald-800 dark:text-emerald-300'
              : 'text-[11px] leading-snug text-red-700 dark:text-red-400'
          }
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}
