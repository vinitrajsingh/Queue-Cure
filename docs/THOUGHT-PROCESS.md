# Queue Cure: Thought Process and Engineering Notes

This document records the design reasoning behind Queue Cure, the concurrency
model that keeps two screens in perfect sync, the adaptive wait-time model, and
the specific bugs found during testing with their fixes. It is written for a
reviewer who wants to see real engineering decisions, not a feature tour.

## Concurrency model: one writer pattern, atomic mutations, single broadcast

The product requirement is unforgiving: the receptionist admin and the waiting
hall display must show identical state the instant Call Next is pressed, across
separate browser tabs, with no manual refresh. Three rules make that hold.

1. **Single source of truth for communication.** Every mutating handler ends by
   calling exactly one function, `broadcastQueueState(clinicId)`. No handler
   emits a socket event directly. The broadcast reads fresh state from MongoDB,
   runs the wait engine, and emits `queue:update` to the clinic room plus a
   scoped `patient:update` to each patient's private token room. Because all
   screens render from the same recomputed payload, they cannot diverge.

2. **Atomic mutations only.** Every operation that selects and changes a patient
   uses a single `findOneAndUpdate`. There is no read-then-write anywhere in the
   queue path. Read-then-write is the classic race: two callers read the same
   "next" patient and both write it active.

3. **State lives in MongoDB, not memory.** The queue, clinic state, EWMA history,
   and pause state all persist. A server restart loses nothing. The only
   in-memory state is the single-level undo reference and the socket connections
   themselves, neither of which is a source of truth for the queue.

## The atomicity bug we found in testing (and how we fixed it)

This is the most important correctness story in the codebase.

### The bug

The double-click "Call Next" edge case has an integration test that fires two
`queue:callNext` calls concurrently with two waiting patients in the queue. The
first version of `callNext` did two atomic steps in sequence:

1. complete the current active patient, and
2. `findOneAndUpdate({ status: 'waiting' }, { status: 'active' })` to promote the
   next patient.

Each step is atomic on its own document. But that is not enough. With no active
patient and two waiting patients, two concurrent calls each ran step 2 and each
atomically grabbed a *different* waiting patient. The result was two active
patients. The test failed with `actual: 2, expected: 1`.

The diagnosis matters: this was not two callers fighting over the same document
(which `findOneAndUpdate` would correctly serialize). It was two callers each
correctly claiming a *distinct* document, so per-document atomicity could never
catch it. A double-click means "advance the queue once," and the operation as a
whole needs to be serialized, not just its individual writes.

### The fix

We added a per-clinic lock on `ClinicState`, claimed with a single conditional
`findOneAndUpdate` at the top of `callNext`:

```
findOneAndUpdate(
  { clinicId, $or: [{ callLockAt: null }, { callLockAt: { $lt: staleBefore } }] },
  { $set: { callLockAt: now } },
  { new: true }
)
```

Whoever wins the conditional update holds the lock and advances the queue. The
loser gets `null` and returns a no-op. That is exactly the double-click
semantics: the second click does nothing.

### Why the lock self-expires

A naive lock would deadlock the queue forever if the server crashed between
claiming the lock and releasing it. So the claim condition treats any lock older
than `CALL_LOCK_TTL_MS` (5 seconds) as free and reclaimable. The lock only ever
spans the brief mutation, never the consultation itself, so 5 seconds is a wide
margin. On the normal path the lock is released immediately.

### Why the release is in `finally`, not the happy path

The lock is released in a `finally` block wrapping the mutation:

```
try {
  return await runCallNext(clinicId, now);
} finally {
  await ClinicState.updateOne({ clinicId }, { $set: { callLockAt: null } });
}
```

If `runCallNext` throws or rejects, `finally` still runs and clears the lock
immediately, so a transient error does not leave the queue locked for the full
TTL. The stale-guard is only the backstop for a hard process crash where
`finally` never gets a chance to run. There is a dedicated test,
"callNext releases the lock even when the mutation throws," that stubs a model
method to throw mid-call and asserts `callLockAt` is `null` afterward and the
next call-next succeeds immediately.

## The no-show loop bug we found in testing (and how we fixed it)

The no-show flow re-queues the absent patient at the back of the line with the
same token number, then advances to the next waiting patient. The Phase 3
receptionist verification exercised a sequence the unit tests had not: mark a
patient urgent, call them (they go active), then no-show them.

The bug: the re-queued patient still carried `priority: 1` from being urgent. The
"advance to next" selection sorts by priority first, so the highest-priority
waiting patient was the no-show we had just re-queued. They were immediately
re-called, and a receptionist no-showing them again would loop forever, never
reaching the patients actually present.

The fix is a one-line behavioral decision with a clear rationale: a no-show drops
their urgent priority back to 0 on the way out. Not showing up forfeits the
urgent slot. They keep their token number (and `urgentReason` as history) and
re-enter as a normal waiting patient, so present patients are served ahead of
someone who is not there. The test "skipping an urgent no-show does not re-call
them in a loop" locks this in.

This is also a good example of why the verification gate exists: per-unit tests
of skip and markUrgent both passed in isolation, but the interaction between them
only surfaced when driving the real sequence a receptionist would perform.

## The wait-time model

Wait time is never hardcoded. It derives entirely from `ClinicState.ewmaAvg`,
which is computed from real recorded consultation durations.

- **Sort order:** priority DESC, then for the active selection, `requeuedAt` ASC
  (so a returning no-show sits behind equal-priority patients who never left),
  then `tokenNumber` ASC.
- **Base offset:** if paused, the base is the remaining break time
  (`estimatedBreakDuration` minus elapsed, floored at 0). Otherwise it is the
  estimated remaining time of the active patient (`ewmaAvg` minus elapsed since
  `calledAt`, floored at 0).
- **Accumulation:** each waiting patient adds `ewmaAvg * categoryWeight[category]`
  (general 1.0, followup 0.5, report 0.4, emergency 1.5) to the running total.
- **Confidence:** derived from history length. Under 3 is "Calibrating" with a
  wide +/-40% range, 3 to 6 is "Medium" at +/-25%, 7+ is "High" at +/-15%. The
  range narrows as confidence rises so the patient-facing estimate honestly
  reflects how much data backs it.

`computeWaitTimes` is a pure function with no database access, which is why it has
a thorough unit-test suite covering sort order, category weighting, the active
and break base offsets, overrun flooring, and confidence boundaries.

### EWMA update and the break-protection rule

On consultation complete, `duration = completedAt - calledAt` in seconds is
pushed to history and `ewmaAvg = 0.3 * duration + 0.7 * ewmaAvg`. The break
duration must never enter this history, or the average would be polluted by idle
time. On resume we reset the active patient's `calledAt` to now, so the recorded
duration reflects only doctor-patient time. The test "EWMA protected across a
break" backdates the break by 600 seconds and asserts the recorded duration is
under 30 seconds, proving break time never reaches EWMA.

### Undo and EWMA reversal

EWMA is not cleanly invertible, so undo does not try to algebraically subtract
the last duration. Instead it removes the recorded duration from the history
array and replays the same 0.3/0.7 fold from the seed baseline
(`recomputeEwmaFromHistory`). The baseline is `SEED_EWMA_AVG`, referenced from
the shared constant rather than a literal, because it must match the baseline the
live EWMA started from or undo would land on a subtly different average. The test
"undo lands on the exact ewmaAvg that preceded the call" captures `ewmaAvg`
before a call and asserts byte-for-byte equality after the undo, along with a
`deepEqual` on the history array.

## Room isolation

Sockets join rooms by identity. Admin and display sockets join the `clinicId`
room and receive the full `queue:update`. Each patient phone joins its own
`tokenId` room and receives only its scoped `patient:update` (its position, wait,
and break status). A patient never sees the full queue, and the reconnect/sync
path respects the same scoping: a reconnecting patient socket gets only its own
personal view, a reconnecting clinic socket gets the full queue.

## Reconnect and stale-data safety

On connect and on every reconnect, the client emits `queue:sync`, and the server
responds by broadcasting current state to just that socket. This guarantees a
client that dropped offline never renders stale data once it returns: its first
action on reconnect is to pull fresh authoritative state.
