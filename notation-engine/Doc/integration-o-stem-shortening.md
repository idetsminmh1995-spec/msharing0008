# Integration O — stem shortening for a forced direction pointing away from the staff

**Not a numbered phase.** Prompted directly by the user's own annotated
comparison: their deployed drum chart's hi-hat beam sat visibly farther
from the noteheads than a reference image of the same passage from another
program.

**Status:** complete. `npm run verify` clean (657 tests).

## 1. What was wrong, and why it was already documented as a gap

§9.8's own spec is explicit: *"Default 3.5sp from the notehead. Extended so
the stem reaches at least the middle line when the note is far outside the
staff. **Shortened never below 2.5sp.**"* The shortening half of that
sentence was never implemented. Phase 16's own doc record says so in as
many words: `computeStemLength`'s 2.5 floor was *"currently redundant...
kept for a future shortening phase."* Phase 24 (beam geometry) never
picked it up either. This was a real, acknowledged, deferred gap — not
something this pass is guessing at from nothing.

**Why it only became visible now:** shortening only matters for a note
that is BOTH outside the staff AND has its stem pointing further away from
the staff rather than back toward it. The only way a stem points away from
an already-outside-the-staff note is a forced or explicit direction that
disagrees with what automatic placement would have chosen — and that
combination is exactly what a drum chart produces: §9.14's "hands up, feet
down" forces voice 1 (hi-hat/snare) stems up regardless of pitch, and
Phase 41's own GM table gives hi-hat a naturally high staff position
(§F7/Integration N: −4.5, above the top line). A hi-hat pattern is stems-up
**and** already above the staff — the one case that needed the missing
branch.

## 2. The fix

`computeStemLength` (`src/geometry/stem.ts`) gained a third parameter,
`direction: StemDirection`, and now branches on whether that direction
moves the stem's far end TOWARD the middle line or AWAY from it:

- **Toward the middle** (the ordinary case — automatic direction always
  chooses this way, which is what the original rule was built for):
  unchanged. Extends past 3.5sp only as far as needed to reach the middle
  line, floored at 2.5sp.
- **Away from the middle** (only reachable via a forced or explicit
  direction): shortened below the 3.5sp default by exactly how far the
  notehead already lies beyond the staff's own edge on that side — a note
  still *within* the staff needs no shortening at all — floored at 2.5sp
  so it never collapses into the notehead.

The staff's own half-extent falls out of `staffMiddleLineY` for free
(`middleLineY(numLines) = -(numLines-1)/2`, so `|staffMiddleLineY|` is
exactly that half-extent) — no new parameter needed for it.

All three call sites in `render-from-musicxml.ts` (`renderNoteOrRest`,
`renderBeamGroup`, `renderChord`) already had `direction` resolved locally
before calling `computeStemLength`; passing it through was a one-line
change at each site.

## 3. What actually changed on real content

On the hi-hat pattern from `gm-drum-mapping.musicxml` (single voice,
GM 42's own `stemDirection: 'up'` convention, position −4.5): stem length
3.5 → **3.0** (shortened by the 0.5sp the notehead already sits beyond the
top line). The same 0.5sp reduction appears identically in three other
fixtures that happen to have a note outside the staff with an explicit or
forced away-pointing direction (`v2-elements`, `page-mode`,
`piano-grand-staff`) — the fix is generic, not hard-coded to drums, and
applies consistently everywhere the same real condition occurs.

Checked in a real headless Chromium against the project's own
`Drum_Lesson_5.musicxml`, not only in markup: the beam now sits visibly
closer to the hi-hat noteheads, matching the compactness of the user's
reference image.

## 4. How to modify it

| Want to change | Where |
|---|---|
| The floor stems never shorten below | `MIN_STEM_LENGTH` (2.5sp) in `src/geometry/stem.ts` |
| The default (unshortened, unextended) length | `DEFAULT_STEM_LENGTH` (3.5sp) |
| Whether a direction counts as "toward" or "away" | the `headingTowardMiddle` expression — deliberately written as two explicit `&&` clauses rather than a single formula, so each direction's own condition can be read (and tested) independently |

## 5. Known limitation, stated rather than hidden

The shortening amount is a **linear** reduction (shorten by exactly the
excess-beyond-the-staff distance), chosen because it is the simplest rule
consistent with both ends of the documented range (3.5 at the staff edge,
approaching but not below 2.5 as the excess grows) and because a single
real reference image cannot by itself establish a nonlinear curve with any
confidence. If a future real fixture shows this linear rule still
diverging from real engraving practice at some specific distance, that is
new evidence for a different formula, not something to guess at now.

## 6. How to revert

Remove the `direction` parameter from `computeStemLength` and its
`headingTowardMiddle` branch, restoring the plain
`Math.max(DEFAULT_STEM_LENGTH, requiredToReachMiddle, MIN_STEM_LENGTH)`.
Drop `direction` from the three call sites. Regenerate the four snapshots
this pass touched (`render-from-musicxml-gm-drum-mapping`,
`render-from-musicxml-v2-elements`, `render-from-musicxml-page-mode`,
`render-from-musicxml-piano-grand-staff`) and revert the new assertions in
`test/unit/stem.test.js`.

Tests: `test/unit/stem.test.js` (`describe('stem length (Phase 16,
extended by Integration O)')`), plus the four regenerated snapshots above.
