import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchParitySnapshot } from '../api/parity'
import { getNextParityIngestUtc } from '../lib/parityIngestSchedule'
import {
  formatCountdown,
  formatNextIngestInstantAmsterdam,
  formatSnapshotInstantAmsterdam,
} from '../lib/snapshotTimestamp'

export function SnapshotStatus() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = Date.now()
  const nextUtc = getNextParityIngestUtc(new Date(now))
  const msUntil = nextUtc.getTime() - now

  if (q.isPending) {
    return (
      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
        <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Snapshot
        </div>
        <div className="tabular-nums">Loading…</div>
      </div>
    )
  }

  if (q.isError) {
    return (
      <div className="text-right text-xs text-red-600 dark:text-red-400">
        <div className="text-[0.65rem] font-semibold tracking-wide uppercase">Snapshot</div>
        <div>Could not load</div>
      </div>
    )
  }

  return (
    <div className="text-right text-xs leading-tight">
      <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Snapshot
      </div>
      <div className="tabular-nums text-sm font-medium text-slate-800 dark:text-slate-100">
        {formatSnapshotInstantAmsterdam(q.data.generatedAt)}
      </div>
      <div className="mt-1.5 text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Next sync
      </div>
      <div className="tabular-nums text-slate-700 dark:text-slate-300">
        <span className="font-medium">{formatCountdown(msUntil)}</span>
        <span className="text-slate-500 dark:text-slate-500"> · </span>
        <span title="Scheduled GitHub Actions run (UTC); deploy may follow shortly after.">
          {formatNextIngestInstantAmsterdam(nextUtc)}
        </span>
      </div>
    </div>
  )
}
