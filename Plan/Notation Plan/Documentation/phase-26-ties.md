# Phase 26 — Ties

**Status:** complete for single-staff, single-note ties within one system,
including ties across measure barlines. System-break continuations,
cross-staff ties, beamed-note ties, and chord-member ties remain documented
limitations, not gaps silently left unaddressed — see §3.

Same pattern as the two prior phases: another `§9.X` specification gap
found and fixed before writing any code.

## 0. Another plan gap, found and fixed before implementing

`PLAN.md` had no dedicated tie specification at all (only a passing
mention at `§10.8` distinguishing MusicXML's `<tie>` from `<tied>`).
Verified the actual rule against multiple independent sources before
writing anything: Wikipedia's "Tie (music)" and a teaching guide (Da Capo
Academy) both state the identical rule with zero disagreement — a tie
sits on the side *opposite* its note's stem, and a whole note (no real
stem) still gets a side by imagining where its stem would have gone.
Checked Bravura's own `engravingDefaults` for real numbers rather than
guessing: `tieEndpointThickness` = 0.1sp, `tieMidpointThickness` = 0.22sp
— confirming a tie visibly tapers (thin at the ends, thicker at the
peak), unlike a beam's uniform thickness. Added `PLAN.md` `§9.15` with the
full spec, sources, and named test cases before touching any code.

## 1. What was written

**`src/geometry/tie.ts`**:
- **`tieSide(stemDirection)`** — the universal rule: `'down'` stem →
  `'above'`; anything else → `'below'`. Takes the note's own *already
  resolved* direction (which may be forced, per `§9.14`, in a multi-voice
  context) rather than recomputing anything fresh — exactly what
  Wikipedia's own caveat ("unless there are two or more voices
  simultaneously") is warning against skipping.
- **`computeTieShape(startX, endX, y, side)`** — the endpoints plus a
  chosen `0.5`sp bulge height (no source gives one universal number here
  either, the same situation Phase 24's beam-slope cap and Phase 25's
  rest-offset already handled the same way).

**`src/render/tie.ts`** — **`renderTie`** draws a *filled tapered lens*
(two quadratic Béziers sharing the same two endpoints, one curving to
`bulgeHeight − midpointThickness/2` and the other to `bulgeHeight +
midpointThickness/2`) rather than a single uniform-stroke line — this is
what actually reproduces Bravura's endpoint/midpoint thickness
distinction. Stated simplification: the two curves meet at exactly the
same endpoints (tapering fully to a point) rather than to Bravura's real,
small-but-nonzero endpoint thickness; visually close at this engine's
scale, noted as a future refinement rather than silently claimed exact.

**`src/render-from-musicxml.ts`** — wired into the main render loop:
`renderNoteOrRest` now computes its note's resolved stem direction
*unconditionally* (previously only computed when actually drawing a real
stem, i.e. never for whole notes) and returns it, along with the
notehead's position and glyph, as a `tieAnchor`. A per-part map keyed by
staff and voice carries a `pendingTie` anchor across measures: when a note
has `tieStart`, its anchor is remembered; when a later note in that voice
has `tieStop`, a tie is drawn from the remembered anchor's right edge to
the new note's own X, using the first note's resolved direction to pick
the side. The endpoints must share a system; a system break receives an
explicit diagnostic instead of an invalid diagonal curve.

## 2. How this was verified

Ran `npm run verify` clean, 237/237. Beyond the plan's own named
geometry tests (down→above, up→below, a whole note still resolving a
side, the taper actually differing between the two curves, and the
above/below sign checked directly against the rendered path's own
coordinates rather than assumed):

- A real fixture (`tied-note.musicxml`: two tied C5 quarter notes, then an
  untied D5 half note) renders **exactly one** tie path, anchored at
  `6 + 1.18` (the first note's own X plus `noteheadBlack`'s real width —
  its right edge) and ending at `10.5` (the second note's own X) —
  checked against the actual rendered numbers, not just "a path exists
  somewhere."
- The same fixture's tie control points were confirmed to sit **above**
  the notes' shared Y (C5 is high, so its automatic direction is `down`,
  so the tie correctly goes `above`) — the sign, not just the presence,
  of the curve.
- A visual snapshot pins the complete rendered SVG for this fixture as a
  regression check.

## 3. Known limitations (stated, not silently missing)

- **A tie that crosses a system break is not drawn.** A tie between measures
  on the same system is now engraved across their shared barline. When the
  measures are on different systems, one continuous curve would be
  geometrically wrong; the renderer reports `TIE_CROSSES_SYSTEM` instead of
  drawing a diagonal across the page. Splitting the tie into system-edge
  continuations remains future work.
- **A tie between different staves is not drawn.** Pending anchors are
  keyed by staff and voice; the renderer does not yet position a cross-staff
  tie around the intervening staff content.
- **Ties into or out of a beamed note aren't drawn.** `renderBeamGroup`
  doesn't expose a `tieAnchor` the way `renderNoteOrRest` now does, so a
  tie touching a beamed member is silently skipped rather than drawn
  incorrectly.
- **Ties on chords aren't drawn**, matching `§9.15`'s own stated
  chord-tie limitation (each chord member needing its own independently
  resolved side is real notation practice, not yet implemented).

None of these were rushed to completion under time pressure — each is the
same class of honestly-scoped gap as Phase 23's beam-drawing deferral or
Phase 25's notehead-collision wiring, tracked here and in `Documentation/STATUS.md`
rather than silently left unaddressed.

## 4. How to modify it

- **Change the bulge height** — `TIE_BULGE_HEIGHT` in `geometry/tie.ts`.
- **Support ties across system breaks** — split the tie into outgoing and
  incoming system-edge continuations with independent geometry rather than
  connecting coordinates from two systems with one curve.
- **Support chord/beam ties** — extend `renderChord`/`renderBeamGroup` to
  also return a `tieAnchor`-shaped value per member note, then extend the
  render loop's `pendingTie` bookkeeping to track one per relevant note
  rather than assuming a single plain note stream.

## 5. How to revert/remove it

Delete `src/geometry/tie.ts`, `src/render/tie.ts`, `test/unit/tie.test.js`,
the `tied-note.musicxml` fixture and its snapshot; remove their
`export * from` lines from the geometry/render barrels; remove the tie
wiring from `render-from-musicxml.ts` (the `pendingTie` tracking and the
`tieAnchor` return value, reverting `renderNoteOrRest`'s direction
computation back to only running inside the `duration.type !== 'whole'`
branch); remove the added test cases from `render-from-musicxml.test.js`
and `test/visual/rendering.test.js`.
