import { useState, useEffect } from 'react';
import Button from './Button.jsx';

export default function UrgentDialog({ patient, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [patient]);

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-clinic-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-clinic-ink">
          Mark token {patient.tokenNumber} urgent
        </h2>
        <p className="mt-1 text-sm text-clinic-muted">{patient.name}</p>
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-clinic-muted">
            Reason
          </span>
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. chest pain"
            className="rounded-lg border border-clinic-line bg-white px-3 py-2 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim())}>
            Mark urgent
          </Button>
        </div>
      </div>
    </div>
  );
}
