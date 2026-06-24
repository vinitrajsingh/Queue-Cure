import { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import TokenCard from '../components/TokenCard.jsx';
import Button from '../components/Button.jsx';
import StatBar from '../components/StatBar.jsx';
import WaitEstimate from '../components/WaitEstimate.jsx';
import AddPatientForm from '../components/AddPatientForm.jsx';
import BreakControl from '../components/BreakControl.jsx';
import QrDialog from '../components/QrDialog.jsx';
import UrgentDialog from '../components/UrgentDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { IconNext, IconUndo, IconSkip, IconAlert } from '../components/icons.jsx';

const UNDO_WINDOW_MS = 15000;

function longestWaitSeconds(waiting) {
  return waiting.reduce((max, p) => {
    const w = p.wait?.estimatedWait ?? 0;
    return w > max ? w : max;
  }, 0);
}

export default function AdminPage() {
  const [queue, setQueue] = useState(null);
  const [newPatient, setNewPatient] = useState(null);
  const [urgentTarget, setUrgentTarget] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [undoUntil, setUndoUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const { connected, emit } = useSocket({ onQueueUpdate: setQueue });

  const callBusy = useRef(false);

  const undoActive = undoUntil > now;

  useEffect(() => {
    if (!undoActive) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [undoActive]);

  const callNext = async () => {
    if (callBusy.current) return;
    callBusy.current = true;
    const res = await emit('queue:callNext', {});
    callBusy.current = false;
    if (res?.ok && res.active) setUndoUntil(Date.now() + UNDO_WINDOW_MS);
  };

  const undo = async () => {
    await emit('queue:undo', {});
    setUndoUntil(0);
  };

  const addPatient = async ({ name, category }) => {
    const res = await emit('patient:add', { name, category });
    if (res?.ok) {
      setNewPatient({ name, tokenNumber: res.tokenNumber, url: res.url });
    }
  };

  const skip = () => emit('queue:skip', {});
  const markUrgent = async (reason) => {
    await emit('queue:markUrgent', { tokenId: urgentTarget.tokenId, urgentReason: reason });
    setUrgentTarget(null);
  };
  const pause = (durationSeconds) => emit('queue:pause', { durationSeconds });
  const resume = () => emit('queue:resume', {});
  const reset = async () => {
    await emit('queue:reset', {});
    setConfirmReset(false);
    setUndoUntil(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const el = document.activeElement;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
      if (typing) return;
      e.preventDefault();
      callNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const waiting = queue?.waiting ?? [];
  const paused = queue?.break?.isPaused;
  const longest = useMemo(() => longestWaitSeconds(waiting), [waiting]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-clinic-ink">Reception</h1>
          <p className="text-sm text-clinic-muted">Queue Cure admin</p>
        </div>
        <ConnectionStatus connected={connected} />
      </header>

      <div className="mb-5">
        <StatBar stats={queue?.stats} inQueue={waiting.length} longestWait={longest} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="lg" onClick={callNext} disabled={paused}>
          <IconNext className="h-5 w-5" />
          Call Next
        </Button>
        <Button variant="secondary" size="lg" onClick={undo} disabled={!undoActive}>
          <IconUndo className="h-5 w-5" />
          Undo{undoActive ? ` (${Math.ceil((undoUntil - now) / 1000)}s)` : ''}
        </Button>
        <span className="ml-1 text-xs text-clinic-muted">
          Press Space to call next
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            Reset queue
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <BreakControl
          paused={paused}
          breakRemaining={queue?.break?.breakRemaining ?? 0}
          onPause={pause}
          onResume={resume}
        />
      </div>

      <div className="mb-6">
        <AddPatientForm onAdd={addPatient} />
      </div>

      {queue?.active && (
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-clinic-muted">
            Now serving
          </p>
          <TokenCard
            patient={queue.active}
            actions={
              <Button variant="secondary" size="sm" onClick={skip}>
                <IconSkip className="h-4 w-4" />
                No-show
              </Button>
            }
          />
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-clinic-muted">
        Waiting ({waiting.length})
      </p>
      <div className="flex flex-col gap-2">
        {waiting.map((p) => (
          <TokenCard
            key={p.tokenId}
            patient={p}
            actions={
              <>
                <div className="mr-2 hidden sm:block">
                  <WaitEstimate wait={p.wait} compact />
                </div>
                {p.priority !== 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setUrgentTarget(p)}>
                    <IconAlert className="h-4 w-4 text-alert-500" />
                    Urgent
                  </Button>
                )}
              </>
            }
          />
        ))}
        {queue && waiting.length === 0 && (
          <p className="rounded-lg border border-dashed border-clinic-line px-4 py-6 text-center text-sm text-clinic-muted">
            No patients waiting
          </p>
        )}
      </div>

      <QrDialog patient={newPatient} onClose={() => setNewPatient(null)} />
      <UrgentDialog
        patient={urgentTarget}
        onConfirm={markUrgent}
        onCancel={() => setUrgentTarget(null)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset the entire queue?"
        message="This removes all patients and clears today's stats. This cannot be undone."
        confirmLabel="Reset queue"
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
