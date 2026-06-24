import { useState } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import BreakScreen from '../components/BreakScreen.jsx';
import { CATEGORY_LABELS } from '../lib/format.js';

const NEXT_COUNT = 5;

function NextToken({ patient }) {
  const urgent = patient.priority === 1;
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-[1.6vw] py-[1.4vh] ${
        urgent ? 'border-alert-500 bg-alert-500/10' : 'border-white/15 bg-white/5'
      }`}
    >
      <span className="text-[5vw] font-bold leading-none tabular-nums text-white">
        {patient.tokenNumber}
      </span>
      <span className="text-[1.6vw] font-medium uppercase tracking-wide text-teal-200">
        {urgent ? 'Urgent' : CATEGORY_LABELS[patient.category]}
      </span>
    </div>
  );
}

export default function DisplayPage() {
  const [queue, setQueue] = useState(null);
  useSocket({ onQueueUpdate: setQueue });

  const paused = queue?.break?.isPaused;

  if (paused) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <BreakScreen
          seconds={queue.break.breakRemaining}
          scale="tv"
          message="The doctor is on a short break."
          resumingLabel="Resuming in"
        />
      </div>
    );
  }

  const active = queue?.active;
  const next = (queue?.waiting ?? []).slice(0, NEXT_COUNT);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-clinic-ink text-white">
      <section className="flex flex-[1.6] flex-col items-center justify-center border-r border-white/10 px-[3vw]">
        <p className="text-[2.4vw] font-semibold uppercase tracking-[0.2em] text-teal-300">
          Now serving
        </p>
        {active ? (
          <>
            <p className="text-[26vw] font-extrabold leading-none tabular-nums">
              {active.tokenNumber}
            </p>
            <p className="text-[2.6vw] font-medium text-white/80">{active.name}</p>
            {active.priority === 1 && (
              <p className="mt-[1vh] text-[1.8vw] font-bold uppercase tracking-wide text-alert-500">
                Urgent
              </p>
            )}
          </>
        ) : (
          <p className="mt-[2vh] text-[6vw] font-bold text-white/40">--</p>
        )}
      </section>

      <aside className="flex flex-1 flex-col justify-center gap-[1.6vh] px-[2.4vw]">
        <p className="text-[2vw] font-semibold uppercase tracking-[0.2em] text-teal-300">
          Next
        </p>
        {next.length > 0 ? (
          next.map((p) => <NextToken key={p.tokenId} patient={p} />)
        ) : (
          <p className="text-[2vw] text-white/40">No patients waiting</p>
        )}
      </aside>
    </div>
  );
}
