# Phase 10 — Clef Engine

**Status:** complete and verified (54/54 tests pass, including every
clef's staff-position math checked against the real standard line
mnemonics, both as unit-test assertions and in a rendered visual
snapshot).

## 1. What was written

**`src/geometry/clef.ts`** — pure math, no SVG:
- **`diatonicIndex(step, octave)`** — a linear integer across the 7-note
  diatonic scale (`octave * 7 + stepOffset`), letting any two (step,
  octave) pairs be compared by simple subtraction regardless of
  accidentals (which never affect staff position -- C# and C sit on
  exactly the same line).
- **`ClefDefinition`** — a clef is just one reference (step, octave)
  pinned to one reference Y position, plus an `octaveShift` for 8va/8vb
  variants and a `positionsByPitch` flag (false only for tab clef).
  Deliberately NOT a per-clef lookup table of "which note sits on which
  line" -- one reference point plus arithmetic covers every pitch.
- **8 built-in clef constants**: `TREBLE_CLEF`, `BASS_CLEF`, `ALTO_CLEF`,
  `TENOR_CLEF`, `SOPRANO_CLEF`, `TREBLE_8VB_CLEF` (vocal tenor),
  `TREBLE_8VA_CLEF`, `PERCUSSION_CLEF`, `TAB_CLEF` -- matching every clef
  type PLAN.md Phase 10 named.
- **`staffPositionForPitch(clefDef, step, octave)`** — the actual
  pitch→Y-position function every later phase (11+) will call. Throws for
  `positionsByPitch: false` clefs (tab) rather than returning a
  meaningless number.

**`src/render/clef.ts`** — **`renderClef(clefDef, options)`**: draws a
clef's SMuFL glyph via Phase 6's `svgGlyphText`, always anchored at the
staff's bottom line (`options.y`, matching Phase 9's `renderStaff` `y`)
**regardless of clef type** -- see §2 for why this is correct and not a
bug.

## 2. Design notes

- **Every clef glyph is anchored at the SAME point (the staff's bottom
  line), not at each clef's own reference line.** This looked wrong at
  first glance (shouldn't bass clef's glyph sit higher/lower than
  treble's?) but is actually correct: Bravura's clef glyphs (like every
  SMuFL scoring-application font) are each pre-designed relative to a
  nominal 5-line staff whose bottom line sits at the font's own y=0
  baseline -- confirmed via the SMuFL spec's scoring-metrics page while
  writing Phase 6. So anchoring any clef glyph's SVG text baseline at the
  staff's bottom line already puts its curl/dots at the geometrically
  correct height, with zero per-clef offset math needed in the renderer.
  The `referenceY`/`referenceDiatonicIndex` fields in `ClefDefinition`
  are for a *different* job entirely: computing where NOTES go, not where
  the clef glyph itself goes.
- **Percussion clef reuses treble's exact reference.** There's no single
  universal standard for which line an unpitched instrument's
  `displayStep`/`displayOctave` should land on (researched earlier, see
  the PAS/Norman Weinberg discussion from the pre-Phase-1 research
  session) -- but real-world MusicXML files calibrate those values as if
  a treble-clef mapping applies, so matching that is what makes files
  from actual notation software position correctly, rather than
  inventing our own convention that would disagree with real files.
- **Tab clef is structurally different, not just visually.** It's the
  only built-in clef with `positionsByPitch: false` -- string-number-based
  placement for tab notation is a distinct later concern, not a variation
  on the pitch-position formula.

## 3. How the reference points were verified

Every clef's `(referenceStep, referenceOctave, referenceY)` was checked
against that clef's standard line mnemonic before being committed, then
re-checked as real test assertions (`test/unit/clef.test.js`):

| Clef | Lines bottom→top | Mnemonic-checked |
|---|---|---|
| Treble | E4 G4 B4 D5 F5 | "Every Good Bird Does Fly" |
| Bass | G2 B2 D3 F3 A3 | "Good Boys Do Fine Always" |
| Alto | F3 A3 C4 E4 G4 | (standard alto-clef lines) |
| Tenor | D3 F3 A3 C4 E4 | (standard tenor-clef lines) |
| Soprano | C4 E4 G4 B4 D5 | (standard soprano C-clef lines) |

Additionally verified: `TREBLE_8VB_CLEF` places a sounding G3 at the same
Y as plain treble places G4 (one octave higher on the page than it
sounds, as an "8" below the clef means); `TREBLE_8VA_CLEF` places a
sounding G5 where plain treble places G4; `PERCUSSION_CLEF` matches
`TREBLE_CLEF` exactly; `TAB_CLEF.positionsByPitch` is `false` and
`staffPositionForPitch` throws for it.

A visual snapshot (`clef-engine-all-clefs`) renders treble/bass/alto/
percussion clefs on their own staves, each with a note at its clef's
reference pitch (G4, F3, C4) -- inspected directly and confirmed each
note lands exactly where the math predicts (e.g. treble's G4 at the
staff's line-index-1, bass's F3 at line-index-3).

## 4. How to modify it

- **Add another clef variant** (e.g. baritone C-clef, mezzo-soprano
  C-clef) — one more call to the internal `clef()` helper with that
  variant's own reference point; no other code changes needed.
- **Add a mid-piece clef change** — that's a Measure-level concern (see
  Phase 3's note that per-measure attributes like clef changes are
  deliberately not modeled yet) -- this phase only defines what a clef
  *is* and how it maps pitches, not when a piece switches between them.
- **Support a non-Bravura font with different clef glyph pre-positioning**
  — if a future SMuFL font ISN'T designed to the same bottom-line-at-font-
  baseline convention, `renderClef` would need a per-font Y offset; not
  needed for Bravura.

## 5. How to revert/remove it

Delete `src/geometry/clef.ts`, `src/render/clef.ts`,
`test/unit/clef.test.js`, and the `clef-engine-all-clefs.snap` file;
remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
