import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Button from './Button.jsx';
import { IconLink } from './icons.jsx';

function requestFullscreen(url) {
  const win = window.open(url, '_blank', 'noopener');
  if (win) win.focus();
}

const OPTIONS = [
  {
    title: 'Smart TV browser',
    body: 'Open the web browser on the TV and go to the display link above, or scan the QR with a phone and send it to the TV.'
  },
  {
    title: 'Chromecast / cast a tab',
    body: 'Open the display link in Chrome on a laptop, then use the Chrome menu and choose Cast, then Cast tab, and pick your TV.'
  },
  {
    title: 'HDMI cable',
    body: 'Connect the laptop to the TV with an HDMI cable, open the display link, and press F11 for full screen.'
  },
  {
    title: 'Fire TV or streaming stick',
    body: 'Install a browser like Silk or Firefox from the device store, then open the display link.'
  }
];

export default function CastDialog({ open, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const displayUrl = `${window.location.origin}/display`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(displayUrl, { width: 200, margin: 1 }).then(setDataUrl);
  }, [open, displayUrl]);

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/40 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-clinic-surface p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-clinic-ink">Show on TV</h2>
            <p className="mt-1 text-sm text-clinic-muted">
              Open the waiting hall display on any screen. It updates live.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          {dataUrl && (
            <img
              src={dataUrl}
              alt="QR code for the display screen"
              className="mx-auto rounded-lg border border-clinic-line sm:mx-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-muted">
              Display link
            </p>
            <p className="mt-1 break-all rounded-lg bg-clinic-bg px-3 py-2 text-sm font-medium text-clinic-ink">
              {displayUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={copy}>
                <IconLink className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => requestFullscreen(displayUrl)}
              >
                Open display
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <div key={o.title} className="rounded-lg border border-clinic-line p-3">
              <p className="text-sm font-semibold text-clinic-ink">{o.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-clinic-muted">{o.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
