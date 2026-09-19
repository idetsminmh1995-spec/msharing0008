# Integration J — dynamics and hairpins wired into rendering

**Not a numbered phase.** Phase 31 built §9.21's dynamics and hairpins and
recorded that nothing drew them, because `<direction>` parsing was v2 scope.
Phase 35 Tier 2 closed that; this pass connects them.

**Status:** complete. `npm run verify` clean (646 tests).

## 1. What was written

A `<direction>` attaches to a measure POSITION, not to a note, so unlike
Integration H's marks it needs its own x resolution.

### `directionXFor(measureNumber, tick)`

Uses the **same** `MEASURE_HEADER_ALLOWANCE` + `positionsByTick` path the note
pass uses for `noteAreaX`. Integration G's hard-won lesson was that a marking
computing its x in a different coordinate system than the notes drifts away
from them as soon as a measure's width changes — so this deliberately does not
invent a second formula. A tick with no note of its own falls back to a
fraction of the measure, like the note pass does.

### Dynamics

Drawn per (measure, staff), before the notes, at
`dynamicGlyphName(level)`. Placement is §9.21's default — **below** the staff
— unless the file states `placement="above"`, which is honoured rather than
silently overridden, the same way Phase 35 already lets an explicit `<stem>`
or `<notehead>` win over this engine's own convention.

Several `<dynamics>` children in one element are ONE compound marking
(`<sf/><p/>` is "sfp"), so they lay out left to right by glyph width rather
than stacking on one spot.

### Hairpins

A wedge's two ends can sit in **different measures**, so spans are resolved
once per part, up front, keyed by `staff:number` (a wedge's own `number`
distinguishes overlapping wedges; the staff keeps two staves' wedges from
closing each other's spans). Resolved spans are stored by the measure they
START in, so each is drawn exactly once.

`computeHairpinShape` then draws it as §9.21 specifies: two line segments
meeting at the narrow end, opening (crescendo) or closing (decrescendo) —
mirror images, not two independently-built shapes. There is a test asserting
exactly that mirroring.

### Diagnostics

| Code | When |
|---|---|
| `UNMATCHED_WEDGE` | a stop with no start, or a start that never stops in the part |
| `WEDGE_CROSSES_SYSTEM` | (page mode) the two ends land in different systems, where the x axis restarts and the y differs — one line between them would run diagonally across the page. Real engraving splits such a hairpin at the break; that is not built, so this says so rather than drawing something wrong |

## 2. How to modify it

| Want to change | Where |
|---|---|
| How far a dynamic/hairpin sits from the staff | `DYNAMIC_GAP` (2.5sp) in `render-from-musicxml.ts` |
| A hairpin's opening height | `HAIRPIN_SPREAD` in `geometry/hairpin.ts` |
| Which dynamic levels exist | `GLYPH_NAMES` in `geometry/dynamic.ts` **and** `DYNAMIC_ELEMENTS` in `parser/musicxml/direction.ts` — both, or a file's level parses into nothing drawable |
| Whether an explicit `placement` is honoured | the `d.placement ?? dynamicSide()` expression |

## 3. What this pass deliberately did NOT do

- **`<words>` and `<rehearsal>` text.** Parsed and preserved, not drawn.
  §9.21 is explicit that a real rehearsal mark needs general text composition
  this engine does not have, and Bravura contains no Latin letters at all.
  Faking it with a placeholder would be worse than the gap.
- **§9.21's vocal-music exception** (dynamics above, to clear lyrics). §9.21
  scopes it out for lack of lyric-awareness, and that is still true.
- **Splitting a hairpin across a system break** — see `WEDGE_CROSSES_SYSTEM`.

## 4. How to revert it

Delete the `partDirections`/`wedgeSpansByMeasure` block, the dynamics/hairpin
drawing block in the staff loop, `directionXFor`, and the
`computeHairpinShape`/`dynamicGlyphName`/`dynamicSide`/`renderHairpin` imports
plus `DYNAMIC_GAP`/`HAIRPIN_THICKNESS_FALLBACK`. The parser's `directions`
side-table can stay; nothing breaks if it is simply unread.

Tests: `test/unit/dynamics-hairpin-wiring.test.js`, the
`dynamics-hairpin.musicxml` fixture, and the
`render-from-musicxml-dynamics-hairpin` snapshot.
