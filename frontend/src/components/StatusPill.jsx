const STYLES = {
  waiting: 'bg-warn-100 text-warn-600',
  active: 'bg-teal-100 text-teal-700',
  done: 'bg-clinic-line text-clinic-muted',
  absent: 'bg-alert-50 text-alert-600'
};

const LABELS = {
  waiting: 'Waiting',
  active: 'In consult',
  done: 'Done',
  absent: 'No-show'
};

export default function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] || STYLES.waiting}`}
    >
      {LABELS[status] || status}
    </span>
  );
}
