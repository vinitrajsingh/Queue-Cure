import { formatRange } from '../lib/format.js';

const CONFIDENCE_STYLES = {
  Calibrating: 'bg-warn-100 text-warn-600',
  Medium: 'bg-teal-50 text-teal-700',
  High: 'bg-teal-100 text-teal-700'
};

// Renders an estimated wait as a range plus a confidence label. Shared by the
// patient view and the admin row detail. wait is the per-patient object from the
// server: { estimatedWait, rangeLow, rangeHigh, confidence }.
export default function WaitEstimate({ wait, compact = false }) {
  if (!wait) {
    return <span className="text-sm text-clinic-muted">--</span>;
  }
  const confidenceStyle = CONFIDENCE_STYLES[wait.confidence] || CONFIDENCE_STYLES.Medium;

  if (compact) {
    return (
      <span className="text-sm font-medium tabular-nums text-clinic-ink">
        {formatRange(wait.rangeLow, wait.rangeHigh)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold tabular-nums text-clinic-ink">
        {formatRange(wait.rangeLow, wait.rangeHigh)}
      </span>
      <span
        className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold ${confidenceStyle}`}
      >
        {wait.confidence} confidence
      </span>
    </div>
  );
}
