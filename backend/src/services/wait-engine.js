import { CATEGORY_WEIGHTS, EWMA_ALPHA } from '../config/constants.js';

export function sortQueue(patients) {
  return [...patients].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.tokenNumber - b.tokenNumber;
  });
}

function confidenceFromHistory(count) {
  if (count < 3) return { level: 'Calibrating', rangePct: 0.4 };
  if (count <= 6) return { level: 'Medium', rangePct: 0.25 };
  return { level: 'High', rangePct: 0.15 };
}

// Returns base wait offset in seconds before the first waiting patient is seen:
// remaining break time when paused, otherwise the estimated remaining time of
// the patient currently with the doctor.
function computeBaseOffset({ active, clinicState, now }) {
  if (clinicState.isPaused) {
    if (!clinicState.breakStartedAt || !clinicState.estimatedBreakDuration) return 0;
    const elapsed = (now - new Date(clinicState.breakStartedAt).getTime()) / 1000;
    return Math.max(0, clinicState.estimatedBreakDuration - elapsed);
  }
  if (active && active.calledAt) {
    const elapsed = (now - new Date(active.calledAt).getTime()) / 1000;
    return Math.max(0, clinicState.ewmaAvg - elapsed);
  }
  return 0;
}

// Pure function: given the open queue and clinic state, returns wait estimates
// keyed by tokenId plus the confidence descriptor. Never reads the DB and never
// hardcodes a duration - every number flows from clinicState.ewmaAvg.
export function computeWaitTimes(patients, clinicState, now = Date.now()) {
  const confidence = confidenceFromHistory(clinicState.consultations.length);
  const active = patients.find((p) => p.status === 'active');
  const waiting = sortQueue(patients.filter((p) => p.status === 'waiting'));

  const base = computeBaseOffset({ active, clinicState, now });

  const estimates = {};
  let accumulated = base;

  for (let i = 0; i < waiting.length; i += 1) {
    const patient = waiting[i];
    const estimatedWait = Math.round(accumulated);
    const margin = Math.round(estimatedWait * confidence.rangePct);
    estimates[patient.tokenId] = {
      estimatedWait,
      rangeLow: Math.max(0, estimatedWait - margin),
      rangeHigh: estimatedWait + margin,
      position: i + 1,
      confidence: confidence.level
    };
    accumulated += clinicState.ewmaAvg * (CATEGORY_WEIGHTS[patient.category] ?? 1);
  }

  return { estimates, confidence: confidence.level, base: Math.round(base) };
}

export function updateEwma(prevEwma, durationSeconds) {
  return EWMA_ALPHA * durationSeconds + (1 - EWMA_ALPHA) * prevEwma;
}
