import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Button from './Button.jsx';
import { IconLink } from './icons.jsx';

// Shown right after a patient is added: a scannable QR encoding the patient's
// tracking URL plus the raw link as a fallback for manual entry.
export default function QrDialog({ patient, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!patient) return;
    QRCode.toDataURL(patient.url, { width: 240, margin: 1 }).then(setDataUrl);
  }, [patient]);

  if (!patient) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(patient.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-clinic-surface p-6 text-center shadow-xl">
        <p className="text-sm text-clinic-muted">Token added</p>
        <p className="text-4xl font-bold tabular-nums text-teal-600">
          {patient.tokenNumber}
        </p>
        <p className="mt-1 font-medium text-clinic-ink">{patient.name}</p>

        <div className="mt-4 flex justify-center">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code for token ${patient.tokenNumber}`}
              className="rounded-lg border border-clinic-line"
            />
          ) : (
            <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-clinic-bg" />
          )}
        </div>

        <p className="mt-4 text-xs text-clinic-muted">
          Patient scans this to track their place in line.
        </p>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={copy}>
            <IconLink className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
