# Integration I — slurs and tuplets wired into rendering

**Not a numbered phase.** Phases 27 and 28 built §9.16's and §9.17's geometry
and recorded that nothing drew it, because `<notations>` parsing was v2 scope.
Phase 35 Tier 2 closed that; this pass connects them.

**Status:** complete. `npm run verify` clean (646 tests).

## 1. What was written

### `EventAnchor` and why spans are a second pass

A slur or a tuplet cannot be drawn while walking events, because **both
endpoints must already be placed before either can be drawn** — and a span
legitimately covers beamed notes, chords and plain notes, which are three
different drawing paths in `render-from-musicxml.ts`.

So each path now returns an `EventAnchor` (`x`, `topPosition`,
`bottomPosition`, `direction`, `noteheadGlyph`) for every note it draws:

- `renderNoteOrRest` already returned `tieAnchor`; the caller builds an
  `EventAnchor` from it.
- `renderBeamGroup` now returns one anchor per member note.
- `renderChord` now returns one anchor for the chord.

The voice loop collects them into `anchorByIndex`, then calls `renderSpans`.
Capturing geometry as it is drawn — rather than re-deriving it — is the point:
a second implementation could disagree with the first.

### `renderSpans`

- **Slurs (§9.16).** Open spans are tracked per slur `number`, so two nested
  or overlapping slurs resolve independently. The side is `slurSide(every
  member's stem direction)` — one decision for the whole span, not per note.
  The curve's y clears the span's highest (above) or lowest (below) notehead.
  A one-note "span" is rejected rather than drawn, exactly as §9.16 requires.
- **Tuplets (§9.17).** `tupletBracketNeeded(allMembersBeamed)` decides the
  bracket: a fully-beamed group already shows its own extent, so only the
  number is drawn. The side is `tupletSide(direction)` — the **stem** side,
  which is the OPPOSITE relationship from a tie or slur. Getting that backwards
  is the specific mistake §9.17 warns about, so there is a test asserting a
  down-stem tuplet's number sits *below* while a slur over the same notes
  would sit above.

### Scope, stated rather than implied

A span is resolved **within one voice of one measure**. A slur or tuplet
crossing a barline is not drawn and reports `UNMATCHED_SLUR` /
`UNMATCHED_TUPLET` — the same honest boundary Phase 26's ties already draw, and
for the same reason: nothing here can see the next measure's x positions.

Four diagnostics, all `info`, all tested:

| Code | When |
|---|---|
| `UNMATCHED_SLUR` | a stop with no start, or a start that never stops in the measure |
| `UNMATCHED_TUPLET` | the same, for tuplets |
| `TUPLET_WITHOUT_RATIO` | a `<tuplet>` with no `<time-modification>` to take its number from |
| `TUPLET_NUMBER_UNSUPPORTED` | a 10-or-more-note tuplet — §9.17's own single-digit limit, reported rather than thrown |

## 2. A bug found while wiring this

`renderBeamGroup`'s caller derived its member list and its x positions from
**two separately filtered lists**: `groupNotes` filtered to real `Note`s while
`groupXs` mapped every index unfiltered. Any group member that was not a plain
note would have silently shifted every following note onto the wrong x.
Nothing can currently put a non-note in a beam group — which is exactly why
this would have been so hard to find if something ever did. Both now derive
from one `groupIndices` list.

## 3. How to modify it

| Want to change | Where |
|---|---|
| How far a slur clears its notes | `SLUR_GAP` (1.2sp) in `render-from-musicxml.ts` |
| How far a tuplet bracket/number sits | `TUPLET_GAP` (1.8sp) |
| Slur curve depth | `SLUR_BULGE_HEIGHT` in `geometry/slur.ts` |
| Bracket hook length | `HOOK_LENGTH` in `geometry/tuplet.ts` |
| Where a slur starts horizontally | the `first.x + noteheadWidth(...)` in `renderSpans` — the same convention ties use |

## 4. How to revert it

Delete `renderSpans`, `spanSourceNote`, `EventAnchor`, the `anchors`/`anchor`
return values from `renderBeamGroup`/`renderChord`, the `anchorByIndex` map
and its call site, and the slur/tuplet imports and constants. The
`groupIndices` fix is independent and worth keeping.

Tests: `test/unit/slur-tuplet-wiring.test.js`, the `slur-tuplet.musicxml`
fixture, and the `render-from-musicxml-slur-tuplet` snapshot.
