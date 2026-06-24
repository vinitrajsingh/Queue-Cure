import { useEffect, useState } from 'react';

// Counts down locally from a server-provided remaining-seconds value, resyncing
// whenever the server sends a fresh number. Local ticking keeps the display
// smooth between broadcasts without inventing time the server did not report.
export default function Countdown({ seconds, className = '', onZero }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onZero && onZero();
      return undefined;
    }
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onZero]);

  const mins = Math.floor(Math.max(0, remaining) / 60);
  const secs = Math.max(0, remaining) % 60;

  return (
    <span className={`tabular-nums ${className}`}>
      {mins}:{String(secs).padStart(2, '0')}
    </span>
  );
}
