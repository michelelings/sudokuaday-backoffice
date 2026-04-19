/** Manual ingest workflow (GitHub Actions); opens UI or calls Vercel API when configured. */
export const PARITY_INGEST_WORKFLOW_URL =
  'https://github.com/michelelings/sudokuaday-backoffice/actions/workflows/ingest-parity.yml'

export type TriggerParityIngestResult = { mode: 'api' } | { mode: 'github' }

/**
 * If `VITE_TRIGGER_SYNC_SECRET` is set (prod), POSTs to `/api/trigger-ingest`.
 * Otherwise opens the GitHub Actions workflow page (local dev or when API is not wired).
 */
export async function triggerParityIngest(): Promise<TriggerParityIngestResult> {
  const secret = import.meta.env.VITE_TRIGGER_SYNC_SECRET

  if (!secret) {
    window.open(PARITY_INGEST_WORKFLOW_URL, '_blank', 'noopener,noreferrer')
    return { mode: 'github' }
  }

  const res = await fetch('/api/trigger-ingest', {
    method: 'POST',
    headers: { 'x-trigger-secret': secret },
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = (await res.json()) as { error?: string; detail?: string }
      if (j.error) msg = j.detail ? `${j.error}: ${j.detail}` : j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  return { mode: 'api' }
}
