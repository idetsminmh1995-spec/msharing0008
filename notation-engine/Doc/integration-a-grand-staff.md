# Integration Pass A — Grand Staff (multi-staff parts)

**Status:** complete. 423/423 tests pass. A piano MusicXML file now
renders as a real grand staff — two staves, independent treble/bass
clefs, a brace joining them, and one continuous barline through both.

**Not a numbered plan phase.** This is a corrective/integration pass,
prompted by real rendered output showing that a piano file produced one
staff with the bass notes piled onto the treble staff under a stack of
ledger lines. `PLAN.md`'s Phase 43 is "real layout" (skyline spacing) —
unrelated — so this work is deliberately named "Integration A" in code
comments rather than "43a", which would wrongly imply it belongs to that
phase.

## 0. Why this was needed

Phase 29 built the grand-staff *geometry* (`needsBrace`,
`needsContinuousBarline`, `computeSystemLayout`, `renderBrace`) and its
own doc stated plainly that it was **not wired** into
`renderFromMusicXml`, because doing so needed both `<staves>` parsing and
a restructure of the render loop's single-staff assumption.

That remained true through Phase 42. The practical consequence — which
only became visible when a real piano file was rendered — is that the
engine looked far more complete in its docs than it behaved in the app.
This pass closes that specific gap.

## 1. What was wrong, confirmed in code before changing anything

Four findings, each verified directly rather than assumed:

1. **`<staves>` was never parsed.** The string `staves` did not appear
   anywhere in `parser/musicxml/`.
2. **Only one clef was kept per part.** `parseAttributesElement`
   explicitly took the first (or `number="1"`) `<clef>` and discarded the
   rest — its own comment said multi-staff clefs were "a later phase's
   concern".
3. **`note.staff` was parsed but never used when rendering.** The only
   `.staff` reference in `render-from-musicxml.ts` was the unrelated
   `drumEntry.staffPosition`.
4. Empirically: a 2-staff piano file parsed to `clefSign: G` only, with
   its C3 bass note rendering on the treble staff under **5 ledger
   lines** — exactly the reported symptom.

## 2. What was built

**`parser/musicxml/attributes.ts`** — new `ClefSpec` type;
`AttributesUpdate` gains `staves` and `clefsByStaff` (every `<clef>`
keyed by its `number`, an unnumbered clef being staff 1). `clefSign`/
`clefLine` are kept, mirroring staff 1's clef, so every pre-existing
caller is unaffected.

**`parser/musicxml/parse.ts`** — `MeasureAttributes` gains `staves` and
`clefsByStaff`. The running clef state merges **per staff**
(`{ ...current, ...update }`), so a mid-piece `<clef number="2">` change
cannot wipe staff 1's clef — a plain object replace would have.

**`render-from-musicxml.ts`** — the measure body now runs once per staff:
- each staff resolves **its own** clef from `clefsByStaff[staffNumber]`,
  falling back to staff 1's;
- each staff's vertical offset comes from Phase 29's own
  `computeSystemLayout`, finally giving that function a real caller;
- events are filtered by `event.staff ?? 1`, so each staff draws only its
  own notes — while x positions are still computed from *all* the
  voice's events, deliberately, so a bass note stays horizontally aligned
  under the treble note it sounds with;
- accidental state became **per staff** (a measure-local accidental on
  the treble staff must not carry onto the bass staff);
- the brace is drawn once per system when `needsBrace(staffCount)`;
- the barline is drawn once, spanning every staff and the gaps between
  them, per `§9.18`'s continuous-barline rule — not one barline per staff;
- the SVG viewBox grows to fit the extra staves, without which the lower
  staff was simply clipped away.

A single-staff part runs this loop exactly once and produces
**byte-identical** output to before (see §4).

## 3. A second, pre-existing bug found along the way: clef glyph placement

While verifying the bass clef, its glyph turned out to be sitting three
staff spaces too low. The cause was general, not grand-staff specific:
**`renderClef` was being passed `y: bottomY`**, the staff's bottom line,
for *every* clef — `ClefDefinition.referenceY` existed but was never used
for drawing.

Confirmed against SMuFL's own bounding boxes rather than guessed:

| glyph | bBox (y) | origin sits on | was drawn at | error |
|---|---|---|---|---|
| `gClef` | -2.632 … +4.392 | G line (-1) | bottom line (0) | 1 space low |
| `fClef` | -2.540 … +1.048 | F line (-3) | bottom line (0) | **3 spaces low** |
| `unpitchedPercussionClef1` | -1.0 … +1.0 (symmetric) | middle line (-2) | bottom line (0) | 2 spaces low |

Treble's 1-space error was small enough to look plausible, which is why
it survived from Phase 10 until a bass clef made it obvious.

**Fix:** a new `ClefDefinition.glyphY`, deliberately **separate** from
`referenceY`. For pitch clefs the two coincide (a clef glyph's origin is
by design the line it names), so `glyphY` defaults to `referenceY`. They
genuinely diverge for the percussion clef, whose `referenceY` borrows
treble's line purely to map `<unpitched>` display positions, while its
symmetric glyph belongs centred on the middle line. Conflating the two
is precisely what produced the table above.

## 4. How this was verified

`npm run verify` clean, **423/423** (18 new tests + 1 visual snapshot).

**The strongest regression evidence:** after the staff-loop restructure
but *before* the clef fix, all 405 pre-existing tests passed with **zero
snapshot changes** — proving a single-staff part renders byte-identically
through the new per-staff loop.

The clef fix then changed 6 snapshots. `git diff` confirmed each changed
file differs by **exactly one line**, and every one of those lines is a
clef `<text>` element — no note, stem, beam, or barline moved anywhere.

New tests cover: `<staves>` parsing; both clefs captured per staff;
staff 1's clef still mirrored for backward compatibility; a single-staff
file still reporting `staves: 1`; per-note `<staff>` retention; two
five-line staves drawn; both clef glyphs present; a brace present for
piano and **absent** for a single-staff file; a taller viewBox; zero
ledger lines where five used to appear; exactly five noteheads (no
duplicate rendering from the staff loop); one continuous barline
spanning y=4→16 rather than one per staff; and each clef type landing on
its correct line, including the percussion/`referenceY` divergence.

## 5. Known limitations (stated, not silently missing)

- **Only the first part still renders.** A multi-*part* score (e.g.
  guitar notation + tab as two parts) still draws `score.parts[0]` only.
  That is the separately-scoped follow-up, not this pass.
- **Tab staves still draw 5 lines.** `TAB_CLEF.glyphY` is set correctly
  for a real **6-line** tab staff, but the renderer draws 5 lines for
  every clef, and tab notes (string/fret numbers) aren't drawn at all
  since `positionsByPitch: false` skips the note block entirely.
- **Staff gap is a fixed default** (Phase 29's `DEFAULT_STAFF_GAP`), not
  content-aware — `§15`'s skyline spacing is still `[TODO]`.
- **Cross-staff beaming** (a beam spanning both staves of a piano part)
  is not supported; each staff beams independently.

## 6. How to modify it

- **Render every part** (the separately-scoped follow-up) — replace
  `score.parts[0]` with a loop, offsetting each part vertically via the
  same `computeSystemLayout` this pass already uses, and bracket
  different-instrument groups per `§9.18` once `<part-group>` is parsed.
- **Give tab its own staff-line count** — `STAFF_LINES` is currently a
  module constant; it must become per-staff, driven by the clef (6 for
  tab), before tab rendering can be correct.
- **Change the staff gap** — Phase 29's `DEFAULT_STAFF_GAP` in
  `layout/system.ts`.

## 7. How to revert

Revert `attributes.ts`'s `ClefSpec`/`staves`/`clefsByStaff`; `parse.ts`'s
matching `MeasureAttributes` fields and running-state merge;
`clef.ts`'s `glyphY` field and its per-clef values;
`render-from-musicxml.ts`'s staff loop, per-staff accidental state, brace,
continuous barline, viewBox growth, and the `clefDef.glyphY` argument to
`renderClef`; delete `test/unit/grand-staff.test.js`,
`test/fixtures/musicxml/piano-grand-staff.musicxml`, and its snapshot;
then regenerate the 6 clef-affected snapshots.
