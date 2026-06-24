import { formatDuration } from '../lib/format.js';

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase tracking-wide text-clinic-muted">
        {label}
      </span>
      <span className="mt-0.5 text-2xl font-bold tabular-nums text-clinic-ink">
        {value}
      </span>
    </div>
  );
}

// Live clinic stats. inQueue and longestWait are derived on the client from the
// current waiting list; avgConsult comes from recorded history via the server.
export default function StatBar({ stats, inQueue, longestWait }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-clinic-line bg-clinic-surface px-5 py-4">
      <Stat label="Avg consult today" value={formatDuration(stats?.avgConsult)} />
      <Stat label="In queue" value={inQueue} />
      <Stat label="Longest wait" value={formatDuration(longestWait)} />
    </div>
  );
}
