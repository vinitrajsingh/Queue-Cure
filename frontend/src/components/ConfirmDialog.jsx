import Button from './Button.jsx';

// Used ONLY for destructive actions (per project rules). Call Next and Undo are
// instant and must never be gated by this dialog.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-clinic-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-clinic-ink">{title}</h2>
        {message && <p className="mt-2 text-sm text-clinic-muted">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
