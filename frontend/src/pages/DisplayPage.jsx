import { useState } from 'react';
import { useSocket } from '../hooks/useSocket.js';

// Phase 2 shell: live now-serving number. TV-optimized layout is built in Phase 4.
export default function DisplayPage() {
  const [queue, setQueue] = useState(null);
  useSocket({ onQueueUpdate: setQueue });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-clinic-ink text-white">
      <p className="text-2xl uppercase tracking-widest text-teal-200">Now serving</p>
      <p className="text-[28vw] font-extrabold leading-none tabular-nums">
        {queue?.active ? queue.active.tokenNumber : '--'}
      </p>
    </div>
  );
}
