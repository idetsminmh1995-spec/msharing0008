# Phase 14 — Ledger Lines

**Status:** complete and verified (100/100 tests pass). Found and fixed a
real error in `PLAN.md`'s own §9.6 test-case description before
implementing — see §2.

## 1. What was written

**`src/geometry/ledger-line.ts`**:
- **`LedgerLine`** — `{ y }`, one integer staff-space Y position.
- **`computeLedgerLines(position, numLines)`** — returns every ledger line
  a note at `position` needs, for a staff of `numLines` lines. Works for
  any line count (verified down to a 1-line percussion staff, not just 5).
  - Below the staff (`position > 0`): lines at `y = 1, 2, ..., floor(position)`.
  - Above the staff (`position < topLine`): lines at
    `y = topLine-1, topLine-2, ..., ceil(position)`.
  - A note in the space just outside the staff (not yet reaching the first
    ledger position) → empty list.
  - A note further out, in a space *beyond* the nearest ledger line, still
    gets that nearer line drawn — it's the reference the note is understood
    relative to, the same way notes in the staff's own spaces don't need
    lines redrawn under them.

**`src/render/ledger-line.ts`**:
- **`renderLedgerLines(lines, options)`** — draws each line spanning the
  notehead's width plus a configurable extension on both sides, using
  Phase 6's `svgLine`. `extension`/`thickness` are meant to be Phase 5's
  real `getEngravingDefault('legerLineExtension')` /
  `('legerLineThickness')` — **not invented values**: checked Bravura's own
  metadata before writing this, and its `legerLineExtension` is `0.4`,
  which happens to exactly match the placeholder value `PLAN.md` §9.6
  guessed before this phase existed. `legerLineThickness` is `0.16`.

## 2. A real error found in the plan before implementing

`PLAN.md` §9.6 gave four test cases as its own examples, including
**"A4 in bass → one [ledger line] above."** Before writing any code, each
example was hand-verified against `staffPositionForPitch` (Phase 10) as a
sanity check — and this one is wrong: A4 in bass clef is at y=−7.5, which
needs **three** ledger lines above (y=−5, −6, −7), not one.

The example that actually belongs there — matching the parallel structure
with the treble test case right next to it — is **middle C (C4) in bass
clef**, at y=−5 exactly: one ledger line above. This is the well-known,
symmetric fact that middle C sits one ledger line above the bass staff and
one ledger line below the treble staff (the "gap note" between the two
halves of the grand staff). `PLAN.md` §9.6 has been corrected to say this
instead, before this phase's code was written — not silently worked around.

## 3. How this was verified

Ran `npm run verify` clean, 100/100. Specifically:
- The plan's own four test cases (as corrected): middle C in treble → one
  ledger line at y=+1; middle C in bass → one at y=−5; C4 in alto (which
  sits exactly on the clef's own reference, the middle line) → none; a
  note 3 ledger lines above/below → 3 consecutive-integer segments each
  direction.
- The "space beyond the nearest ledger line still needs that line drawn"
  rule specifically (positions 1.5 and −5.5), and the "space just outside
  the staff needs nothing yet" rule specifically (0.5 and −4.5) — both
  edge cases called out explicitly in the plan's algorithm description.
- A 1-line staff (the percussion case Phase 9 supports) produces correct
  ledger lines above and below.
- Invalid line counts (0, negative, non-integer) throw.
- A visual snapshot renders middle C with its ledger line on both a
  treble and a bass staff — inspected the raw output directly and
  confirmed the ledger line's Y position, and its X extent (notehead
  width ±0.59, plus the real 0.4 extension on each side, giving `5.01` to
  `6.99` around a notehead centered at `x=6`), both match the formula
  exactly.

## 4. How to modify it

- **Change the extension distance** — pass a different `extension` value
  to `renderLedgerLines`; the geometry function doesn't know about it at
  all (correctly — deciding *which* lines are needed is independent of
  how far each one physically extends).
- **Support a different ledger-line style** (e.g. thicker for a specific
  house style) — same approach, `thickness` is just a parameter.

## 5. How to revert/remove it

Delete `src/geometry/ledger-line.ts`, `src/render/ledger-line.ts`,
`test/unit/ledger-line.test.js`, and the `ledger-line-middle-c.snap` file;
remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`. The `PLAN.md` §9.6 test-case correction
should stay regardless — it was a factual error independent of whether
this implementation exists.
