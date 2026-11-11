# Integration K — multi-voice notehead collision wired into rendering

**Not a numbered phase.** Phase 25 built §9.14's stem direction and rest
separation and wired both, but left the third piece — notehead collision
offsetting — as geometry with no caller. `PLAN.md` §9.14 has said so ever
since. This pass connects it.

**Status:** complete. `npm run verify` clean (646 tests).

## 1. What was written

### `resolveNoteRendering` (extracted)

A note's staff position and notehead glyph were computed inside
`renderNoteheadPart`. The collision pass needs the same two facts *before*
anything is drawn, and a second implementation could disagree — a drum note's
GM-mapped staff position is the case that makes this matter, since re-deriving
it from `<display-step>`/`<display-octave>` would test a different line than
the notehead actually lands on.

So the computation moved into `resolveNoteRendering(note, ctx)`, used by both.
`renderNoteheadPart`'s behaviour is unchanged — the whole test suite,
snapshots included, passed untouched across the extraction.

### `computeVoiceCollisionOffsets(measure, staffNumber, ctx)`

Returns `voiceId:tick → x offset`. A collision is by definition a fact ABOUT
two voices, so it cannot be seen from inside either one's own loop; this runs
once per (measure, staff), before the voice loop.

It gathers every notehead on that staff (chord members individually; grace
notes skipped, since those draw as one precomposed Phase 34 glyph), then
compares every cross-voice pair at the same tick through §9.14's own
`resolveNoteheadCollision`. The largest resulting shift wins for a voice.

The shift is applied to the **event's x itself**, so the notehead, its
accidental, its ledger lines, its stem and anything anchored to it all move
together — exactly what §9.14 requires ("its own ledger lines / accidental,
which move with it").

### Behaviour this produces

| Case | Result |
|---|---|
| two voices one staff position apart (0.5sp) | the higher-numbered voice shifts right by one notehead width |
| a unison between two voices | also shifts — distance 0 is within the 1.0sp threshold |
| two voices an octave apart | neither moves |
| a single-voice measure | nothing is ever computed or applied |

"Higher voice number moves" is §9.14's own rule and is deliberately **not**
pitch-dependent: the same two voices resolve the same way regardless of which
is on top at a given moment.

## 2. How to modify it

| Want to change | Where |
|---|---|
| The collision distance | `NOTEHEAD_COLLISION_THRESHOLD` (1.0sp) in `geometry/voice.ts` — the rule, not the wiring |
| Which voice moves | `resolveNoteheadCollision` in the same file |
| Whether grace notes participate | the `isGrace` skip in `computeVoiceCollisionOffsets` |

## 3. Known limitation (§9.14's own, unchanged)

Only **pairwise** comparison is specified. A genuine 3-or-4-voice pile-up,
where a middle voice's notehead is squeezed from both sides, needs a general
column-assignment algorithm — the same shape as Phase 19's accidental
stacking. Each pair is resolved independently here and the largest shift wins,
which is a reasonable answer for that case but not a correct one.

## 4. How to revert it

Delete `computeVoiceCollisionOffsets`, its call site, and the
`collisionOffsets.get(...)` term in `eventXs`. `resolveNoteRendering` is a
pure extraction and is worth keeping either way.

Tests: `test/unit/voice-collision-wiring.test.js`.
