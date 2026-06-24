# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

[Step] -> verify: [check]
[Step] -> verify: [check]
[Step] -> verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

# PROJECT-SPECIFIC RULES: Queue Cure

## Single Source of Truth Rule
Every action that changes the queue (add, call next, skip, mark urgent, pause, resume, undo) MUST end by calling one function: `broadcastQueueState(clinicId)`. No action emits socket events directly. No exceptions. This is what guarantees both screens stay in sync.

## Atomicity Rule
NEVER read-then-write the queue. Any operation that selects and mutates a patient (especially "call next") MUST use a single atomic `findOneAndUpdate`. Read-then-write is a race-condition bug and will be treated as broken.

## Wait Time Rule
Wait time is NEVER hardcoded. It is always derived from `ClinicState.ewmaAvg`, which is computed from real recorded consultation durations. If you find yourself typing a fixed minute number into a wait calculation, stop - that is a bug.

## EWMA Protection Rule
The break duration must NEVER enter the EWMA consultation history. On resume, reset the active patient's `calledAt` to the current time. A consultation duration fed into EWMA must reflect only doctor-patient time, never break time or idle time.

## Edge Case Checklist (must all be handled, not just happy path)
Before declaring any feature done, verify against this list:
- [ ] Double-click "Call Next" -> atomic op prevents duplicate assignment
- [ ] Call Next on empty queue -> clean "no patients waiting" state, no crash
- [ ] Multiple browser tabs -> all reflect identical state via room broadcast
- [ ] Server restart -> queue survives (state in MongoDB, not memory)
- [ ] Client network drop -> on reconnect, client requests full sync, never shows stale data
- [ ] No-show patient -> grace timer, then auto-advance, patient re-enters at back
- [ ] Accidental Call Next -> Undo reverts last call within a time window
- [ ] Doctor break -> wait times offset by remaining break time, EWMA protected on resume
- [ ] Emergency patient -> priority sort jumps them up WITHOUT changing token numbers
- [ ] Patient leaves and returns -> QR link still live, shows current status

## Code Quality Rule (anti-AI-look)
- No comments that narrate the obvious (`// loop through patients`).
- No emoji in code. No filler comments. Comments only explain WHY, never WHAT.
- Consistent naming: camelCase for JS, kebab-case for files.
- Reusable React components extracted to /components. No copy-pasted JSX blocks.
- No console.logs left in committed code except an intentional server startup log.
- Do not use em dashes anywhere in the application UI, comments, or copy.

## Verification Gate
After each build phase, run the app and manually confirm the relevant edge cases from the checklist above before moving to the next phase. Report which checklist items were verified.
