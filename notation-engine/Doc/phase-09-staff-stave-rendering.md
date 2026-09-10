# Phase 9 — Staff/Stave Rendering (real implementation)

**Status:** complete and verified (43/43 tests pass, including a real
bug caught and fixed by the test suite itself -- see §3).

This supersedes the `quick-demo/staff.ts` proof-of-concept from before
Phase 1 existed (see `phase-09-staff-lines.md` for that standalone demo's
own record, which is unaffected and still wired into the drum-video app
separately). This is the REAL Phase 9, properly split across
`src/geometry/` (pure math) and `src/render/` (SVG drawing) per the
engine's actual folder structure.

## 1. What was written

**`src/geometry/staff.ts`** — pure math, no SVG:
- **`StaffGeometry`** — `{ numLines, lineYPositions, height }`.
  `lineYPositions` is ordered bottom-to-top with the bottom line always at
  **y=0**, higher lines at increasingly negative y.
- **Why y=0 = bottom line:** this deliberately matches the SMuFL glyph-
  origin convention confirmed while writing Phase 6 ("y=0 in font design
  space represents the middle of the bottom staff line"). Using the same
  reference point for staff lines and glyphs means a later phase placing
  a note glyph "on line N" uses this geometry's `lineYPositions[N]`
  directly, with no separate flip/offset to reconcile between the two
  coordinate systems.
- **`computeStaffGeometry(numLines)`** — works for any positive integer
  line count, not just 5. Throws on 0, negative, or non-integer input.
  PLAN.md Phase 9 explicitly calls out 1–6 lines (5 = standard, 1 =
  single-line percussion, 6 = tab) as all needing to work from day one,
  not just the common case.

**`src/render/staff.ts`** — the drawing side, built on Phase 6's
primitives:
- **`renderStaff(geometry, options)`** — draws every line in a
  `StaffGeometry` as one `<g>` of `<line>` elements via Phase 6's
  `svgLine`/`svgGroup`. `options.y` positions the whole staff (it's added
  to each of `geometry`'s already-computed line offsets), and
  `options.color`/`lineThickness` are typically Phase 5's
  `getEngravingDefault('staffLineThickness')` passed straight through.

**Barrel files** — `src/geometry/index.ts` (new), updated
`src/render/index.ts` and `src/index.ts`.

**Tests:**
- `test/unit/staff-geometry.test.js` — 1/5/6-line geometry correctness,
  plus invalid-input rejection.
- `test/unit/staff-render.test.js` — line count, position, color, and
  thickness all correctly reflected in the rendered markup.
- `test/visual/rendering.test.js` gained a second snapshot test,
  `staff-line-count-variants`, rendering a 1-line, 5-line, and 6-line
  staff stacked in one document -- a real visual regression check that
  all three line counts keep rendering correctly together going forward.

## 2. A real bug the test suite caught (worth keeping on record)

`computeStaffGeometry`'s first draft computed each line's y as `-i` (unary
negation). At `i=0` (the bottom line), JavaScript's `-0` is a **distinct
value from `0`** under strict/deep equality (`Object.is(-0, 0) ===
false`), even though `-0 === 0` is `true` and `String(-0)` prints `"0"`.
This meant `computeStaffGeometry(5).lineYPositions[0]` was actually `-0`,
not `0`. It happened to be cosmetically invisible in rendered SVG output
(the string conversion hides it), but is still semantically wrong and
could bite a later phase doing something sign-of-zero-sensitive (e.g.
`1 / y`). Fixed by computing `0 - i` instead of `-i` -- `0 - 0` is a clean
positive `0` in JavaScript. This is exactly the kind of thing Phase 8
exists to catch, and it did, immediately, on the very next phase after
being built.

(Separately, the test file itself needed the same vm-sandbox-realm fix
documented in `phase-08-testing-harness.md` -- comparing a sandboxed
array against a same-file literal via `assert.deepEqual` needed the array
spread into the test's own realm first, `[...g.lineYPositions]`, not
`.slice()` which stays in the sandbox's realm.)

## 3. How this was verified

`npm run verify` (typecheck → lint → format → build → all tests) passes
clean, 43/43. The snapshot test's rendered output was inspected directly
and confirmed correct: the 1-line staff has just one line at y=0; the
5-line staff (positioned at `y: 6`) has its bottom line at y=6 and top
line at y=2 (span of 4, matching `height`); the 6-line staff (positioned
at `y: 15`) spans y=15 down to y=10 (span of 5) -- and no `-0` appears
anywhere in the output now that the bug above is fixed.

## 4. How to modify it

- **Add a staff-position-to-pitch mapping** (i.e. "which line/space does
  this pitch sit on for this clef") — that's Phase 10's job, building on
  top of this geometry, not a change to this file.
- **Draw ledger lines** — Phase 14's job; will likely extend
  `renderStaff` or add a sibling function taking the same `StaffGeometry`
  plus a list of out-of-range positions needing ledger lines.
- **Change the bottom-line-at-y=0 convention** — would need to also flip
  every future glyph-placement calculation in Phase 10+, since they're
  designed to share this exact reference point. Don't change one without
  the other.

## 5. How to revert/remove it

Delete `src/geometry/staff.ts`, `src/geometry/index.ts`,
`src/render/staff.ts`, the two new test files, and the
`staff-line-count-variants.snap` file; remove `export * from
'./staff.js';` from `src/render/index.ts` and `export * from
'./geometry/index.js';` from `src/index.ts`. The unrelated quick-demo
(`quick-demo/staff.ts` and its wiring into `web-preview/canvas-
preview.html`) is untouched by any of this and would need its own
separate removal per `phase-09-staff-lines.md` if that's also wanted.
