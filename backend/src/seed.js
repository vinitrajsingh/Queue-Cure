import 'dotenv/config';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { connectDb } from './config/db.js';
import { Patient } from './models/patient.js';
import { ClinicState } from './models/clinic-state.js';
import { CLINIC_ID, SEED_EWMA_AVG } from './config/constants.js';
import { updateEwma } from './services/wait-engine.js';

const SEED_DURATIONS = [720, 900, 660, 840];

const SEED_PATIENTS = [
  { name: 'Aarav Sharma', category: 'general' },
  { name: 'Priya Nair', category: 'followup' },
  { name: 'Mohammed Khan', category: 'report' }
];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/queue-cure';
  await connectDb(uri);

  await Patient.deleteMany({ clinicId: CLINIC_ID });
  await ClinicState.deleteMany({ clinicId: CLINIC_ID });

  let ewma = SEED_EWMA_AVG;
  for (const d of SEED_DURATIONS) ewma = updateEwma(ewma, d);

  await ClinicState.create({
    clinicId: CLINIC_ID,
    ewmaAvg: ewma,
    consultations: [...SEED_DURATIONS],
    isPaused: false,
    lastTokenNumber: SEED_PATIENTS.length
  });

  const now = Date.now();
  await Patient.insertMany(
    SEED_PATIENTS.map((p, i) => ({
      clinicId: CLINIC_ID,
      tokenId: uuidv4(),
      tokenNumber: i + 1,
      name: p.name,
      category: p.category,
      priority: 0,
      status: 'waiting',
      registeredAt: new Date(now + i)
    }))
  );

  const confidence = SEED_DURATIONS.length >= 7 ? 'High' : 'Medium';
  console.log(`Seeded clinic ${CLINIC_ID}`);
  console.log(`  ewmaAvg: ${Math.round(ewma)}s, consultations: ${SEED_DURATIONS.length} (${confidence})`);
  console.log(`  waiting patients: ${SEED_PATIENTS.length}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
