import { useEffect, useState } from 'react'
import { getNextParityIngestUtc } from '../lib/parityIngestSchedule'
import {
  formatCountdown,
  formatNextIngestInstantAmsterdam,
  formatSnapshotInstantAmsterdam,
} from '../lib/snapshotTimestamp'

type Props = {
  generatedAt: string
}

/** Snapshot time + next scheduled ingest (dashboard card; `<dt>` provides the “Snapshot” label). */
export function SnapshotScheduleDetails({ generatedAt }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = Date.now()
  const nextUtc = getNextParityIngestUtc(new Date(now))
  const msUntil = nextUtc.getTime() - now

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {formatSnapshotInstantAmsterdam(generatedAt)}
      </p>
      <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
        <div className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Next sync
        </div>
        <div className="mt-1 tabular-nums text-xs text-slate-700 dark:text-slate-300">
          <span className="font-medium">{formatCountdown(msUntil)}</span>
          <span className="text-slate-500 dark:text-slate-500"> · </span>
          <span title="Scheduled GitHub Actions run (UTC); deploy may follow shortly after.">
            {formatNextIngestInstantAmsterdam(nextUtc)}
          </span>
        </div>
      </div>
    </div>
  )
}
