import mongoose from 'mongoose';
import { SEED_EWMA_AVG } from '../config/constants.js';

const clinicStateSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, unique: true },
  ewmaAvg: { type: Number, default: SEED_EWMA_AVG },
  consultations: { type: [Number], default: [] },
  isPaused: { type: Boolean, default: false },
  breakStartedAt: { type: Date },
  estimatedBreakDuration: { type: Number },
  // Sequential counter so tokenNumber assignment survives restarts and never
  // reuses a number even after patients are completed or removed.
  lastTokenNumber: { type: Number, default: 0 },
  // Serializes concurrent call-next so a double-click cannot advance the queue
  // twice. Holds the timestamp of the in-flight call; treated as free once stale.
  callLockAt: { type: Date, default: null }
});

export const ClinicState = mongoose.model('ClinicState', clinicStateSchema);
