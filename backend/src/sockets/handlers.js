import { CLINIC_ID } from '../config/constants.js';
import { broadcastQueueState } from '../services/broadcast.js';
import {
  addPatient,
  callNext,
  skipActive,
  markUrgent,
  pauseQueue,
  resumeQueue,
  undoLast,
  resetQueue,
  getLastAction
} from '../services/queue-service.js';

function patientUrl(tokenId) {
  const base = process.env.PATIENT_BASE_URL || 'http://localhost:5173';
  return `${base}/patient/${tokenId}`;
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const { room, tokenId } = socket.handshake.query;

    if (tokenId) {
      socket.join(tokenId);
    } else {
      socket.join(room || CLINIC_ID);
    }

    socket.on('patient:add', async ({ name, category }, ack) => {
      try {
        if (!name || !name.trim()) {
          if (ack) ack({ ok: false, error: 'Name is required' });
          return;
        }
        const patient = await addPatient(CLINIC_ID, { name: name.trim(), category });
        await broadcastQueueState(CLINIC_ID);
        if (ack) {
          ack({
            ok: true,
            tokenId: patient.tokenId,
            tokenNumber: patient.tokenNumber,
            url: patientUrl(patient.tokenId)
          });
        }
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:callNext', async (_, ack) => {
      try {
        const result = await callNext(CLINIC_ID);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true, active: result.active });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:skip', async (_, ack) => {
      try {
        await skipActive(CLINIC_ID);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:markUrgent', async ({ tokenId: target, urgentReason }, ack) => {
      try {
        await markUrgent(CLINIC_ID, target, urgentReason);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:pause', async ({ durationSeconds }, ack) => {
      try {
        await pauseQueue(CLINIC_ID, durationSeconds);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:resume', async (_, ack) => {
      try {
        await resumeQueue(CLINIC_ID);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:undo', async (_, ack) => {
      try {
        const result = await undoLast(CLINIC_ID);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true, reverted: result.reverted });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('queue:reset', async (_, ack) => {
      try {
        await resetQueue(CLINIC_ID);
        await broadcastQueueState(CLINIC_ID);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    // Reconnect path: send the requesting client a full fresh state so it never
    // renders stale data after a network drop.
    socket.on('queue:sync', async () => {
      await broadcastQueueState(CLINIC_ID, socket);
    });
  });
}

export { getLastAction };
