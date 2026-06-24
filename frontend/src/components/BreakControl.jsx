import { useState } from 'react';
import Button from './Button.jsx';
import Countdown from './Countdown.jsx';
import { IconPause } from './icons.jsx';

const PRESETS = [5, 10, 15];

export default function BreakControl({ paused, breakRemaining, onPause, onResume }) {
  const [custom, setCustom] = useState('');

  if (paused) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-warn-500/40 bg-warn-100/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <IconPause className="h-5 w-5 text-warn-600" />
          <div>
            <p className="text-sm font-semibold text-warn-600">On break</p>
            <p className="text-xs text-clinic-muted">
              Resuming in <Countdown seconds={breakRemaining} className="font-semibold" />
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={onResume}>
          Resume
        </Button>
      </div>
    );
  }

  const startCustom = () => {
    const mins = parseInt(custom, 10);
    if (!Number.isFinite(mins) || mins <= 0) return;
    onPause(mins * 60);
    setCustom('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-clinic-line bg-clinic-surface px-4 py-3">
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-ink">
        <IconPause className="h-4 w-4 text-clinic-muted" />
        Doctor break
      </span>
      {PRESETS.map((m) => (
        <Button key={m} variant="secondary" size="sm" onClick={() => onPause(m * 60)}>
          {m} min
        </Button>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="min"
          className="w-16 rounded-lg border border-clinic-line bg-white px-2 py-1 text-sm outline-none focus:border-teal-300"
        />
        <Button variant="secondary" size="sm" onClick={startCustom} disabled={!custom}>
          Start
        </Button>
      </div>
    </div>
  );
}
