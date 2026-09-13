# Phase 31 — Dynamics, Hairpins, Tempo Marks, Rehearsal Marks

**Status:** dynamics and hairpins are complete and tested with real
geometry and rendering. Tempo marks and rehearsal marks have only their
placement rule — full rendering needs general text/multi-glyph
composition this engine has never built (see §2). **Nothing in this
phase is wired into `renderFromMusicXml`** — all four live under
MusicXML's `<direction>`, which is v2 parser scope (`§10.4`).

284/284 tests pass. Eighth consecutive phase confirming a real
specification gap before writing code — and this phase specifically
found that "four marks near a note" hides at least two genuinely
different rendering *mechanisms*, not just different placement rules.

## 0. What was researched before writing anything

- **Dynamics**: below the staff by default, confirmed by MOLA's own
  published guidelines and Wikipedia's "Dynamics (music)". Checked
  `glyphnames.json` and found **precomposed** glyphs
  (`dynamicPP`/`dynamicMF`/etc.) rather than assuming individual-letter
  assembly (p+p, m+f) was needed.
- **Hairpins**: also below by default (same sources). SMuFL *does* define
  `dynamicCrescendoHairpin`/`dynamicDiminuendoHairpin` glyphs — but their
  own bounding boxes (~2.9 x ~1.05sp) were checked before assuming they
  were usable for real notation: that's a small, fixed size suited to a
  palette icon, not something that can span an arbitrary musical
  distance. Confirmed Bravura's real `hairpinThickness` (0.16sp) instead,
  the correct value for drawing a hairpin as scalable *geometry* (two
  line segments), the same reasoning Phase 29 already applied to the
  brace glyph question in reverse (there, a real glyph *was* the right
  answer, just needing a scale transform; here, drawn geometry is the
  right answer instead).
- **Tempo/rehearsal marks**: placement confirmed (tempo marks
  above — directly, from Finale's own tutorial; rehearsal marks above —
  near-universal convention). But building either mark's actual content
  (a note-value glyph + "=" + a number; an arbitrary letter/number in a
  box or circle) would need composing multiple glyphs or arbitrary text
  — something this engine has never done. Every glyph drawn anywhere in
  this engine so far has been one single SMuFL character resolved by
  name; there is no general text-layout mechanism at all. Rather than
  fake this with a placeholder, this phase implements only the placement
  rule and states the gap plainly.

## 1. What was written

**`src/geometry/dynamic.ts`** — `dynamicSide()` (always `'below'`),
`dynamicGlyphName(level)` (9 real precomposed glyphs: ppp/pp/p/mp/mf/f/
ff/fff/sfz).

**`src/geometry/hairpin.ts`** — `computeHairpinShape(startX, endX, y,
kind)`: a crescendo opens narrow-to-wide left to right; a decrescendo
closes wide-to-narrow — deliberately built as mirror images of the same
shape, not two independently-designed ones. `spread` (the half-height of
the wide end) is a chosen value with no universal source number, the
same situation as every bulge/slope/offset constant chosen throughout
Phases 24-30.

**`src/geometry/expression-mark.ts`** — `tempoMarkSide()` /
`rehearsalMarkSide()`, both `'above'`, placement-only per the stated
limitation.

**`src/render/hairpin.ts`** — `renderHairpin` draws the two line segments
using Bravura's real `hairpinThickness`. Dynamics reuse Phase 30's
existing `renderMark` (one glyph at one position) rather than a new
function, since a dynamic mark is exactly that.

## 2. How this was verified

Ran `npm run verify` clean, 284/284 (9 new tests):
- All 9 dynamic levels resolve to real, mutually distinct glyphs (via a
  `Set`, not just "no error").
- A crescendo's rendered lines both start at its narrow end (`startX`)
  and end at the wide end (`endX`); a decrescendo's do the reverse —
  checked against the actual rendered coordinates, not just the
  function's return value.
- The two hairpin lines spread to opposite Y sides of the baseline
  (one above, one below), and a crescendo/decrescendo pair with
  identical endpoints are confirmed to produce genuinely different SVG
  output (not accidentally identical) while sharing the same `spread`
  magnitude.
- `tempoMarkSide`/`rehearsalMarkSide` both confirmed `'above'`.

## 3. Known limitations (stated, not silently missing)

- **Nothing here is wired into `renderFromMusicXml`** — `<direction>`
  (which carries `<dynamics>`, `<wedge>`, `<metronome>`, `<rehearsal>`)
  is `§10.4` (v2) scope, the same situation as Phases 27/28/30.
- **Vocal-music dynamics-above exception** not implemented (no
  lyric-awareness), the same class of gap `§9.18` already noted.
- **Tempo marks and rehearsal marks have no actual glyph/text rendering
  at all** — only their placement rule. Real implementation needs a
  general multi-glyph/text composition mechanism this engine doesn't
  have; building that is real, separate future work, not a small
  addition to this phase.

## 4. How to modify it

- **Change the hairpin spread** — `HAIRPIN_SPREAD` in
  `geometry/hairpin.ts`.
- **Add a general text/multi-glyph layout mechanism** — the prerequisite
  for real tempo-mark and rehearsal-mark rendering; would likely live as
  its own module given how much other future work (lyrics, chord
  symbols — Phases 32-33) would also need it.
- **Wire in real parsing** — once Phase 35/36's v2 parser produces
  `<direction>` data, thread these functions through
  `renderFromMusicXml`.

## 5. How to revert/remove it

Delete `src/geometry/dynamic.ts`, `src/geometry/hairpin.ts`,
`src/geometry/expression-mark.ts`, `src/render/hairpin.ts`, and
`test/unit/expression-marks.test.js`; remove their `export * from` lines
from the geometry/render barrels. Nothing in `render-from-musicxml.ts`
references any of this, so no wiring needs to be undone there.
