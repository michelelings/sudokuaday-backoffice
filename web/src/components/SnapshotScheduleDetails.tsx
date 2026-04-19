import { useEffect, useState } from 'react'
import { getNextParityIngestUtc } from '../lib/parityIngestSchedule'
import {
  formatCountdown,
  formatNextIngestInstantAmsterdam,
  formatSnapshotInstantAmsterdam,
} from '../lib/snapshotTimestamp'

type Props = {
  generatedAt: string
  /** `header`: full block including “Snapshot” label (nav). `dashboard`: time + next sync only (card already has dt). */
  variant?: 'header' | 'dashboard'
}

export function SnapshotScheduleDetails({ generatedAt, variant = 'header' }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = Date.now()
  const nextUtc = getNextParityIngestUtc(new Date(now))
  const msUntil = nextUtc.getTime() - now

  const nextSyncBlock = (
    <>
      <div
        className={
          variant === 'header'
            ? 'mt-1.5 text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'
            : 'text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400'
        }
      >
        Next sync
      </div>
      <div
        className={
          variant === 'header'
            ? 'tabular-nums text-slate-700 dark:text-slate-300'
            : 'mt-1 tabular-nums text-xs text-slate-700 dark:text-slate-300'
        }
      >
        <span className="font-medium">{formatCountdown(msUntil)}</span>
        <span className="text-slate-500 dark:text-slate-500"> · </span>
        <span title="Scheduled GitHub Actions run (UTC); deploy may follow shortly after.">
          {formatNextIngestInstantAmsterdam(nextUtc)}
        </span>
      </div>
    </>
  )

  if (variant === 'dashboard') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {formatSnapshotInstantAmsterdam(generatedAt)}
        </p>
        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">{nextSyncBlock}</div>
      </div>
    )
  }

  return (
    <div className="text-right text-xs leading-tight">
      <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Snapshot
      </div>
      <div className="tabular-nums text-sm font-medium text-slate-800 dark:text-slate-100">
        {formatSnapshotInstantAmsterdam(generatedAt)}
      </div>
      {nextSyncBlock}
    </div>
  )
}
