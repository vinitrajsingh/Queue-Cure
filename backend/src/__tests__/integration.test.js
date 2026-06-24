import assert from 'node:assert';
import http from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { registerIo } from '../services/broadcast.js';
import { registerSocketHandlers } from '../sockets/handlers.js';
import { Patient } from '../models/patient.js';
import { ClinicState } from '../models/clinic-state.js';
import { CLINIC_ID, SEED_EWMA_AVG } from '../config/constants.js';
import { callNext } from '../services/queue-service.js';
import { updateEwma } from '../services/wait-engine.js';

const TEST_URI =
  process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/queue-cure-test';

let httpServer;
let port;
let passed = 0;

function connectClinic() {
  return new Promise((resolve) => {
    const c = ioClient(`http://localhost:${port}`, {
      query: { room: CLINIC_ID },
      transports: ['websocket']
    });
    c.on('connect', () => resolve(c));
  });
}

function connectPatient(tokenId) {
  return new Promise((resolve) => {
    const c = ioClient(`http://localhost:${port}`, {
      query: { tokenId },
      transports: ['websocket']
    });
    c.on('connect', () => resolve(c));
  });
}

function emitAck(client, event, payload) {
  return new Promise((resolve) => client.emit(event, payload, resolve));
}

function nextEvent(client, event) {
  return new Promise((resolve) => client.once(event, resolve));
}

async function resetDb() {
  await Patient.deleteMany({});
  await ClinicState.deleteMany({});
  // Fold the seed history into ewmaAvg exactly as seed.js does, so the stored
  // average is consistent with its own history and EWMA assertions are sound.
  const seedHistory = [720, 900, 660, 840];
  let ewma = SEED_EWMA_AVG;
  for (const d of seedHistory) ewma = updateEwma(ewma, d);
  await ClinicState.create({
    clinicId: CLINIC_ID,
    ewmaAvg: ewma,
    consultations: seedHistory,
    lastTokenNumber: 0
  });
}

async function test(name, fn) {
  await resetDb();
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

async function main() {
  await connectDb(TEST_URI);

  const app = http.createServer();
  const ioServer = new Server(app, { cors: { origin: '*' } });
  registerIo(ioServer);
  registerSocketHandlers(ioServer);
  await new Promise((r) => app.listen(0, r));
  port = app.address().port;
  httpServer = app;

  const admin = await connectClinic();

  await test('patient:add assigns sequential token + returns url', async () => {
    const r1 = await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const r2 = await emitAck(admin, 'patient:add', { name: 'B', category: 'followup' });
    assert.ok(r1.ok && r2.ok);
    assert.equal(r1.tokenNumber, 1);
    assert.equal(r2.tokenNumber, 2);
    assert.match(r1.url, /\/patient\//);
  });

  await test('callNext on empty queue is clean (no active, no crash)', async () => {
    const r = await emitAck(admin, 'queue:callNext', {});
    assert.ok(r.ok);
    assert.equal(r.active, null);
  });

  await test('callNext activates highest-priority waiting patient', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const b = await emitAck(admin, 'patient:add', { name: 'B', category: 'emergency' });
    const r = await emitAck(admin, 'queue:callNext', {});
    assert.equal(r.active.tokenId, b.tokenId, 'emergency should be called first');
  });

  await test('double callNext does not double-assign (atomicity)', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    // fire two call-next concurrently
    const [r1, r2] = await Promise.all([
      emitAck(admin, 'queue:callNext', {}),
      emitAck(admin, 'queue:callNext', {})
    ]);
    const actives = await Patient.find({ clinicId: CLINIC_ID, status: 'active' });
    assert.equal(actives.length, 1, 'exactly one active patient after two concurrent calls');
    // exactly one call wins and activates a patient; the other is a no-op
    const wins = [r1.active, r2.active].filter(Boolean);
    assert.equal(wins.length, 1, 'only one concurrent call advances the queue');
    const stillWaiting = await Patient.find({ clinicId: CLINIC_ID, status: 'waiting' });
    assert.equal(stillWaiting.length, 1, 'the other patient remains waiting');
  });

  await test('EWMA updates from real recorded duration on completion', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:callNext', {}); // A active
    const active = await Patient.findOne({ clinicId: CLINIC_ID, status: 'active' });
    // simulate a 300s consultation by backdating calledAt
    await Patient.updateOne(
      { _id: active._id },
      { $set: { calledAt: new Date(Date.now() - 300_000) } }
    );
    const before = await ClinicState.findOne({ clinicId: CLINIC_ID });
    await emitAck(admin, 'queue:callNext', {}); // completes A, activates B
    const after = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.equal(after.consultations.length, before.consultations.length + 1);
    const recorded = after.consultations[after.consultations.length - 1];
    assert.ok(recorded >= 299 && recorded <= 301, `recorded ~300, got ${recorded}`);
    assert.notEqual(after.ewmaAvg, before.ewmaAvg);
  });

  await test('EWMA protected across a break (resume resets calledAt)', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:callNext', {}); // A active
    await emitAck(admin, 'queue:pause', { durationSeconds: 600 });
    // simulate break elapsing by backdating breakStartedAt and calledAt far back
    await ClinicState.updateOne(
      { clinicId: CLINIC_ID },
      { $set: { breakStartedAt: new Date(Date.now() - 600_000) } }
    );
    await Patient.updateOne(
      { clinicId: CLINIC_ID, status: 'active' },
      { $set: { calledAt: new Date(Date.now() - 600_000) } }
    );
    const before = await ClinicState.findOne({ clinicId: CLINIC_ID });
    await emitAck(admin, 'queue:resume', {});
    // active patient's calledAt should now be ~now, not the backdated value
    const active = await Patient.findOne({ clinicId: CLINIC_ID, status: 'active' });
    assert.ok(Date.now() - new Date(active.calledAt).getTime() < 5000, 'calledAt reset on resume');
    // now complete: duration must be small (post-resume), not ~600s break time
    await emitAck(admin, 'queue:callNext', {});
    const after = await ClinicState.findOne({ clinicId: CLINIC_ID });
    const recorded = after.consultations[after.consultations.length - 1];
    assert.ok(recorded < 30, `break time must not enter EWMA, recorded=${recorded}`);
    assert.ok(before.consultations.length >= 0);
  });

  await test('skip marks active absent->requeued and advances', async () => {
    const a = await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const b = await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:callNext', {}); // A active
    await emitAck(admin, 'queue:skip', {});
    const active = await Patient.findOne({ clinicId: CLINIC_ID, status: 'active' });
    assert.equal(active.tokenId, b.tokenId, 'B advanced to active');
    const requeued = await Patient.findOne({ tokenId: a.tokenId });
    assert.equal(requeued.status, 'waiting', 'A re-entered as waiting');
    assert.equal(requeued.tokenNumber, 1, 'A keeps its token number');
    assert.ok(requeued.requeuedAt, 'A flagged requeued so it sorts to back');
  });

  await test('markUrgent sets priority without changing token number', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const b = await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:markUrgent', { tokenId: b.tokenId, urgentReason: 'chest pain' });
    const p = await Patient.findOne({ tokenId: b.tokenId });
    assert.equal(p.priority, 1);
    assert.equal(p.urgentReason, 'chest pain');
    assert.equal(p.tokenNumber, 2, 'token number unchanged');
    const r = await emitAck(admin, 'queue:callNext', {});
    assert.equal(r.active.tokenId, b.tokenId, 'urgent patient called first');
  });

  await test('undo reverts last callNext and removes its EWMA contribution', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:callNext', {}); // A active
    await Patient.updateOne(
      { clinicId: CLINIC_ID, status: 'active' },
      { $set: { calledAt: new Date(Date.now() - 200_000) } }
    );
    const stateBefore = await ClinicState.findOne({ clinicId: CLINIC_ID });
    await emitAck(admin, 'queue:callNext', {}); // completes A, activates B
    const stateMid = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.equal(stateMid.consultations.length, stateBefore.consultations.length + 1);

    const r = await emitAck(admin, 'queue:undo', {});
    assert.ok(r.reverted);
    const a = await Patient.findOne({ clinicId: CLINIC_ID, name: 'A' });
    const b = await Patient.findOne({ clinicId: CLINIC_ID, name: 'B' });
    assert.equal(a.status, 'active', 'A restored to active');
    assert.equal(b.status, 'waiting', 'B back to waiting');
    const stateAfter = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.equal(
      stateAfter.consultations.length,
      stateBefore.consultations.length,
      'EWMA history restored'
    );
  });

  await test('multi-tab: both clinic clients receive identical queue:update', async () => {
    const admin2 = await connectClinic();
    const display = await connectClinic();
    const p1 = nextEvent(admin2, 'queue:update');
    const p2 = nextEvent(display, 'queue:update');
    await emitAck(admin, 'patient:add', { name: 'Sync', category: 'general' });
    const [u1, u2] = await Promise.all([p1, p2]);
    assert.equal(u1.waiting.length, u2.waiting.length);
    assert.equal(u1.waiting[0].tokenId, u2.waiting[0].tokenId);
    admin2.close();
    display.close();
  });

  await test('queue:sync sends fresh full state to clinic requester', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const fresh = await connectClinic();
    const p = nextEvent(fresh, 'queue:update');
    fresh.emit('queue:sync');
    const u = await p;
    assert.ok(u.waiting.length >= 1);
    fresh.close();
  });

  await test('patient socket gets scoped personal view on sync', async () => {
    const add = await emitAck(admin, 'patient:add', { name: 'Phone', category: 'general' });
    const phone = await connectPatient(add.tokenId);
    const p = nextEvent(phone, 'patient:update');
    phone.emit('queue:sync');
    const personal = await p;
    assert.equal(personal.tokenId, add.tokenId);
    assert.equal(personal.tokenNumber, add.tokenNumber);
    assert.ok('ahead' in personal && 'wait' in personal);
    phone.close();
  });

  await test('callNext releases the lock even when the mutation throws', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    const original = Patient.findOneAndUpdate;
    Patient.findOneAndUpdate = () => {
      throw new Error('simulated mid-call failure');
    };
    let threw = false;
    try {
      await callNext(CLINIC_ID);
    } catch (err) {
      threw = err.message === 'simulated mid-call failure';
    } finally {
      Patient.findOneAndUpdate = original;
    }
    assert.ok(threw, 'the error propagates to the caller');
    const state = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.equal(state.callLockAt, null, 'finally cleared the lock, not the 5s stale guard');
    // and the queue is immediately usable again, no waiting on the TTL
    const r = await emitAck(admin, 'queue:callNext', {});
    assert.ok(r.ok && r.active, 'next call-next succeeds right away');
  });

  await test('undo lands on the exact ewmaAvg that preceded the call', async () => {
    await emitAck(admin, 'patient:add', { name: 'A', category: 'general' });
    await emitAck(admin, 'patient:add', { name: 'B', category: 'general' });
    await emitAck(admin, 'queue:callNext', {}); // A active
    await Patient.updateOne(
      { clinicId: CLINIC_ID, status: 'active' },
      { $set: { calledAt: new Date(Date.now() - 437_000) } }
    );
    const before = await ClinicState.findOne({ clinicId: CLINIC_ID });
    const ewmaBefore = before.ewmaAvg;
    const historyBefore = [...before.consultations];

    await emitAck(admin, 'queue:callNext', {}); // completes A, mutates EWMA
    const mid = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.notEqual(mid.ewmaAvg, ewmaBefore, 'call did change the average');

    await emitAck(admin, 'queue:undo', {});
    const after = await ClinicState.findOne({ clinicId: CLINIC_ID });
    assert.equal(after.ewmaAvg, ewmaBefore, 'undo restores the exact prior average');
    assert.deepEqual(after.consultations, historyBefore, 'history identical to before');
  });

  admin.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  ioServer.close();
  httpServer.close();
  console.log(`\nintegration.test.js: ${passed} passed\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\nintegration test FAILED:', err);
  process.exit(1);
});
