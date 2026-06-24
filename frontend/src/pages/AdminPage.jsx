import { useState } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import TokenCard from '../components/TokenCard.jsx';
import Button from '../components/Button.jsx';
import { IconNext, IconPlus } from '../components/icons.jsx';

// Phase 2 shell: proves the socket layer (live queue, two-tab sync, reconnect).
// The full receptionist flow is built in Phase 3.
export default function AdminPage() {
  const [queue, setQueue] = useState(null);
  const { connected, emit } = useSocket({ onQueueUpdate: setQueue });

  const addSample = () =>
    emit('patient:add', { name: 'Walk-in', category: 'general' });
  const callNext = () => emit('queue:callNext', {});

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-clinic-ink">Reception</h1>
          <p className="text-sm text-clinic-muted">Queue Cure admin</p>
        </div>
        <ConnectionStatus connected={connected} />
      </header>

      <div className="mb-6 flex gap-2">
        <Button variant="primary" size="lg" onClick={callNext}>
          <IconNext className="h-5 w-5" />
          Call Next
        </Button>
        <Button variant="secondary" onClick={addSample}>
          <IconPlus className="h-5 w-5" />
          Add sample patient
        </Button>
      </div>

      {queue?.active && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-clinic-muted">
            Now serving
          </p>
          <TokenCard patient={queue.active} />
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-clinic-muted">
        Waiting ({queue?.waiting?.length ?? 0})
      </p>
      <div className="flex flex-col gap-2">
        {queue?.waiting?.map((p) => (
          <TokenCard key={p.tokenId} patient={p} />
        ))}
        {queue && queue.waiting.length === 0 && (
          <p className="rounded-lg border border-dashed border-clinic-line px-4 py-6 text-center text-sm text-clinic-muted">
            No patients waiting
          </p>
        )}
      </div>
    </div>
  );
}
