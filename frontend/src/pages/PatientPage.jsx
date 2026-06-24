import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';

// Phase 2 shell: live personal view. Multi-language and full UI built in Phase 5.
export default function PatientPage() {
  const { tokenId } = useParams();
  const [me, setMe] = useState(null);
  useSocket({ tokenId, onPatientUpdate: setMe });

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <p className="text-sm uppercase tracking-wide text-clinic-muted">Your token</p>
      <p className="text-7xl font-extrabold tabular-nums text-teal-600">
        {me ? me.tokenNumber : '--'}
      </p>
      <div className="mt-6 rounded-lg border border-clinic-line bg-clinic-surface p-4">
        <p className="text-sm text-clinic-muted">Now serving</p>
        <p className="text-3xl font-bold tabular-nums text-clinic-ink">
          {me?.nowServing ?? '--'}
        </p>
        <p className="mt-3 text-sm text-clinic-muted">
          {me ? `${me.ahead} ahead of you` : 'Connecting...'}
        </p>
      </div>
    </div>
  );
}
