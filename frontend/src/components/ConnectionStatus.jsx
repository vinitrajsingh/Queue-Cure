export default function ConnectionStatus({ connected }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-clinic-muted">
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-teal-500' : 'bg-alert-500'}`}
      />
      {connected ? 'Live' : 'Reconnecting'}
    </span>
  );
}
