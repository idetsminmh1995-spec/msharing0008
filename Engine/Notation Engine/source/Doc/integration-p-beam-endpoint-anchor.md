# Integration P — beam endpoints must land on the actual stem, not the raw notehead x

**Not a numbered phase.** Found by the user's own side-by-side comparison
of the deployed hi-hat pattern against a reference render from another
program: even after Integration O's stem-shortening fix, their beam still
didn't match. Pixel measurement of the two images, then of this engine's
own raw SVG output, found a real geometry bug distinct from Integration
O's — a beam endpoint miscalculation, not a stem-length one.

**Status:** complete. `npm run verify` clean (657 tests).

## 1. What was wrong

`renderBeamGroup` (`src/render-from-musicxml.ts`) computed the beam's own
line endpoints from each member's **raw, unadjusted x** —
`members.map((m) => m.x)` — and fed that straight into
`computeBeamShape`'s `noteXs`. But the actual stem for each member is
drawn by `renderStem`, which attaches at `noteX + anchorX`, where
`anchorX` comes from the notehead glyph's own `stemUpSE` (or
`stemDownNW`) anchor — a nonzero offset for essentially every notehead
shape (an X notehead's `stemUpSE` is `1.16`sp to the right of its origin;
a normal notehead's is `1.18`). The beam's drawn endpoints and the stems'
drawn positions were computed from two different x values that were
supposed to be the same point.

For a group's **first** member this is invisible: the beam's raw-x start
sits to the *left* of the true (anchor-adjusted) first stem, which is
harmless overshoot — the beam still fully covers it. For the group's
**last** member it is not invisible: the beam's raw-x end sits `anchorX`
short of the true last stem, so the group's final stem visibly pokes out
past the beam's right edge, disconnected, with neither a beam nor its own
flag (it had been swept into the group, so it never took the individual-flag
path either). Every stem in between happened to still fall inside the
too-short span in the fixtures this surfaced on, which is why the defect
reads as "the last note in each group looks orphaned" rather than
"the whole beam is shifted" — see §3.

Down-stem plain noteheads were unaffected: `noteheadBlack`'s
`stemDownNW` anchor has `anchorX = 0`, so raw x and stem x already
coincided there by coincidence, not by any code path being correct.

## 2. The fix

Compute each member's actual stem-attach x once, before calling
`computeBeamShape`, using the exact same anchor lookup `renderStem` uses
internally (`getGlyph(m.glyph)?.anchors?.[stemUpSE-or-stemDownNW][0]`),
and use *that* — not the raw notehead x — for:

- `computeBeamShape`'s `noteXs` argument (the beam's own start/end x), and
- the `beamYAtX(shape, …)` lookup that finds where each individual stem
  should end on the (possibly sloped) beam.

`renderStem` itself needed no change — it already adds the anchor offset
internally from a raw `noteX`, and continues to receive the raw `m.x` it
always did. The fix is entirely in what `renderBeamGroup` feeds into the
beam-shape and beam-Y calculations, so the beam's own geometry finally
agrees with where the stems it's supposed to connect actually are.

## 3. What actually changed on real content

Confirmed by rendering the project's own `Drum_Lesson_5.musicxml` and
diffing the raw SVG before/after: each hi-hat beam's `x2` endpoint moved
from the last note's raw x (e.g. `22.2`) to its true stem x (`23.36`) —
exactly the `1.16`sp `stemUpSE` offset for `noteheadXBlack`. The group's
last stem, previously drawn from `y1=7.056` to `y2=4` at `x=23.36` with no
beam reaching it, is now spanned by the beam exactly as the first three
already were.

Only two saved visual snapshots changed
(`render-from-musicxml-beamed`, `render-from-musicxml-two-voice-drum`) —
every other beamed fixture in the suite happens to use a down-stem group
(the `stemDownNW` zero-offset case) or isn't beamed at all, so this was
invisible to them; it is not a drum-only fix, it is a generic beam-group
fix that simply had no other up-stem-beamed fixture to surface on before
now. Diffed both changed snapshots line-by-line: the only movement is the
beam `<line>` x1/x2 shifting to match the already-correct stem x1 values
exactly (e.g. `x1="6" x2="8.4"` → `x1="7.18" x2="9.58"`) — nothing else
in either snapshot moved.

Verified visually in headless Chromium against the real drum page with
the real Bravura font: each 4-note hi-hat beam is now one unbroken bar
over all four noteheads, matching the user's reference image — the
previous render's dangling, unbeamed last stem in every group is gone.

## 4. Relationship to Integration O

Integration O (stem shortening) and this fix are two different, real
defects that happened to both affect the same visual passage. O made the
correctly-beamed stems the right *length*; this fix makes the *last* stem
of each beam group actually *part of* the beam at all. Fixing O alone
left this one exactly as visible as before — which is why the user's
follow-up comparison still showed a problem after O shipped.

## 5. How to revert

In `renderBeamGroup`, drop the `stemXs` computation and go back to
passing `members.map((m) => m.x)` directly to `computeBeamShape`, and
`m.x` directly to `beamYAtX`. Regenerate
`render-from-musicxml-beamed.snap` and
`render-from-musicxml-two-voice-drum.snap`.

Tests: the existing beam/chord visual snapshots already cover this
(`render-from-musicxml-beamed`, `render-from-musicxml-two-voice-drum`,
`render-from-musicxml-gm-drum-mapping`) — no new fixture was needed since
real ones already exercised up-stem beam groups; they just weren't being
checked at the pixel level before.
