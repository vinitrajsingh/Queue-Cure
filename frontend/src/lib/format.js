export function formatDuration(seconds) {
  if (seconds == null) return '--';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}

export function formatRange(low, high) {
  return `${Math.round(low / 60)} to ${Math.round(high / 60)} min`;
}

export const CATEGORY_LABELS = {
  general: 'General',
  followup: 'Follow-up',
  report: 'Report',
  emergency: 'Emergency'
};
