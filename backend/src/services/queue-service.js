import { v4 as uuidv4 } from 'uuid';
import { Patient } from '../models/patient.js';
import { ClinicState } from '../models/clinic-state.js';
import { updateEwma } from './wait-engine.js';
import { SEED_EWMA_AVG } from '../config/constants.js';

// Single-level undo. Holds only the identifiers needed to revert the most recent
// callNext: the patient who was just made active, and the patient (if any) who
// was completed by that same call. Cleared once consumed or superseded.
let lastAction = null;

// A call-next holding the lock longer than this is assumed crashed; the lock is
// then reclaimable so the queue can never deadlock.
const CALL_LOCK_TTL_MS = 5000;

export function getLastAction() {
  return lastAction;
}

export async function addPatient(clinicId, { name, category }) {
  const updatedState = await ClinicState.findOneAndUpdate(
    { clinicId },
    { $inc: { lastTokenNumber: 1 } },
    { new: true, upsert: true }
  );
  const tokenId = uuidv4();
  const patient = await Patient.create({
    clinicId,
    tokenId,
    tokenNumber: updatedState.lastTokenNumber,
    name,
    category: category || 'general',
    priority: category === 'emergency' ? 1 : 0,
    status: 'waiting',
    registeredAt: new Date()
  });
  return patient;
}

// Atomic call-next. First claims a per-clinic lock via a single conditional
// findOneAndUpdate so a double-click (or two concurrent admins) cannot advance
// the queue twice: the loser of the race gets no lock and returns a no-op.
// Inside the lock it completes the current active patient (recording duration and
// updating EWMA) and selects the highest-priority waiting patient, each via an
// atomic findOneAndUpdate. The lock is always released in a finally block.
export async function callNext(clinicId) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CALL_LOCK_TTL_MS);

  const claimed = await ClinicState.findOneAndUpdate(
    {
      clinicId,
      $or: [{ callLockAt: null }, { callLockAt: { $lt: staleBefore } }]
    },
    { $set: { callLockAt: now } },
    { new: true }
  );

  if (!claimed) {
    return { active: null, completed: null, skipped: true };
  }

  try {
    return await runCallNext(clinicId, now);
  } finally {
    await ClinicState.updateOne({ clinicId }, { $set: { callLockAt: null } });
  }
}

async function runCallNext(clinicId, now) {
  const previousActive = await Patient.findOneAndUpdate(
    { clinicId, status: 'active' },
    { $set: { status: 'done', completedAt: now } },
    { new: true }
  );

  let recordedDuration = null;
  if (previousActive && previousActive.calledAt) {
    const duration = (now.getTime() - new Date(previousActive.calledAt).getTime()) / 1000;
    if (duration > 0) {
      recordedDuration = Math.round(duration);
      const state = await ClinicState.findOne({ clinicId });
      const nextEwma = updateEwma(state.ewmaAvg, duration);
      await ClinicState.updateOne(
        { clinicId },
        { $push: { consultations: recordedDuration }, $set: { ewmaAvg: nextEwma } }
      );
    }
  }

  const nextPatient = await Patient.findOneAndUpdate(
    { clinicId, status: 'waiting' },
    { $set: { status: 'active', calledAt: now } },
    { sort: { priority: -1, requeuedAt: 1, tokenNumber: 1 }, new: true }
  );

  lastAction = nextPatient
    ? {
        type: 'callNext',
        clinicId,
        activatedTokenId: nextPatient.tokenId,
        completedTokenId: previousActive ? previousActive.tokenId : null,
        prevCalledAt: previousActive ? previousActive.calledAt : null,
        recordedDuration,
        at: now.getTime()
      }
    : null;

  return { active: nextPatient, completed: previousActive };
}

// No-show: re-queue the active patient at the back with the same tokenNumber,
// then advance to the next waiting patient. Priority is reset to 0 on the way
// out so a no-show urgent patient does not immediately re-win selection ahead of
// patients who are actually present (which would otherwise loop endlessly).
export async function skipActive(clinicId) {
  const now = new Date();
  await Patient.findOneAndUpdate(
    { clinicId, status: 'active' },
    {
      $set: { status: 'waiting', requeuedAt: now, calledAt: null, priority: 0 },
      $unset: { completedAt: '' }
    }
  );

  const nextPatient = await Patient.findOneAndUpdate(
    { clinicId, status: 'waiting' },
    { $set: { status: 'active', calledAt: now } },
    { sort: { priority: -1, requeuedAt: 1, tokenNumber: 1 }, new: true }
  );

  lastAction = null;
  return { active: nextPatient };
}

export async function markUrgent(clinicId, tokenId, urgentReason) {
  return Patient.findOneAndUpdate(
    { clinicId, tokenId, status: { $in: ['waiting', 'active'] } },
    { $set: { priority: 1, urgentReason: urgentReason || '' } },
    { new: true }
  );
}

export async function pauseQueue(clinicId, estimatedBreakDuration) {
  return ClinicState.findOneAndUpdate(
    { clinicId },
    {
      $set: {
        isPaused: true,
        breakStartedAt: new Date(),
        estimatedBreakDuration
      }
    },
    { new: true, upsert: true }
  );
}

// Resume: clear pause fields and reset the active patient's calledAt to now so
// the break interval never pollutes the EWMA consultation history.
export async function resumeQueue(clinicId) {
  const now = new Date();
  await Patient.updateOne(
    { clinicId, status: 'active' },
    { $set: { calledAt: now } }
  );
  return ClinicState.findOneAndUpdate(
    { clinicId },
    {
      $set: { isPaused: false },
      $unset: { breakStartedAt: '', estimatedBreakDuration: '' }
    },
    { new: true }
  );
}

// Revert the most recent callNext: the activated patient returns to waiting and
// the patient completed by that call is restored to active with its prior timing
// and its recorded duration removed from EWMA history.
export async function undoLast(clinicId) {
  if (!lastAction || lastAction.type !== 'callNext' || lastAction.clinicId !== clinicId) {
    return { reverted: false };
  }

  await Patient.updateOne(
    { clinicId, tokenId: lastAction.activatedTokenId },
    { $set: { status: 'waiting' }, $unset: { calledAt: '' } }
  );

  if (lastAction.completedTokenId) {
    await Patient.updateOne(
      { clinicId, tokenId: lastAction.completedTokenId },
      { $set: { status: 'active', calledAt: lastAction.prevCalledAt }, $unset: { completedAt: '' } }
    );

    if (lastAction.recordedDuration != null) {
      const state = await ClinicState.findOne({ clinicId });
      const idx = state.consultations.lastIndexOf(lastAction.recordedDuration);
      if (idx !== -1) {
        const consultations = [...state.consultations];
        consultations.splice(idx, 1);
        const recomputed = recomputeEwmaFromHistory(consultations);
        await ClinicState.updateOne(
          { clinicId },
          { $set: { consultations, ewmaAvg: recomputed } }
        );
      }
    }
  }

  lastAction = null;
  return { reverted: true };
}

// Replays the same 0.3/0.7 fold over the remaining history from the seed
// baseline, so an undo lands on exactly the average that preceded the call it
// reverts. The baseline MUST match the one the live EWMA started from
// (SEED_EWMA_AVG, also the schema default and seed value) or undo would drift.
function recomputeEwmaFromHistory(consultations) {
  let ewma = SEED_EWMA_AVG;
  for (const d of consultations) ewma = updateEwma(ewma, d);
  return ewma;
}

export async function resetQueue(clinicId) {
  await Patient.deleteMany({ clinicId });
  await ClinicState.updateOne(
    { clinicId },
    {
      $set: { lastTokenNumber: 0, isPaused: false },
      $unset: { breakStartedAt: '', estimatedBreakDuration: '' }
    }
  );
  lastAction = null;
}
