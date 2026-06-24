import CategoryBadge from './CategoryBadge.jsx';
import StatusPill from './StatusPill.jsx';

const STATUS_ACCENT = {
  waiting: 'border-l-warn-500',
  active: 'border-l-teal-500',
  done: 'border-l-clinic-line',
  absent: 'border-l-alert-500'
};

export default function TokenCard({ patient, actions = null, urgent = false }) {
  const accent = STATUS_ACCENT[patient.status] || STATUS_ACCENT.waiting;
  const urgentRing = urgent || patient.priority === 1
    ? 'ring-2 ring-alert-500/70'
    : '';

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border border-clinic-line border-l-4 bg-clinic-surface px-4 py-3 ${accent} ${urgentRing}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-clinic-bg text-xl font-bold tabular-nums text-clinic-ink">
        {patient.tokenNumber}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-clinic-ink">{patient.name}</span>
          {(urgent || patient.priority === 1) && (
            <span className="text-xs font-bold uppercase tracking-wide text-alert-600">
              Urgent
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <CategoryBadge category={patient.category} />
          <StatusPill status={patient.status} />
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
