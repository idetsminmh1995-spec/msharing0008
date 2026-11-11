# Integration Pass B — Every part renders (and per-staff line counts)

**Status:** complete. 435/435 tests pass. A guitar MusicXML file with a
separate tab part now renders **both** parts, stacked, with the tab part
drawing its real **six** staff lines.

Companion to `integration-a-grand-staff.md`. Like A, this is a
corrective/integration pass, not a numbered plan phase.

## 0. What was wrong

`renderFromMusicXml` took `score.parts[0]` and rendered only that. Its
own doc comment said so ("only the FIRST part is rendered"), deferring to
`PLAN.md` `§22`'s note that this renderer "exists to be thrown away" once
Stage 8's real layout lands.

The practical effect: a guitar score exported as two parts (standard
notation + tablature) silently lost its entire tab part. Same for any
ensemble score — only the top instrument appeared.

Separately, every staff was drawn with a hardcoded 5 lines, which is
wrong for a tab staff (6) and for some percussion parts (1).

## 1. What was built

**Every part renders.** The whole per-part body now runs inside
`score.parts.forEach`. Crucially this reuses Phase 29's
`computeSystemLayout` **as it was actually designed** — it always
accepted a `partStaffCounts` **array** and handled multi-part stacking
(`DEFAULT_PART_GAP` between parts, `DEFAULT_STAFF_GAP` within one), but
Integration A had only ever passed it a single part's count. Passing the
real per-part counts makes each part's own staves offset correctly below
every part above it, with no new layout code.

A small `staffOffsetFor(partIndex, staffIndexInPart)` helper resolves a
staff's vertical offset out of that one score-wide layout.

**Per-staff line counts, read from the file.** New
`staffLinesByStaff` on `AttributesUpdate`/`MeasureAttributes`, parsed
from `<staff-details><staff-lines>` and keyed by staff number. The
renderer computes a per-staff `staffGeometry` from it, defaulting to 5.

Deliberately driven by the **file**, not inferred from the clef: a file
is the authority on its own staff, and a clef genuinely does not imply a
line count (percussion parts appear on 1-line and 5-line staves alike).

**Scope of the 5-line assumption that remains.** The note-drawing helpers
(`restY`, `computeLedgerLines`, `middleLineY`, stem math) still use the
`STAFF_LINES` constant. That is safe *specifically* because they only
ever run for a clef with `positionsByPitch: true`, and a tab staff's
notes are skipped entirely with an `UNSUPPORTED_CLEF_FOR_NOTES`
diagnostic — so no note math depends on the 6. This is stated in a code
comment rather than left as a silent coupling.

Other adjustments: `totalWidth` is now the widest part (parts can have
different measure counts); the brace and continuous barline are computed
per part at that part's own offset; the viewBox height comes from the
lowest staff in the score-wide layout.

## 2. How this was verified

`npm run verify` clean, **435/435** (12 new tests + 1 visual snapshot).

**Regression evidence, twice over:** after the multi-part restructure,
all 423 pre-existing tests passed with **zero snapshot changes** —
a single-part file renders byte-identically through the new parts loop.
Then after the per-staff line-count change, again **zero snapshot
changes**.

New tests cover: `<staff-lines>` parsed per staff; a part without
`<staff-details>` correctly having no entry (so the renderer's own
default applies); both parts parsed; **both parts rendered** (treble clef
*and* tab clef present); the tab staff drawing 6 lines while the notation
staff draws 5; the second part strictly below the first with no vertical
overlap; the viewBox containing the lowest staff line; the tab part
reporting `UNSUPPORTED_CLEF_FOR_NOTES` rather than silently drawing
nothing; the notation part still drawing its own notes; a single-part
file unaffected; and a grand staff still getting a brace while two
separate *parts* correctly do not (bracketing different instruments
needs `<part-group>`, which is v2 parser scope).

One real test-authoring mistake was caught and fixed: the first draft's
staff-line helper counted line *elements* rather than distinct heights,
so a 2-measure single staff looked like 10 lines instead of 5. Fixed by
deduplicating on Y.

End-to-end check across all three instrument types that prompted this
work: piano → 2 staves + treble/bass clefs + 5 notes + 0 warnings;
guitar → 11 staff lines + treble/tab clefs + 3 notes + 1 (expected) tab
warning; drum → 1 staff + percussion clef + 3 notes + 0 warnings.

## 3. Known limitations (stated, not silently missing)

- **Tab notes (string/fret numbers) are still not drawn.** The tab staff
  and its clef now render correctly, but the notes themselves need
  number glyphs positioned by string — the separately-scoped "C" work,
  which also needs the general text/number rendering several earlier
  phases are waiting on.
- **No `<part-group>` bracket.** Different instruments grouped for
  ensemble reading should be joined by a straight bracket per `§9.18`;
  `<part-group>` is v2 parser scope (`§10.4`) and is not guessed at.
- **Part spacing is a fixed default** (`DEFAULT_PART_GAP`), not
  content-aware — `§15`'s skyline spacing is still `[TODO]`, so a part
  with very high or low notes can visually crowd its neighbour.
- **No part names/labels** drawn at the left of each staff.
- **Measure alignment across parts is positional, not enforced** — each
  part lays out its own measures at the same fixed width, so parts with
  differing measure counts simply end at different x positions.

## 4. How to modify it

- **Draw tab notes** — needs a number-rendering mechanism plus a
  string→staff-line mapping; `TAB_CLEF.glyphY` and the 6-line staff are
  already in place for it.
- **Bracket instrument groups** — parse `<part-group>`, then use Phase
  29's existing `bracket`/`bracketTop`/`bracketBottom` glyph names.
- **Change part spacing** — `DEFAULT_PART_GAP` in `layout/system.ts`.

## 5. How to revert

Revert `render-from-musicxml.ts`'s `score.parts.forEach` wrapper,
`staffOffsetFor`, per-staff `staffGeometry`, widest-part `totalWidth`,
and score-wide viewBox height (restoring `score.parts[0]`); revert
`staffLinesByStaff` from `attributes.ts` and `parse.ts`; delete
`test/unit/multi-part.test.js`,
`test/fixtures/musicxml/guitar-two-part-tab.musicxml`, and its snapshot.
