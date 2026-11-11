# Phase 46 — Page Layout (System + Page Breaking)

**Status:** the full `§16.2` algorithm is built and tested against
every requirement `§16.2` itself names. 537/537 tests pass. **Not
wired into rendering** -- `render-from-musicxml.ts` always uses Phase
45's scroll mode; page mode is a genuinely different output shape
(multiple systems, multiple pages) that would need its own SVG
structure, a larger integration than this phase attempts, matching the
established precedent from Phase 43/44.

Continues Stage 8 (Real layout), following Phase 45 (scroll layout).

## 0. Scope, per §16.2's own framing

`§16.2`'s definition: measures are packed into systems until the next
measure would exceed the usable width, then a system break occurs and
the completed system is justified (`§14.3`); systems are packed onto
pages until the next system would exceed usable height, then a page
break occurs. Respects explicit `<print new-system="yes">`/
`new-page="yes">`. Page geometry comes from `config.page`.

## 1. What was built

**`config/config.ts`** -- new `PageConfig` section (`pageWidth`,
`pageHeight`, and four margins). Defaults approximate an A4 page at a
common engraving scale (~7mm per staff space) -- a reasonable starting
point, not a claimed universal standard, fully overridable per `§16.2`'s
own requirement.

**`layout/page.ts`**:
- `groupIntoRawSystems` -- packs measures left to right, breaking before
  a measure that would overflow the usable width, or that carries
  `forceNewSystem`/`forceNewPage`. A single measure wider than the
  usable width is still placed alone rather than dropped or split,
  matching `§14`'s own "allow the overflow" policy for an oversized
  measure.
- `groupIntoRawPages` -- the same packing one level up: systems onto
  pages, using a single fixed `systemHeight` (a stated simplification --
  see §4) until the next would overflow the usable height, or that
  system's own first measure carries `forceNewPage`.
- `computePageLayout` -- the full algorithm: groups measures into raw
  systems and pages, then **justifies every system except the literal
  last system of the whole piece** (`§14.3`'s ragged-right policy,
  applied at the piece level -- a page break partway through is not the
  end of the piece, so every system before the true final one still
  gets justified, even the last system *on* an earlier page).

**A real gap in Phase 43's own `justifySystem` surfaced and worked
around**: `justifySystem` stretches the *gaps between* measures, so a
system containing exactly **one** measure has no internal gap to
stretch at all -- it returns that measure's position completely
unchanged, even when a real page would want that lone, sparse measure
to fill the whole system width. Confirmed directly: a test scenario
with one measure per system failed to reach the right margin under the
original code. **Fixed** with a dedicated single-measure case in
`computePageLayout` itself (not by changing `justifySystem`, whose own
multi-measure behavior is correct and already tested): a lone measure is
widened to the full usable width when it isn't the piece's final system
and doesn't already overflow on its own; an overflowing lone measure is
left alone, matching the same "allow the overflow" policy.

## 2. How this was verified

Ran `npm run verify` clean, **537/537** (12 new tests). Every piece of
`§16.2`'s own definition:
- **System breaking** -- measures pack into one system while they fit; a
  measure that would overflow starts a new system instead; a single
  measure wider than the usable width is still placed, never dropped.
- **Justification** -- a completed system's last measure checked to land
  *exactly* at the right margin (not merely "wider than before"); the
  literal last system of the whole piece confirmed to keep its own
  natural (unjustified) width; and specifically confirmed the
  ragged-right rule applies to the **piece's** last system, not merely
  the last system on a given **page** -- a scenario forcing content
  across 2 pages checked that page 1's own last system is still
  justified, since the piece continues.
- **Page breaking** -- systems packed onto one page while they fit;
  content forced across pages when a system would overflow the usable
  height (checked against the exact resulting page/system counts, not
  just "more than one page"); every measure confirmed present exactly
  once, in original order, across however many pages resulted.
- **Explicit breaks** -- `forceNewSystem` breaking before that measure
  even though it would otherwise fit; `forceNewPage` breaking both the
  system and the page; and a forced break on the very first measure
  confirmed to have no effect (there is nothing before it to break away
  from).

## 3. Known limitations (stated, not silently missing)

- **`<print new-system>`/`new-page>` aren't parsed yet.**
  `PageMeasureInput`'s `forceNewSystem`/`forceNewPage` fields exist and
  are fully honored by the algorithm, but nothing in `parser/musicxml/`
  currently extracts them from a real file's `<print>` elements --
  confirmed directly (no reference to either attribute anywhere in the
  parser). A real file's explicit breaks are silently ignored until that
  parsing is added.
- **`systemHeight` is a single fixed value for the whole layout.** A
  real score with a grand staff on some systems and a single staff on
  others would need a genuinely per-system height (depending on which
  measures/staves happen to land in that system), which this doesn't
  compute.
- **Not wired into rendering at all.** `render-from-musicxml.ts` still
  always produces scroll-mode output; there is no way yet to actually
  request a paginated render of a real score.

## 4. How to modify it

- **Parse `<print>`** -- read `new-system`/`new-page` attributes in
  `parser/musicxml/parse.ts`'s existing `<print>` handling (currently
  folded into the generic unknown-element path) and thread them onto
  each measure's own `PageMeasureInput`.
- **Per-system height** -- would need `worstCaseStaffExtent`-style
  content awareness (Integration F's own technique) computed per
  candidate system during packing, not supplied as one constant.
- **Wire in page mode** -- the natural next step once there's a reason
  to: a genuinely different SVG output (one `<svg>` per page, or a tall
  single document with page-break markers) selected via
  `RenderFromMusicXmlOptions`, alongside scroll mode rather than
  replacing it.

## 5. How to revert

Delete `src/layout/page.ts`, remove its `export * from` line from
`src/layout/index.ts`, revert `config.ts`'s `PageConfig`/`EngineConfig`/
`DEFAULT_CONFIG`/`resolveConfig` additions, and delete
`test/unit/page-layout.test.js`.
