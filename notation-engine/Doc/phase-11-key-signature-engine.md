# Phase 11 — Key Signature Engine

**Status:** complete for treble/bass/alto clefs (verified against multiple
independent real-world engraving references); tenor and soprano are a
**known, documented gap** rather than a guess -- see §4.

## 1. What was written

**`src/geometry/key-signature.ts`**:
- **`SHARP_ORDER`** / **`FLAT_ORDER`** — the universal circle-of-fifths
  accidental order (F C G D A E B / its exact reverse), true regardless
  of clef.
- **`sharpsForCount(n)`** / **`flatsForCount(n)`** — the first `n` steps
  of each order (0–7).
- **`getKeySignaturePositions(clefName)`** — returns
  `{ sharpPositions, flatPositions }`, each 7 Y-values (staff-space
  units, Phase 9 convention) for that clef, in `SHARP_ORDER`/`FLAT_ORDER`
  order. Hardcoded per clef (NOT derived from `staffPositionForPitch`) --
  see §2 for why.
- **`keySignatureAccidentals(fifths, clefName)`** — the main entry point:
  MusicXML-style `fifths` (positive = sharps, negative = flats, 0 = none)
  → an array of `{ step, type, y }`. Throws for any clef without a
  verified position table.
- **`cancellationNaturals(oldFifths, newFifths, clefName)`** — for a
  mid-piece key change, returns the naturals needed to cancel accidentals
  from the old key that don't carry into the new one, positioned at their
  *old* Y (the standard convention). Handles all three cases: new key has
  no accidentals, new key uses the opposite type (sharps↔flats), new key
  is the same type with fewer accidentals (cancels only the excess).

**`src/render/key-signature.ts`**: **`renderKeySignature`** /
**`renderCancellationNaturals`** — draw the accidentals/naturals left to
right at even spacing, via Phase 5's `getGlyph('accidentalSharp'
/'accidentalFlat'/'accidentalNatural')` and Phase 6's `svgGlyphText`.

## 2. Why the positions are a hardcoded table, not a formula

Phase 10's `staffPositionForPitch` computes where a pitch's *actual,
specific* octave sits. Key-signature accidentals don't work that way:
real engravers place each of the 7 sharps/flats at a **specific,
conventional octave chosen to keep the pattern compact and readable**
(e.g. treble's F♯ is drawn using F5, not some other F), and that choice
doesn't reduce to one formula across all 7 -- it's a fixed, memorized
shape, confirmed by every method-book source consulted. So this phase
hardcodes the verified Y-value for each of the 7 sharps and 7 flats per
clef, rather than trying to derive them from Phase 10's per-pitch math.

## 3. How the positions were verified

**Treble** — cross-referenced two independent, explicit sources
(musicreadingsavant.com's treble and bass pages) stating the exact
line/space for every one of the 7 sharps and 7 flats (e.g. "F# will
always be located on the top line, C# in the third space..."), converted
to this engine's Y-convention and double-checked for internal consistency
(the flats' well-documented "perfect zigzag, alternating up and down"
shape holds exactly across all 7 positions with no break, matching the
literature's description; the sharps' documented "break after D#" is
present at exactly that point too).

**Bass** — independently verified against its own explicit source
(same reasoning as treble), THEN cross-checked against the well-documented
fact that bass key signatures are "identical shape to treble, shifted down
one line/space": every one of the 14 verified bass values (7 sharps + 7
flats) equals its treble counterpart + exactly 1, with no exceptions --
this consistency across all 14 independent data points is strong
confirmation neither table has a copy/transcription error.

**Alto** — derived as treble + 0.5 (every accidental one diatonic step
lower), cross-validated two ways: alto's B♭ lands on "the lower middle
space" as independently described, and alto's F♯ (the universal first
sharp) lands on alto's topmost space -- both match treble+0.5 exactly.

All of the above are now real test assertions in
`test/unit/key-signature.test.js` (12 tests) plus a visual snapshot
(`key-signature-d-major`) rendering D major's two sharps (F♯, C♯) on both
treble and bass staves, inspected directly: treble's F♯/C♯ land at the
top line and 3rd space; bass's land at the 4th line and 2nd space --
exactly matching the literature. 67/67 total tests pass.

## 4. Known limitation: tenor and soprano clefs

**Deliberately not implemented, not guessed.** Multiple sources
(including the pre-Phase-1 research and this phase's own research)
confirm tenor clef's sharp key signatures follow a **genuinely different
shape**, not a simple offset of treble's: "In the tenor clef, there is no
break [after D♯], but F♯ and G♯ appear in the lower octave instead of the
upper octave" -- i.e. tenor's first two sharps are drawn an octave lower
than a naive treble-shifted-by-offset approach would produce, while the
remaining five sharps aren't shifted the same simple way either.
VexFlow's own source code confirms this with a hardcoded custom array for
tenor sharps (not a formula), which this phase couldn't independently
re-verify with high confidence in the time available. Soprano clef is
rare enough that no equally explicit, cross-checkable source was found at
all.

**`keySignatureAccidentals`/`cancellationNaturals` throw a clear, named
error for `'tenor'`, `'soprano'`, `'percussion'`, and `'tab'`** rather
than silently producing an incorrect key signature. Fixing this gap needs
either: (a) obtaining VexFlow's exact internal "line" zero-point
calibration to correctly decode its tenor custom array, or (b) finding
an equally explicit line-by-line tenor source the way treble/bass/alto
each had one, then repeating this phase's verification process.

## 5. How to modify it

- **Add tenor/soprano once verified** — add their entries to
  `CLEF_KEY_SIGNATURE_POSITIONS` in `key-signature.ts` following the exact
  same verification rigor as treble/bass/alto (§3); don't add a plain
  numeric offset for tenor sharps specifically, since that's confirmed
  wrong.
- **Support a custom key-signature style** (Phase 7's
  `config.keySignature.style`, currently only `'standard'`) — this phase
  produces the standard positions; a future style would add a second
  lookup table and a style parameter threaded through
  `keySignatureAccidentals`.

## 6. How to revert/remove it

Delete `src/geometry/key-signature.ts`, `src/render/key-signature.ts`,
`test/unit/key-signature.test.js`, and the `key-signature-d-major.snap`
file; remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
