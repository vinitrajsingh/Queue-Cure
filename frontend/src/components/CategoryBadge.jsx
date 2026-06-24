import { CATEGORY_LABELS } from '../lib/format.js';

const STYLES = {
  general: 'bg-teal-50 text-teal-700',
  followup: 'bg-clinic-line text-clinic-muted',
  report: 'bg-warn-100 text-warn-600',
  emergency: 'bg-alert-50 text-alert-600'
};

export default function CategoryBadge({ category, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[category] || STYLES.general}`}
    >
      {label || CATEGORY_LABELS[category] || category}
    </span>
  );
}
