import { Patient } from '../models/patient.js';
import { ClinicState } from '../models/clinic-state.js';
import { computeWaitTimes, sortQueue } from './wait-engine.js';

let io = null;

export function registerIo(serverIo) {
  io = serverIo;
}

function breakInfo(clinicState, now) {
  if (!clinicState.isPaused) return { isPaused: false };
  const elapsed = clinicState.breakStartedAt
    ? (now - new Date(clinicState.breakStartedAt).getTime()) / 1000
    : 0;
  const remaining = Math.max(0, (clinicState.estimatedBreakDuration || 0) - elapsed);
  return {
    isPaused: true,
    breakRemaining: Math.round(remaining),
    breakStartedAt: clinicState.breakStartedAt,
    estimatedBreakDuration: clinicState.estimatedBreakDuration
  };
}

function todayStats(allPatients, clinicState) {
  const doneToday = allPatients.filter((p) => p.status === 'done');
  const avgConsult = clinicState.consultations.length
    ? Math.round(
        clinicState.consultations.reduce((a, b) => a + b, 0) /
          clinicState.consultations.length
      )
    : Math.round(clinicState.ewmaAvg);
  return {
    avgConsult,
    doneCount: doneToday.length,
    ewmaAvg: Math.round(clinicState.ewmaAvg)
  };
}

function personalView(p, { active, estimates, confidence, brk, now }) {
  return {
    tokenId: p.tokenId,
    tokenNumber: p.tokenNumber,
    name: p.name,
    category: p.category,
    status: p.status,
    nowServing: active ? active.tokenNumber : null,
    ahead:
      p.status === 'waiting' && estimates[p.tokenId]
        ? estimates[p.tokenId].position - 1
        : 0,
    wait: estimates[p.tokenId] || null,
    confidence,
    break: brk,
    serverTime: now
  };
}

// The ONE function every mutating handler calls. Reads fresh state from Mongo,
// runs the wait engine, then emits the full queue to the clinic room and a
// scoped personal view to each patient's private token room. No handler emits
// queue/patient events anywhere else.
//
// targetSocket, when provided, scopes the response to a single reconnecting
// client (the queue:sync path): a patient socket gets only its own personal
// view, any other socket gets the full clinic queue.
export async function broadcastQueueState(clinicId, targetSocket = null) {
  if (!io) throw new Error('Socket.io not registered with broadcast layer');

  const now = Date.now();
  const [open, clinicState] = await Promise.all([
    Patient.find({ clinicId, status: { $ne: 'done' } }).lean(),
    ClinicState.findOne({ clinicId }).lean()
  ]);

  const state = clinicState || { ewmaAvg: 900, consultations: [], isPaused: false };
  const { estimates, confidence } = computeWaitTimes(open, state, now);
  const sorted = sortQueue(open);
  const active = sorted.find((p) => p.status === 'active') || null;
  const waiting = sorted.filter((p) => p.status === 'waiting');

  const brk = breakInfo(state, now);

  const queuePayload = {
    clinicId,
    active,
    waiting: waiting.map((p) => ({ ...p, wait: estimates[p.tokenId] || null })),
    absent: sorted.filter((p) => p.status === 'absent'),
    stats: todayStats(open, state),
    confidence,
    break: brk,
    serverTime: now
  };

  const ctx = { active, estimates, confidence, brk, now };

  if (targetSocket) {
    const targetTokenId = targetSocket.handshake.query.tokenId;
    if (targetTokenId) {
      const self = open.find((p) => p.tokenId === targetTokenId);
      if (self) targetSocket.emit('patient:update', personalView(self, ctx));
      return;
    }
    targetSocket.emit('queue:update', queuePayload);
    return;
  }

  io.to(clinicId).emit('queue:update', queuePayload);
  for (const p of open) {
    io.to(p.tokenId).emit('patient:update', personalView(p, ctx));
  }
}
