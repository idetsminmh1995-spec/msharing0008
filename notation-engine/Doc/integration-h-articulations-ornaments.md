# Integration H — articulations and ornaments wired into rendering

**Not a numbered phase.** Phase 30 built §9.19's and §9.20's geometry and
stated plainly that nothing drew it, because `<notations>` parsing was v2
scope. Phase 35 Tier 2 closed that, so this pass connects the two.

**Status:** complete. `npm run verify` clean (646 tests).

## 1. What was written

`src/render-from-musicxml.ts` gained `renderNoteMarks(source, x,
topPosition, bottomPosition, direction, ctx)`, called from all three
note-drawing paths: the plain path (`renderNoteOrRest`), the beamed path
(`renderBeamGroup`) and the chord path (`renderChord`).

It is one function because the *call sites* are three; it is **not** one loop
over "marks near a note", because §9.19 and §9.20 specify genuinely different
rules and conflating them is the mistake §9.20 explicitly warns about:

- **An articulation** goes on the NOTEHEAD side — opposite the stem —
  adjacent to the notehead itself. `articulationSide` decides which.
- **Marcato** is §9.19's one named exception: *always above the staff*,
  whatever the stem does. It therefore uses an above-the-**staff** cursor, not
  the notehead one.
- **An ornament** is always above, unconditionally, and sits clear of the
  staff. There is no stem parameter in `ornamentGlyphName` at all, by design.

Marcato and ornaments share one above-the-staff cursor, so a note carrying
both does not draw them on top of each other. Stacked marks step outward by
one gap each.

`topPosition`/`bottomPosition` are the event's highest and lowest noteheads —
the same value for a single note, the outer notes for a chord. A chord's
`<notations>` live on its FIRST `<note>` (the rest carry only `<chord/>`),
which is where the marks are read from, but they clear every member rather
than just that one.

### The empty-string guard

`renderNoteMarks` returns `''` when a note has no marks, and every call site
pushes it **only when non-empty**. An unconditional push would add a stray
blank line to every note's output and invalidate every existing snapshot.
There is a test for this.

## 2. How to modify it

| Want to change | Where |
|---|---|
| How far a mark sits from the notehead | `ARTICULATION_GAP` (1.0sp) in `render-from-musicxml.ts` |
| How far an ornament sits above the staff | `ORNAMENT_GAP` (1.5sp) |
| Which side a mark takes | `articulationSide` in `geometry/articulation.ts` — the rule, not the wiring |
| Which glyph a mark uses | `GLYPH_NAMES` in `geometry/articulation.ts` / `geometry/ornament.ts` |

Both gaps are **chosen values**, stated as such: §9.19/§9.20 specify the side
and the glyph, not a distance, and no source gives one universal number —
exactly the situation Phase 24's beam-slope cap and Phase 31's hairpin spread
already documented.

## 3. What this pass deliberately did NOT do

- **Fermata.** Parsed (§10.4 requires it) and carried on `Note`/`Rest`, but
  **not drawn**: §9 has no fermata placement section, and inventing one here
  would be guessing at a spec rather than implementing it.
- **§9.19's multi-voice exception**, where marks move to the STEM side to keep
  each voice's marks unambiguous. §9.19 states this as a known limitation and
  it stays one.
- **Combined marks** (staccato+accent as one glyph). Same — §9.19's own scope
  note.
- A mark on a **grace note**. Grace notes draw as one precomposed Phase 34
  glyph and never reach this code.

## 4. How to revert it

Delete `renderNoteMarks` and its three call sites, plus the
`articulationGlyphName`/`articulationSide`/`ornamentGlyphName` imports and the
two gap constants. Nothing else depends on it: Phase 30's geometry goes back
to being built-but-unwired, exactly as before.

Tests: `test/unit/articulation-ornament-wiring.test.js`, the
`articulations-ornaments.musicxml` fixture, and the
`render-from-musicxml-articulations-ornaments` snapshot.
