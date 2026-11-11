# Phase 21 — Naive Layout + `renderFromMusicXml()` End to End

**Status:** complete (190/190 tests pass, including 8 new tests against
real fixture files and a real-XML-to-SVG visual snapshot). Every glyph
codepoint and every X/Y position in the actual rendered output was
hand-verified against the formulas from Phases 9–19, not just checked for
"something rendered."

Per `PLAN.md` §22's sequencing note, this phase is **deliberately naive
and meant to be thrown away** once Stage 8's real layout (spacing,
collision avoidance, system/page breaking) lands. Phase 22, next, is the
milestone that validates this whole slice against real files.

## 1. What was written

**`src/layout/naive.ts`** — `naiveMeasureLayout(measureCount, measureWidth)`:
fixed-width measures placed left to right, nothing else. This is the
entire "layout" this phase does; genuinely minimal on purpose.

**`src/render-from-musicxml.ts`** (new, at the top level of `src/`, not
inside any of the internal `core/glyphs/config/geometry/render/parser/
layout` modules) — this is where **`renderFromMusicXml(xmlText, options?)`**
lives, per the folder-structure note that `index.ts` (and its supporting
top-level files) is the "public API barrel," the one place allowed to
depend on every internal module rather than being bound by §4.1's strict
internal dependency graph. It:

- Calls Phase 20's `parseMusicXml`, then renders **only the first part**
  (multi-part/grand-staff layout is Phase 29's job).
- Maps each measure's raw `clefSign`/`clefLine` to one of Phase 10's 8
  clef constants (`mapClef`), and raw `barlineStyle`/`repeatDirection` to
  one of Phase 13's 7 `BarlineType`s (`mapBarline`) -- exactly the
  "integration" work `MeasureAttributes`' own doc said was a later step's
  job, not the parser's.
- Draws clef/key signature/time signature **once at the start, and again
  only when they change** between measures (comparing each measure's
  `MeasureAttributes` against the previous one) -- not redundantly on
  every single measure.
- Recovers gracefully from an unsupported key-signature clef (Phase 11's
  tenor/soprano gap): catches the exception `keySignatureAccidentals`
  throws and appends an `UNSUPPORTED_KEY_SIGNATURE_CLEF` diagnostic
  instead of crashing.
- Positions each voice's events **proportionally by tick** within a
  measure: since Phase 3's `Voice` doesn't store each event's start tick,
  `eventStartTicks` reconstructs it by accumulating each event's own
  `Duration.ticks` in order -- this is what makes two voices (e.g. 4
  quarter notes against one whole note) visually align at their true
  simultaneous positions rather than just being spaced by event count.
- Renders every event kind through the full Phase 14–19 pipeline:
  notehead selection, ledger lines, stem (direction + length + real
  anchor attachment), a flag for any unbeamed eighth-or-shorter note (no
  beam engine exists yet, so this is always true in v1), and accidentals
  via Phase 19's state machine, reset at each measure boundary (or
  rebuilt fresh if the key signature itself changed).
- Handles chords through the same pipeline, but as one function
  (`renderChord`) that draws N noteheads at one X, stacks their
  accidentals via Phase 19's `assignAccidentalColumns`, and draws **one**
  shared stem sized/directed by the chord's outermost note (Phase 16's
  `chordStemDirection`).
- Skips notes entirely (with an `UNSUPPORTED_CLEF_FOR_NOTES` info
  diagnostic) for a clef where `positionsByPitch` is `false` (tab) --
  never crashes, matches §18.4's "renderers never throw on missing
  optional data."
- Returns `{ svg, diagnostics }` — never a bare string, per §18.4's public
  API contract, so a caller always has the option to surface problems
  even on an otherwise-successful render.

## 2. How this was verified

Ran `npm run verify` clean, 190/190 (8 new unit tests + 1 new visual
snapshot, on top of the 182 already passing). Beyond the automated tests,
every fixture's actual rendered output was manually traced against the
source formulas before trusting the automated assertions:

- `simple-single-voice.musicxml` → confirmed the gClef codepoint, the
  4/4 time signature's two digit glyphs, all 4 quarter notes' exact X/Y
  (matching `staffPositionForPitch`'s treble-clef values for C4/D4/E4/F4
  precisely), the half note's **open** notehead (`noteheadHalf`, not
  `noteheadBlack` -- confirming Phase 15's duration-based fill selection
  fired correctly), the half rest's Y (exactly `middleLineY(5)`), and one
  stem's exact attach/end coordinates against Phase 16's anchor-based
  formula.
- `chord.musicxml` → confirmed 3 separate noteheads at one shared X, one
  shared stem sized to the chord's outermost note, a quarter rest at the
  middle line, and a half note with its own correctly-positioned stem --
  each of the three different event kinds (chord, rest, note) in
  sequence, not just one in isolation.
- `two-voice-backup.musicxml` → confirmed **5** total noteheads render (4
  from voice 1 + 1 from voice 2), not 4 -- the same protection Phase 20's
  own parser-level test already established, now confirmed to survive
  all the way through rendering too.
- Every fixture file in the whole `test/fixtures/musicxml/` directory
  (all 10, including the deliberately malformed ones from Phase 20's
  completion pass) confirmed to render without throwing.
- A non-`score-partwise` document still produces a valid, well-formed
  (if empty) SVG plus its diagnostic, never an exception.

## 3. Known limitations (intentional -- this phase is meant to be replaced)

- **Fixed measure width regardless of content.** A measure with one whole
  note gets exactly the same width as one with 8 sixteenth notes. Stage 8
  (Phase 43) replaces this with real proportional spacing (§14).
- **No multi-voice collision avoidance.** Two voices' notes/rests can
  visually overlap if they land at similar positions; Phase 25 (§13)
  handles this properly.
- **Only the first part renders.** A multi-part/grand-staff score's other
  parts are silently ignored for now; Phase 29 adds real multi-part
  layout.
- **No beaming.** Every eighth-or-shorter note gets its own flag, even
  ones that should be visually grouped; Phase 23/24 add the beam engine.
- **Percussion/tab/unpitched content never appears** -- inherited
  directly from Phase 20's v1 parser scope (§10.4/§10.5 are v2, Phase 35).

## 4. How to modify it

- **Change the fixed measure width** — `MEASURE_WIDTH` in
  `render-from-musicxml.ts`.
- **Add a new clef sign mapping** — `mapClef`.
- **Add a new barline style mapping** — `mapBarline`.
- Given this phase's explicitly throwaway nature, larger changes should
  usually go toward building the REAL replacement (Stage 8) rather than
  extending this file further.

## 5. How to revert/remove it

Delete `src/render-from-musicxml.ts` and `src/layout/naive.ts` (and
`src/layout/index.ts` if nothing else uses it), remove the
`export * from './render-from-musicxml.js';` and
`export * from './layout/index.js';` lines from `src/index.ts`, delete
`test/unit/render-from-musicxml.test.js` and the
`render-from-musicxml-simple.snap` file, and remove the added test case
from `test/visual/rendering.test.js`.
