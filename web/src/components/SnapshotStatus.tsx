import { useQuery } from '@tanstack/react-query'
import { fetchParitySnapshot } from '../api/parity'
import { SnapshotScheduleDetails } from './SnapshotScheduleDetails'

export function SnapshotStatus() {
  const q = useQuery({
    queryKey: ['parity-snapshot'],
    queryFn: fetchParitySnapshot,
  })

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

  return <SnapshotScheduleDetails generatedAt={q.data.generatedAt} variant="header" />
}
