# Phase 29 — Grand Staff / Multi-Part Systems

**Status:** geometry, layout, and rendering complete and tested (267/267
tests pass). **Not wired into `renderFromMusicXml`** — this is a larger
structural change than the prior few phases' integrations and is
deliberately given its own unhurried pass rather than a rushed retrofit;
see §3.

Completes Stage 4 (Phases 23-29). Sixth consecutive phase where the same
pattern held: another specification gap found and fixed before writing
any code — though this one's content spans `geometry/`, `layout/`, and
`render/` together, since "stack multiple staves into one system" is
genuinely a layout concern, not just a single visual mark like a tie or
tuplet.

## 0. Another plan gap, found and fixed before implementing

`PLAN.md`'s `§16` (system/page/resize) never actually covered vertical
stacking of multiple staves/parts, and `§21`'s own known-limitations list
had flagged "only the first part renders" without ever specifying what
the *correct* behavior should be. Verified the real convention against
six independent sources with full agreement before writing anything: a
**brace** (curved) connects multiple staves of **one instrument** (the
canonical case: piano, one MusicXML `<part>` declaring `<staves>2</staves>`)
with a barline running continuously through the gap between them; a
**bracket** (straight) connects **different instruments/parts** grouped
for ensemble reading (MusicXML `<part-group>`), and one source
specifically documents that continuous barlines are *not* universal
across such groups (vocal scores often omit the connecting segment so it
doesn't cut through the lyric text). Checked `glyphnames.json` for the
real glyphs rather than assuming: `brace`, `bracket`/`bracketTop`/
`bracketBottom` all exist. Added `PLAN.md` `§9.18` with the full spec,
sources, and named test cases before touching any code.

## 1. What was written

**`src/geometry/system.ts`**:
- **`needsBrace(stavesInPart)`** — `true` for 2-or-more staves in one
  part, confirmed as needing no external grouping metadata (unlike a
  bracket, which would need `<part-group>` data this engine doesn't
  parse — see §3).
- **`needsContinuousBarline(stavesInGroup)`** — deliberately the *same*
  test as `needsBrace`, by design: both follow from "is this one
  instrument's own multiple staves?" This engine's stated, conservative
  default (§9.18) is to draw a continuous barline *only* within a brace
  group, never across different parts, since real convention there is
  documented as non-universal and this engine has no lyric-awareness to
  decide otherwise.
- **`computeBraceShape(topStaffY, bottomStaffY, x)`** — the brace's
  vertical extent.

**`src/layout/system.ts`** — **`computeSystemLayout(partStaffCounts,
staffGap?, partGap?)`**: the vertical stacking itself, giving every
part's own staff (or staves, for a braced multi-staff part) a distinct Y,
parts stacked top to bottom in score order. Explicitly the same
"deliberately naive, will be replaced" spirit as Phase 21's
`naiveMeasureLayout` — fixed gaps, not content-aware (§15's skyline,
itself still `[TODO]`, is what would make this respect actual content
extents).

**`src/render/system.ts`** — **`renderBrace`**: draws the real SMuFL
`brace` glyph, but *scaled* via an SVG transform to exactly the height
between the staves it connects — Bravura's own brace glyph has one
nominal height, so an unscaled draw would only be correct for one
specific staff separation; this computes the needed Y-scale from the
glyph's own bounding box height versus the target span.

## 2. How this was verified

Ran `npm run verify` clean, 267/267 (8 new tests, 1 real test bug fixed
along the way — see below). Every named case from `§9.18`: 1 staff needs
no brace, 2+ does; barline continuity confirmed identical to the brace
decision for every staff count tested, not just asserted by inspection;
brace shape endpoints pass through unchanged; a single 1-staff part, a
2-staff (piano) part, a 3-part score, and a mixed score (piano + 2 solo
parts) all confirmed to produce distinct, non-overlapping Y positions —
checked via `Set` size equal to the position count, not just eyeballed.

**A real test-authoring mistake was caught and fixed**, the same class of
issue Phase 8's original harness documentation already warned about:
`assert.deepEqual` compared a sandboxed engine array directly against a
freshly-sorted copy and failed with "same structure but not
reference-equal" — a VM-sandbox realm-boundary quirk, not a real bug.
Fixed by spreading the sandboxed array into the main realm
(`[...layout.positions]`) before deriving values from it, exactly the
precedent already recorded in `Doc/STATUS.md`'s testing-harness notes.

## 3. Known limitation: not wired into `renderFromMusicXml`

Two things would be needed together, and neither exists yet:
1. **Parsing `<staves>N</staves>`** from a part's `<attributes>` — not
   currently read anywhere in `src/parser/musicxml/attributes.ts`.
2. **Restructuring `renderFromMusicXml`'s render loop**, which currently
   assumes exactly one part, one clef, and one shared Y baseline for the
   whole score — becoming genuinely multi-part/multi-staff aware would
   mean every measure's rendering context carries its own part index and
   staff-specific Y offset (from `computeSystemLayout`) rather than the
   single fixed `STAFF_BOTTOM_Y` constant it uses today.

This is a larger, more structural change than Phase 26's tie wiring (which
fit inside the existing per-voice loop) or Phase 25's stem-direction
wiring (a parameter threaded through existing functions) — it touches the
render loop's fundamental shape. Rather than retrofit it under time
pressure, it's built and tested in isolation now, with the actual
integration left as clearly-scoped future work: parse `<staves>`, call
`computeSystemLayout` once per score, and thread each part's own Y offset
through the existing per-measure rendering.

Also not implemented, per `§9.18`'s own stated scope: `<part-group>`
bracket connections across different instruments (v2 parser territory,
`§10.4`).

## 4. How to modify it

- **Change the default staff/part gaps** — `DEFAULT_STAFF_GAP`/
  `DEFAULT_PART_GAP` in `layout/system.ts`.
- **Wire in the actual integration** — parse `<staves>` in
  `attributes.ts`, call `computeSystemLayout` once in
  `renderFromMusicXml` using each part's staff count, and offset every
  measure's rendering Y by the corresponding `PartStaffPosition.y`.

## 5. How to revert/remove it

Delete `src/geometry/system.ts`, `src/layout/system.ts`,
`src/render/system.ts`, and `test/unit/system.test.js`; remove their
`export * from` lines from the geometry/layout/render barrels. Nothing in
`render-from-musicxml.ts` references any of this, so no wiring needs to
be undone there.
