import assert from 'node:assert';
import { computeWaitTimes, sortQueue, updateEwma } from '../services/wait-engine.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const T0 = 1_700_000_000_000;

function patient(over) {
  return {
    tokenId: over.tokenId,
    tokenNumber: over.tokenNumber,
    category: over.category || 'general',
    priority: over.priority || 0,
    status: over.status || 'waiting',
    calledAt: over.calledAt || null
  };
}

test('sortQueue: priority desc then tokenNumber asc', () => {
  const q = [
    patient({ tokenId: 'a', tokenNumber: 1, priority: 0 }),
    patient({ tokenId: 'b', tokenNumber: 2, priority: 1 }),
    patient({ tokenId: 'c', tokenNumber: 3, priority: 0 })
  ];
  const sorted = sortQueue(q).map((p) => p.tokenId);
  assert.deepEqual(sorted, ['b', 'a', 'c']);
});

test('emergency jumps queue without changing tokenNumber', () => {
  const q = [
    patient({ tokenId: 'a', tokenNumber: 1, priority: 0 }),
    patient({ tokenId: 'b', tokenNumber: 5, priority: 1, category: 'emergency' })
  ];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3, 4], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  assert.equal(estimates['b'].position, 1);
  assert.equal(estimates['a'].position, 2);
  // tokenNumber is untouched by sort
  assert.equal(q.find((p) => p.tokenId === 'b').tokenNumber, 5);
});

test('first waiting patient with no active has zero base wait', () => {
  const q = [patient({ tokenId: 'a', tokenNumber: 1 })];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  assert.equal(estimates['a'].estimatedWait, 0);
});

test('wait accumulates by category weight', () => {
  const q = [
    patient({ tokenId: 'a', tokenNumber: 1, category: 'general' }),
    patient({ tokenId: 'b', tokenNumber: 2, category: 'report' }),
    patient({ tokenId: 'c', tokenNumber: 3, category: 'general' })
  ];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  assert.equal(estimates['a'].estimatedWait, 0);
  // after general (weight 1.0): 600
  assert.equal(estimates['b'].estimatedWait, 600);
  // after report (weight 0.4): 600 + 240 = 840
  assert.equal(estimates['c'].estimatedWait, 840);
});

test('active patient adds remaining estimated time as base', () => {
  const q = [
    patient({ tokenId: 'act', tokenNumber: 1, status: 'active', calledAt: new Date(T0 - 100_000) }),
    patient({ tokenId: 'a', tokenNumber: 2 })
  ];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  // 100s elapsed of 600s estimate -> 500s remaining base for first waiting
  assert.equal(estimates['a'].estimatedWait, 500);
});

test('active patient overrun floors base at zero', () => {
  const q = [
    patient({ tokenId: 'act', tokenNumber: 1, status: 'active', calledAt: new Date(T0 - 999_000) }),
    patient({ tokenId: 'a', tokenNumber: 2 })
  ];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  assert.equal(estimates['a'].estimatedWait, 0);
});

test('break offset: remaining break time is base, floored at zero', () => {
  const q = [patient({ tokenId: 'a', tokenNumber: 1 })];
  const state = {
    ewmaAvg: 600,
    consultations: [1, 2, 3],
    isPaused: true,
    breakStartedAt: new Date(T0 - 120_000),
    estimatedBreakDuration: 300
  };
  const { estimates } = computeWaitTimes(q, state, T0);
  // 120s into a 300s break -> 180s remaining base
  assert.equal(estimates['a'].estimatedWait, 180);
});

test('confidence: calibrating < 3, medium 3-6, high 7+', () => {
  const q = [patient({ tokenId: 'a', tokenNumber: 1 })];
  const mk = (n) => ({ ewmaAvg: 600, consultations: Array(n).fill(600), isPaused: false });
  assert.equal(computeWaitTimes(q, mk(2), T0).confidence, 'Calibrating');
  assert.equal(computeWaitTimes(q, mk(3), T0).confidence, 'Medium');
  assert.equal(computeWaitTimes(q, mk(6), T0).confidence, 'Medium');
  assert.equal(computeWaitTimes(q, mk(7), T0).confidence, 'High');
});

test('range narrows as confidence rises', () => {
  const q = [
    patient({ tokenId: 'a', tokenNumber: 1 }),
    patient({ tokenId: 'b', tokenNumber: 2 })
  ];
  const calib = computeWaitTimes(q, { ewmaAvg: 600, consultations: [1, 2], isPaused: false }, T0);
  const high = computeWaitTimes(q, { ewmaAvg: 600, consultations: Array(8).fill(600), isPaused: false }, T0);
  const calibSpread = calib.estimates['b'].rangeHigh - calib.estimates['b'].rangeLow;
  const highSpread = high.estimates['b'].rangeHigh - high.estimates['b'].rangeLow;
  assert.ok(calibSpread > highSpread, 'calibrating range should be wider than high');
});

test('updateEwma applies 0.3/0.7 formula', () => {
  // 0.3 * 1200 + 0.7 * 900 = 360 + 630 = 990
  assert.equal(updateEwma(900, 1200), 990);
});

test('done and absent patients excluded from wait math', () => {
  const q = [
    patient({ tokenId: 'd', tokenNumber: 1, status: 'done' }),
    patient({ tokenId: 'x', tokenNumber: 2, status: 'absent' }),
    patient({ tokenId: 'a', tokenNumber: 3 })
  ];
  const state = { ewmaAvg: 600, consultations: [1, 2, 3], isPaused: false };
  const { estimates } = computeWaitTimes(q, state, T0);
  assert.equal(Object.keys(estimates).length, 1);
  assert.equal(estimates['a'].estimatedWait, 0);
});

console.log(`\nengine.test.js: ${passed} passed\n`);
